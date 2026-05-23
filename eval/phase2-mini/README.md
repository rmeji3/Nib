# Phase 3 mini eval set

A 5-PDF / 15-question regression harness used to **certify Phase 3 done** and
to gate every future change against a hallucination/grounding regression.

## Layout

```
eval/
  run-eval.mjs              automated runner — `npm run eval`
  .env.eval                 your credentials (gitignored)
  .env.eval.example         template for the above
  phase2-mini/
    pdfs/                   drop your 5 PDFs here
    questions.yaml          15 questions (3 per PDF), one block per PDF
    results-YYYY-MM-DD-HHMM.md     one file per eval run, auto-generated
```

## How to run

1. **Populate the PDFs.** Drop five PDFs into `eval/phase2-mini/pdfs/` with the
   filenames referenced in `questions.yaml` (e.g. `04-menu-character-spaced.pdf`).
   Use a mix that exercises the pipeline:
   1. **Clean text-heavy** — research paper / engineering report. Tests basic RAG.
   2. **Chart / figure-heavy** — slide deck with graphs. Tests Vision pipeline.
   3. **Table-heavy** — financial report or data table. Tests aggregation reasoning.
   4. **Character-spaced** — the Subah menu. Tests vision-only fallback.
   5. **Mixed** — a doc with prose, figures, and tables.
2. **Fill in `questions.yaml`.** Replace every `TODO` placeholder. Any
   question whose `expected_includes` still contains `"TODO"` is automatically
   skipped by the runner.
3. **Create credentials.** `cp eval/.env.eval.example eval/.env.eval` and fill
   in a **test** account on your local backend. (The runner deletes the
   documents it uploads after each run.)
4. **Start the backend** (`cd backend && ./mvnw spring-boot:run`).
5. **Run the eval:** `npm run eval` from the repo root.

The runner uploads each PDF, polls until ingestion completes, runs every
question through `POST /api/v1/chat/{sessionId}/query`, scores each answer
against the expected substrings + cited pages, and writes a dated report to
`eval/phase2-mini/results-YYYY-MM-DD-HHMM.md`.

## Scoring

For each question the runner computes:

- **Content score** = `len(includes_found) / len(expected_includes)`
- **Citation score** = `len(pages_cited ∩ expected_pages) / len(expected_pages)`
- **Verdict** = `pass` if both scores are 1.0, `fail` if both are 0, `partial` otherwise.

Aggregate **weighted pass rate** = `(pass + 0.5 * partial) / total`.

## Phase 3 sign-off targets

| Metric | Target | Source |
|---|---|---|
| Weighted pass rate | ≥ 80% | summary table in `results-*.md` |
| Mean groundedness | ≥ 85% | summary table |
| P95 latency | ≤ 4000 ms | summary table |
| Refusal on off-topic query | model says "I cannot find this information…" | manual: ask an unrelated question |

Once those four rows are green, tag the commit `phase-3-complete` and commit
the chosen `results-*.md` to the repo with message
`docs(eval): phase 3 baseline — N% pass`.

## Question format

```yaml
- pdf: 04-menu-character-spaced.pdf
  description: "Subah cafe menu"
  questions:
    - q: "What is this PDF about?"
      expected_includes: ["Subah", "menu", "breakfast"]
      expected_pages: [1]
      category: factual
    - q: "List the breakfast omelets and their prices"
      expected_includes: ["Omelet"]
      expected_pages: [1]
      category: visual
    - q: "What is the most expensive item on the menu?"
      expected_includes: ["29"]
      expected_pages: [2]
      category: aggregation
```

- **expected_includes** — substrings (case-insensitive) the answer must contain.
  Use facts that can only be right by reading the document — don't include
  generic words.
- **expected_pages** — page numbers the assistant must cite. A subset is OK
  (it's fine if it cites more pages, as long as it includes these).
- **category** — `factual` / `visual` / `aggregation`. Categories trigger
  different code paths (aggregation queries pull all visual blocks).
- Any question whose `expected_includes` contains `"TODO"` is skipped by the
  runner — you can land partial coverage and grow it over time.
