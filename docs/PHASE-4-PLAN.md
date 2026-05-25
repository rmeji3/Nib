# Phase 4 — Prompt Engineering & Indexing Tuning

## Goal

Maximize answer quality across diverse document types by iterating on
retrieval, prompting, and embedding strategies. Every change is measured
against the mini eval set baseline (≥80% from Phase 3) and must push the
pass rate to ≥90%. P95 chat latency must stay ≤4s.

---

## Tier 1 — Highest Impact, Lowest Complexity (Week 1–2)

### 1A. Hybrid Search (BM25 + pgvector + Reciprocal Rank Fusion)

**Why:** Dense vector search misses exact keyword matches (product names,
codes, identifiers, acronyms). BM25 excels at lexical precision. Combining
them with RRF yields +15–30% recall in RAG benchmarks with zero new
infrastructure — PostgreSQL's built-in `tsvector`/`tsquery` handles BM25.

**Implementation:**

1. **Migration:** Add a `search_tsvector tsvector` column to
   `content_blocks`. Populate it via a `GENERATED ALWAYS AS` column or
   trigger. Add a GIN index on it.

2. **VectorSearchService:** New `hybridSearch()` method that:
   - Runs the existing dense vector query (top 2×K candidates)
   - Runs a parallel `ts_rank_cd` full-text query (top 2×K candidates)
   - Merges results using RRF: `score = Σ 1/(k + rank_i)` where k=60
   - Returns the top-K merged results

3. **ChatService:** Replace `vectorSearchService.search()` call with
   `vectorSearchService.hybridSearch()`.

4. **IngestionRunner:** Populate `search_tsvector` when saving blocks.
   For visual_summary blocks, index the vision text too.

**Files:**
- `supabase/migrations/20260523_hybrid_search_tsvector.sql` — NEW
- `backend/.../service/VectorSearchService.java` — add `hybridSearch()`
- `backend/.../service/ChatService.java` — call hybridSearch
- `backend/.../service/IngestionRunner.java` — populate tsvector at save
- `backend/.../model/ContentBlock.java` — add searchTsvector field

**Risk:** Low. tsvector is built into Postgres. RRF is a simple rank merge.

---

### 1B. Cross-Encoder Reranking

**Why:** Bi-encoder similarity (embed query + embed chunk, compute cosine)
is fast but coarse. A cross-encoder takes (query, chunk) as a pair and
produces a much more precise relevance score. Research shows +33–40%
accuracy improvement on reranking tasks. Our current reranker is a simple
heuristic (visual boost + diversity penalty) — a model-based reranker will
be far more accurate.

**Implementation:**

Defer to Tier 2 — requires adding a new API dependency (Cohere Rerank or
a Hugging Face model). The heuristic reranker works well enough for now
and the hybrid search improvement will be larger.

**Status:** DEFERRED to Tier 2.

---

### 1C. Chunk Overlap Tuning

**Why:** NVIDIA research shows 15% overlap is optimal for reducing
boundary-split information loss. We currently use 200 chars overlap on
2000 char chunks = 10%. Bumping to 15% (300 chars) is a config change.

**Implementation:** Change `ingestion.chunk.overlap-chars` from 200 to 300
in `application.properties`. Re-ingest eval PDFs and measure.

**Files:**
- `backend/src/main/resources/application.properties`

**Risk:** Negligible. Slightly more chunks per document (~5% increase).

---

### 1D. Dynamic TopK Scaling

**Why:** A 3-page menu needs topK=5. A 50-page research paper needs
topK=15+. Static topK=8 is a compromise that's too high for small docs
(noise) and too low for large ones (missing pages).

**Implementation:**

1. Look up total page count for the document.
2. Scale topK: `min(20, max(5, pageCount * 1.5))` — heuristic that gives
   5 for tiny docs, ~8 for 5-page docs, ~15 for 10-page docs, capped at 20.
3. Pass the dynamic topK to `vectorSearchService.search()`.

**Files:**
- `backend/.../service/ChatService.java` — compute dynamic topK
- `backend/.../repository/ContentBlockRepository.java` — add page count query

**Risk:** Low. Simple arithmetic.

---

## Tier 2 — High Impact, Moderate Complexity (Week 2–3)

### 2A. Embedding Model Comparison

**Why:** Mistral-embed is mid-tier ($0.10/MTok, 1024 dims). Google's
`text-embedding-004` is 16× cheaper at comparable quality. Voyage-3-large
tops MTEB benchmarks. BGE-M3 is the best open-source option.

**Implementation:**

1. Abstract `EmbeddingService` behind an interface with configurable
   provider (Mistral / Google / Voyage).
2. Add Google text-embedding-004 as an alternative provider.
3. Re-ingest eval PDFs with each model, compare retrieval precision.
4. Pick the winner based on quality × cost.

**Files:**
- `backend/.../service/EmbeddingService.java` — extract interface
- `backend/.../service/MistralEmbeddingService.java` — current impl
- `backend/.../service/GoogleEmbeddingService.java` — NEW
- `backend/src/main/resources/application.properties` — provider config

**Risk:** Medium. Dimension change (1024 → 768) requires re-indexing. But
we already cascade-delete embeddings on re-ingestion, so this is handled.

---

### 2B. Cross-Encoder Reranking (moved from 1B)

**Why:** As described in 1B. Now that hybrid search is live, the reranker
operates on a richer candidate set.

**Implementation:**

1. Add Cohere Rerank API integration (or Jina Reranker v2).
2. After hybrid search returns top-2K candidates, send (query, chunk) pairs
   to the reranker API.
3. Sort by reranker score, take top-K.
4. Replace the heuristic reranker in ChatService.

**Files:**
- `backend/.../service/RerankService.java` — NEW
- `backend/.../service/ChatService.java` — use RerankService

**Risk:** Medium. Adds ~100–200ms latency per query. Must stay within P95 ≤4s.

---

### 2C. Multi-Turn Query Rewriting

**Why:** Follow-up questions like "what about page 3?" or "compare that
with the next section" lack context. The embedding of "what about page 3?"
matches nothing useful. Rewriting the query using conversation history
fixes this.

**Implementation:**

1. In `ChatService.query()`, if there are ≥1 prior turns in the session,
   call Gemini with a short prompt: "Given this conversation history,
   rewrite the latest question as a standalone query."
2. Embed the rewritten query instead of the raw question.
3. Use the raw question in the final prompt to Gemini (user sees their
   original words in the answer).

**Files:**
- `backend/.../service/ChatService.java` — add `rewriteQuery()` method

**Risk:** Low–Medium. One extra Gemini call (~200ms). Cache the rewrite.

---

## Tier 3 — Medium Impact, Higher Complexity (Week 3–4)

### 3A. Document-Type Classification at Ingestion

**Why:** A research paper needs different prompting than a restaurant menu.
Classifying the document type at ingestion time lets us tailor the system
prompt, vision prompt, and retrieval strategy.

**Implementation:**

1. During the document summary step in IngestionRunner, ask Gemini to
   also classify the document: `academic | financial | menu | technical |
   legal | mixed`.
2. Store the classification on the `documents` table.
3. Use it in `ChatService.buildPrompt()` to select a type-specific prompt
   template.

**Files:**
- `supabase/migrations/...` — add `doc_type text` to documents
- `backend/.../model/Document.java` — add docType field
- `backend/.../service/VisionService.java` — return classification
- `backend/.../service/IngestionRunner.java` — persist classification
- `backend/.../service/ChatService.java` — type-aware prompts

---

### 3B. Few-Shot Examples Per Document Type

**Why:** 1–2 worked examples in the prompt showing the expected citation
style and answer format for each document type produce measurably better
answers. Research shows few-shot outperforms zero-shot by 10–25% on
structured extraction tasks.

**Implementation:**

1. Create a `prompts/` resource directory with per-type example files.
2. In `buildPrompt()`, insert the relevant few-shot examples between the
   citation rules and the context section.

**Files:**
- `backend/src/main/resources/prompts/` — NEW directory with template files
- `backend/.../service/ChatService.java` — load and inject examples

---

### 3C. Hierarchical Parent-Child Chunking

**Why:** Embed small chunks (256 tokens) for precision retrieval but
retrieve the parent chunk (1024 tokens) for context. This gives the best
of both worlds: precise matching + sufficient context for generation.
Research shows 87% vs 13% accuracy improvement over fixed-size chunking.

**Implementation:**

1. At ingestion, produce two levels of chunks: parents (1024 tokens) and
   children (256 tokens) with a `parent_block_id` foreign key.
2. Embed only the children.
3. At retrieval, when a child matches, pull its parent's text for the
   prompt context.

**Complexity:** HIGH. Requires schema changes, ingestion pipeline changes,
and retrieval pipeline changes. Defer until Tiers 1–2 are validated.

---

## Tier 4 — Eval Infrastructure (Ongoing)

### 4A. RAGAS Metrics

Integrate RAGAS (Retrieval Augmented Generation Assessment) for automated
scoring: faithfulness, answer relevancy, context precision, context recall.
Run after every retrieval/prompt change.

### 4B. DeepEval CI Integration

Add DeepEval to the CI pipeline so every PR gets an automated eval score.
Block merges that regress below the baseline.

### 4C. promptfoo A/B Testing

Use promptfoo for comparing prompt variants side-by-side on the eval set.
Output a comparison matrix showing which prompt wins on which question
categories.

### 4D. Expand Eval Set to 50–100 PDFs

Grow from 5 PDFs / 15 questions to 50+ PDFs / 200+ questions across all
document categories.

---

## What to Skip (Research Says Low ROI)

| Technique | Why Skip |
|---|---|
| **HyDE** (Hypothetical Document Embeddings) | Adds a full LLM call per query for marginal recall gain. Hybrid search + reranking achieves the same effect cheaper. |
| **Late Chunking** | Only works with specific embedding architectures (jina-embeddings-v3). Not compatible with Mistral/Google models. |
| **Semantic Chunking** | Inconsistent improvements in benchmarks. Boundary detection is unreliable. Fixed-size + overlap is more predictable. |
| **Multi-Query Retrieval** | Generates 3–5 query variants → 3–5× embedding cost. Query rewriting (Tier 2C) achieves the same intent disambiguation with 1 rewrite. |
| **Contextual Retrieval** (Anthropic) | Prepend document context to every chunk before embedding. Massively increases embedding cost (every chunk gets a full-doc summary). Better to invest in hybrid search which solves the same recall gap. |

---

## Execution Checklist

- [x] **1A** Hybrid search (tsvector + RRF) — implemented 2026-05-24
- [x] **1C** Chunk overlap → 15% — implemented 2026-05-24
- [x] **1D** Dynamic topK scaling — implemented 2026-05-24
- [ ] Eval run after Tier 1 — record pass rate
- [ ] **2A** Embedding model comparison
- [ ] **2B** Cross-encoder reranking
- [x] **2C** Multi-turn query rewriting — implemented 2026-05-24
- [ ] Eval run after Tier 2 — record pass rate
- [x] **3A** Document-type classification — implemented 2026-05-24
- [x] **3A+** Type-aware prompting — implemented 2026-05-24
- [ ] **3B** Few-shot examples
- [ ] Eval run after Tier 3 — record pass rate
- [ ] **4A–D** Eval infrastructure buildout

---

## Success Criteria

| Metric | Phase 3 Baseline | Phase 4 Target |
|---|---|---|
| Eval pass rate | ≥80% | ≥90% |
| P95 chat latency | ≤4s | ≤4s |
| Retrieval precision (top-5) | ~60% | ≥80% |
| Hallucination rate (visual) | ≤10% | ≤5% |
