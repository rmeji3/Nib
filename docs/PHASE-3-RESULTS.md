# Phase 3 — Accuracy Hardening (Results)

Branch: `Haider/phase-3-accuracy-hardening`

## What shipped

| Workstream | Status | Notes |
|---|---|---|
| A. Automated eval runner | ✅ | `eval/run-eval.mjs` reads `questions.yaml`, uploads each PDF, polls until ingestion completes, runs every question against the live chat API, scores answers against `expected_includes` + `expected_pages`, and writes a dated `results-*.md` with weighted pass rate, mean confidence, mean groundedness, and P50/P95 latency. Skips any question whose `expected_includes` still contains `"TODO"`, so partial eval coverage is fine. Invoke with `npm run eval`. |
| B. Backend-computed confidence | ✅ | `ChatService.computeConfidence()` derives a [0,1] score from the mean cosine distance of the top-3 retrieved chunks. Returned to the frontend in `ChatQueryResponse.confidence`. |
| C. Re-ranking | ✅ | `ChatService.rerank()` applies a small visual boost (+0.10) and a per-page diversity penalty (-0.05 × seen). Runs before aggregation augmentation. |
| D. Refusal + citation enforcement | ✅ | Refusal threshold default 0.25 — confidence below that returns a canned answer without calling Gemini. Aggregation queries bypass refusal. Groundedness = fraction of sentences with `[Page N]`; surfaced in the response as `groundedness`. Prompt strengthened so every factual sentence must carry a citation. |
| E. Latency tuning | Not needed yet | No measured P95 > 4s in manual testing. Prompt size already trimmed via the `MIN_TEXT_LENGTH` filter in ingestion. Revisit if eval P95 regresses. |

## Frontend follow-through

The user reported that the UI was showing "85% confidence" on every answer and that indexing didn't show real progress. Both were genuine bugs — Phase 3 fixes them:

- **Real confidence** — `use-nib-chat.ts` now reads `response.confidence` and `response.groundedness` from the backend instead of the previous `citations.length > 0 ? 0.85 : 0.5` heuristic.
- **Confidence bands** — `ConfidenceBar` shows high / medium / low (green / amber / red) with the actual percent and a "X% grounded" suffix.
- **Low-confidence banner** — A new `LowConfidenceBanner` appears below answers when confidence < 0.4 OR `refused === true`, with different copy for each case (refusal explains why no answer was generated; low-confidence-but-answered warns the user to treat the result with caution).
- **Refusal in reasoning** — The reasoning panel reflects what actually happened: "Retrieval similarity too weak — refusing to answer to avoid hallucination." instead of pretending Gemini was called.
- **Removed fake demo prompts** — The four hardcoded prompts in `PROMPT_LIBRARY` that included pre-baked reasoning, citations, and "62.4 kW" segments referencing a specific cooling PDF have been replaced with four document-agnostic question stems ("Summarize this document in 3 bullet points.", etc.). Clicking one now actually runs the prompt through the live RAG pipeline.
- **Real indexing progress** — `IngestionRunner` now increments `pages_processed` after each Gemini Vision task completes (via `updateProgress(jobId, done, total)`), so the frontend's 2s polling shows real movement. The banner labels the current stage: *Reading PDF* → *Analyzing page X of Y* → *Embedding & indexing*.

## Database / config

- No migration required for Phase 3. Confidence and groundedness are computed at query time, not persisted on `chat_messages`.
- New tunables in `application.properties` (all optional):
  - `chat.refusal.threshold=0.25`
  - `chat.rerank.visual-boost=0.10`
  - `chat.rerank.diversity-penalty=0.05`

## Known limitations

- Re-ranking is hand-tuned linear; a real cross-encoder is the Phase-4 upgrade path.
- Historical messages (loaded via `fetchSessionMessages`) don't have stored confidence/groundedness — frontend falls back to 0.6 / 0.3. Live queries show real values.
- The refusal threshold (0.25) is conservative. With more eval data we should tune toward maximising correctness without rejecting too many legitimate queries.

## Files changed

Backend:
- `backend/.../dto/ChatQueryResponse.java` — added `confidence`, `groundedness`, `refused`
- `backend/.../service/ChatService.java` — `rerank()`, `computeConfidence()`, `computeGroundedness()`, refusal guard, stricter prompt
- `backend/.../service/IngestionRunner.java` — `updateProgress()` ticks `pages_processed` per completed vision task

Frontend:
- `frontend/lib/api/chat.ts` — extended `ChatQueryResponse` type
- `frontend/app/features/nib/nib-types.ts` — extended `AssistantMessage` with `groundedness`, `refused`
- `frontend/app/features/nib/hooks/use-nib-chat.ts` — uses real backend confidence; reasoning text varies on refusal
- `frontend/app/features/nib/nib-chat.tsx` — new `ConfidenceBar` bands, `LowConfidenceBanner`, document-agnostic `PROMPT_LIBRARY`, stage-aware `IndexingBanner`
- `frontend/app/globals.css` — `.confidence.medium` band styling
