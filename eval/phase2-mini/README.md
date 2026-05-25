# Phase 2 mini eval set

A tiny regression harness used to certify Phase 2 done and seed the Phase 3
baseline. README §13 calls for 50–100 PDFs eventually; we start with 5.

## Layout

```
eval/phase2-mini/
  pdfs/                  drop your 5 PDFs here
  questions.yaml         15 questions (3 per PDF), one block per PDF
  results-YYYY-MM-DD.md  one file per eval run, date-stamped
```

## PDF mix (recommended)

Pick PDFs that exercise different parts of the pipeline:

1. **Clean text-heavy** — research paper / engineering report. Tests basic RAG.
2. **Chart / figure-heavy** — slide deck with graphs. Tests Vision pipeline.
3. **Table-heavy** — financial report or data table. Tests aggregation reasoning.
4. **Character-spaced** — the Subah menu (PDF with broken font encoding).
   Tests the "vision-only fallback" pathway and aggregation routing.
5. **Mixed** — a doc with prose, figures, and tables.

## Question format

Each PDF gets 3 questions, one per category:

- **factual** — answer should be a specific fact citing a single page
- **visual** — answer requires reading a chart, figure, or table
- **aggregation** — answer requires comparing across pages (triggers
  aggregation-aware retrieval; tests the keyword detector)

See `questions.yaml` for the schema.

## Scoring

For each question, mark `pass` / `partial` / `fail` against:

- **content**: does the answer contain every string in `expected_includes`?
  All present → pass. Some present → partial. None → fail.
- **citation**: does the answer cite every page in `expected_pages`?
  All cited → pass. Some cited → partial. None → fail.

Question score: `min(content, citation)` — both must work to fully pass.

Run score: `(pass * 1.0 + partial * 0.5) / total_questions`

Phase 2 sign-off requires ≥80%.

## How to run

1. Start the backend (`cd backend && ./mvnw spring-boot:run`) and frontend
   (`npm run dev` from the repo root).
2. Sign in. Delete any existing documents to avoid noise.
3. For each PDF in `pdfs/`:
   - Upload, wait for ingestion to finish
   - Run each question from `questions.yaml`
   - Record the assistant's reply + cited pages + wall-clock latency
4. Create `results-YYYY-MM-DD.md` from the template at the bottom of this file,
   fill in actuals, and compute the score.
5. Commit with message: `docs(eval): phase 2 mini eval — N% pass`.

## Latency baseline (Phase 3 entry criterion)

Record the P50 and P95 of the 15 query latencies in your results file. Phase 3
work then has a number to beat.

---

## Results file template

Copy/paste this into `results-YYYY-MM-DD.md` and fill in actuals.

```md
# Phase 2 mini eval — YYYY-MM-DD

Backend commit: `<sha>`
Frontend commit: `<sha>`
Ingestion config: vision concurrency 8, topK 8

## Per-PDF results

### 01-research-paper.pdf

| Q | Question | Expected pages | Actual pages | Content | Citation | Score | Latency (ms) |
|---|---|---|---|---|---|---|---|
| 1 | ... | [1] | [1] | ✅ | ✅ | pass | 3200 |
| 2 | ... | [5] | [5] | ⚠️ | ✅ | partial | 4100 |
| 3 | ... | [4] | [4, 5] | ✅ | ✅ | pass | 5500 |

...repeat for each PDF...

## Summary

| Metric | Value |
|---|---|
| Total questions | 15 |
| Pass | X |
| Partial | Y |
| Fail | Z |
| Score | NN% |
| P50 latency | XXXX ms |
| P95 latency | XXXX ms |

## Notes

Anything surprising — hallucinations, wrong pages, slow queries, etc. — goes here
for Phase 3 to address.
```
