# Phase 3 — Accuracy Hardening

Branch: `Haider/phase-3-accuracy-hardening`
Starting point: `6a73167` (Phase 2 closure: bbox + drawer + bbox highlight + mini eval scaffold)

---

## Context

Phase 2 delivered multimodal ingestion, multimodal retrieval, evidence drawer,
and block-level bbox provenance. Answers are mostly correct on the test PDFs
but quality is uneven — Gemini sometimes invents prices, sometimes cites the
wrong page, sometimes drops citations entirely. We also have no automated way
to detect regressions.

Phase 3 closes this with measurement first, then targeted accuracy fixes.

Success metrics (from README §12):
- Answer groundedness rate ≥ 95% (every factual claim cited)
- Hallucination rate ≤ 5% on visual/chart questions
- P95 chat response latency ≤ 4s

---

## Execution order (5 workstreams)

Measurement comes first — every later change should produce a delta in the
eval score that you can point at.

### Workstream A — Automated eval runner (FIRST)

Today `eval/phase2-mini/` is a scaffold and a YAML schema; runs are manual.
Build a small Node or Python script that:

1. Reads `questions.yaml`
2. For each question: hits `POST /api/v1/chat/{sessionId}/query` and captures
   `{ answer, citations, latency_ms }`
3. Scores each answer:
   - `expected_includes` → substring match (case-insensitive)
   - `expected_pages` → set intersection with citation page numbers
   - Combined: `pass` if both match, `partial` if one, `fail` if neither
4. Writes `eval/phase2-mini/results-YYYY-MM-DD-HH-MM.md` with pass/partial/fail
   per question, aggregate score, and P95 latency

**Files:**
- `eval/run-eval.mjs` (or `.py`) — new
- Requires test user credentials in `.env.eval` (gitignored)

Run once now to establish baseline before any accuracy work.

---

### Workstream B — Backend-computed confidence

The frontend currently hardcodes `confidence: 0.85 if citations else 0.5`.
Replace with a real signal derived from retrieval quality.

Approach: in `ChatService.query()`, after `vectorSearchService.search()`,
compute a confidence score from the top-k similarity scores:

```java
double meanTopK = chunks.stream().mapToDouble(ChunkMatch::similarity).average().orElse(1.0);
// pgvector cosine distance: 0 = identical, 2 = opposite. Lower is better.
// Map [0, 1] cosine distance → [1.0, 0.0] confidence with a sigmoid-ish curve.
double confidence = Math.max(0.0, Math.min(1.0, 1.0 - meanTopK));
```

Tune the mapping against the eval set — pick the threshold where confidence
≥ X correlates with eval pass rate ≥ 80%.

Return `confidence` in `ChatQueryResponse`. Frontend uses it directly instead
of the heuristic.

**Files:**
- `backend/.../service/ChatService.java`
- `backend/.../dto/ChatQueryResponse.java`
- `frontend/lib/api/chat.ts`
- `frontend/app/features/nib/hooks/use-nib-chat.ts`

---

### Workstream C — Re-ranking

Vanilla top-k by cosine distance over-favors text similarity. Add a re-ranker
that boosts diverse coverage and visual blocks.

Simple scoring per chunk after retrieval:

```
score = (1 - cosine_distance)                    // base similarity, [0,1]
      + 0.10 if block_type == 'visual_summary'   // small visual boost
      - 0.05 * pages_already_seen_count          // diversity penalty
```

Re-sort and trim to topK. Keep the existing aggregation augmentation for
"most expensive / list all" — re-ranking runs *before* aggregation merge.

**Files:**
- `backend/.../service/ChatService.java` (new `rerank()` helper)

Benchmark: run eval set before/after, check delta.

---

### Workstream D — Refusal policy + citation enforcement

Two safety nets:

**D1. Refuse when retrieval is weak.** If `confidence < REFUSAL_THRESHOLD`
(start at 0.35, tune), skip the Gemini call entirely and return:
`"I don't have enough information in the indexed pages to answer this confidently."`
Saves API spend AND prevents hallucination.

**D2. Enforce citations on the way out.** Post-process the Gemini answer:

- Split into sentences
- Count sentences that contain `[Page N]`
- If `cited / total < 0.5` → tag answer as low-grounded, downgrade confidence,
  show a yellow warning banner in the UI

Don't reject — Gemini-omitted citations are common and re-prompting is
expensive. Just degrade gracefully.

**Files:**
- `backend/.../service/ChatService.java` — refusal guard + citation count
- `backend/.../dto/ChatQueryResponse.java` — add `groundedness: double`
- `frontend/.../nib-chat.tsx` — warning banner when confidence < 0.5

---

### Workstream E — Latency check + tuning

Use the eval runner's P95 latency output as the source of truth. If P95 > 4s:

- Trim prompt size: skip text blocks shorter than 100 chars in context
- Reduce `topK` from 8 → 6 (current 8 was set for redundancy; re-ranker should
  let us run leaner)
- Profile Gemini call: log time-to-first-byte vs total

If P95 already < 4s, no work needed — just document the baseline.

**Files:** mostly observational; minor tweaks in `ChatService` if needed.

---

## Verification — proving Phase 3 closed

Phase 3 is signed off when the eval runner reports:

| Metric | Target | Source |
|---|---|---|
| Pass rate (15 questions) | ≥ 80% | `results-*.md` aggregate |
| Groundedness (cited sentences / total) | ≥ 85% | new field in `results-*.md` |
| P95 latency | ≤ 4s | new field in `results-*.md` |
| Refusal on garbage query | model says "not enough info" | manual: ask an off-topic question |

Tag the commit `phase-3-complete` and write a one-paragraph summary into
`docs/PHASE-3-RESULTS.md` (before/after pass rate, confidence threshold chosen,
known limitations).

---

## What's deferred to Phase 4

- Re-ranking with a real cross-encoder model (current Phase 3 uses a hand-tuned
  linear score — fine for now)
- LLM-as-judge scoring in the eval runner (substring matching is good enough
  for baseline; LLM judge is a Phase 4 polish)
- Per-user rate limiting on the chat API
- Cost tracking dashboard
- Multi-document chat (current chat is scoped to one document)

---

## Files to touch (estimated)

Backend:
- `service/ChatService.java` (largest — re-ranker, confidence, refusal, citation count)
- `dto/ChatQueryResponse.java` (add confidence + groundedness)
- maybe `service/VectorSearchService.java` (if we expose raw similarity in ChunkMatch — already there)

Frontend:
- `lib/api/chat.ts` (extend response shape)
- `hooks/use-nib-chat.ts` (use backend confidence)
- `nib-chat.tsx` (low-confidence banner)

Eval:
- `eval/run-eval.mjs` — new automated runner
- `eval/phase2-mini/results-*.md` — generated per run
- `eval/.env.eval.example` — credential template
- `.gitignore` — add `.env.eval`

Docs:
- `docs/PHASE-3-RESULTS.md` — created at end with the verified numbers
