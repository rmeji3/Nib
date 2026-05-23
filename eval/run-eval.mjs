#!/usr/bin/env node
/**
 * Phase 3 — Automated eval runner (Workstream A).
 *
 * Reads eval/phase2-mini/questions.yaml, uploads each PDF (skipping any
 * questions that are still TODO placeholders or whose PDF is missing), waits
 * for ingestion to complete, then asks each question against the live chat
 * API. Scores answers against expected substrings and expected citation pages,
 * computes aggregate pass rate, mean confidence/groundedness, and P50/P95
 * latency, and writes a dated results-YYYY-MM-DD-HHMM.md report.
 *
 * Usage:
 *   1. Copy eval/.env.eval.example to eval/.env.eval and fill in EMAIL/PASSWORD.
 *   2. Make sure the backend (port 8080) is running.
 *   3. Drop your PDFs into eval/phase2-mini/pdfs/ matching the filenames in
 *      questions.yaml. Any missing PDFs are skipped with a warning.
 *   4. `npm run eval`
 *
 * Exit codes:
 *   0 on successful run (regardless of pass rate)
 *   1 if no questions could be evaluated (no PDFs, no credentials, etc.)
 *   2 on a hard error talking to the backend
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const EVAL_DIR = path.join(REPO_ROOT, 'eval', 'phase2-mini');
const PDF_DIR = path.join(EVAL_DIR, 'pdfs');
const QUESTIONS_PATH = path.join(EVAL_DIR, 'questions.yaml');
const ENV_PATH = path.join(REPO_ROOT, 'eval', '.env.eval');

// ─────────────────────────────────────────────────────────────────────────────
// Environment loading — `.env.eval` is a simple KEY=VALUE file kept out of git.
// We avoid pulling in dotenv to keep dependencies minimal.
async function loadEnv() {
  try {
    const raw = await fs.readFile(ENV_PATH, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    console.warn(`(no ${ENV_PATH} found — using environment variables only)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API client
class NibApi {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  headers(extra = {}) {
    const h = { Accept: 'application/json', ...extra };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async login(email, password) {
    // Backend exposes /api/v1/auth/authenticate (not /login).
    const res = await fetch(`${this.baseUrl}/api/v1/auth/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Login failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    this.token = data.token;
    return data;
  }

  async uploadPdf(filePath, displayName) {
    const buf = await fs.readFile(filePath);
    const form = new FormData();
    const blob = new Blob([buf], { type: 'application/pdf' });
    form.append('files', blob, path.basename(filePath));
    if (displayName) form.append('name', displayName);
    const res = await fetch(`${this.baseUrl}/api/v1/documents/upload`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upload failed for ${filePath} (${res.status}): ${body}`);
    }
    return res.json();
  }

  async getIngestionStatus(documentId) {
    const res = await fetch(`${this.baseUrl}/api/v1/documents/${documentId}/status`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`status fetch failed: ${res.status}`);
    return res.json();
  }

  async getOrCreateSession(documentId) {
    const res = await fetch(`${this.baseUrl}/api/v1/chat/sessions/document/${documentId}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Session fetch failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  async query(sessionId, question) {
    const t0 = Date.now();
    const res = await fetch(`${this.baseUrl}/api/v1/chat/sessions/${sessionId}/query`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question }),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Query failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    return { ...data, latency_ms };
  }

  async deleteDocument(documentId) {
    await fetch(`${this.baseUrl}/api/v1/documents/${documentId}/permanent`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling helper — waits for ingestion to reach COMPLETE / FAILED
async function waitForIngestion(api, documentId, { timeoutMs = 600_000, intervalMs = 2000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await api.getIngestionStatus(documentId);
    if (status.status === 'COMPLETE') return status;
    if (status.status === 'FAILED') {
      throw new Error(`Ingestion FAILED: ${status.errorMessage || '(no message)'}`);
    }
    process.stdout.write(
      `    indexing ${status.pagesProcessed}/${status.pagesTotal ?? '?'}…\r`
    );
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Ingestion timed out after ${timeoutMs / 1000}s`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring — both substring inclusion AND citation page intersection must score
// well for an answer to fully pass. Each is a fraction in [0,1].
function scoreAnswer(question, response) {
  const answer = (response.answer || '').toLowerCase();
  const expectedIncludes = question.expected_includes || [];
  const expectedPages = question.expected_pages || [];

  const includesMatched = expectedIncludes.filter((s) =>
    answer.includes(String(s).toLowerCase())
  );
  const contentScore = expectedIncludes.length === 0
    ? 1.0
    : includesMatched.length / expectedIncludes.length;

  const citedPages = new Set((response.citations || []).map((c) => c.pageNumber));
  const pagesMatched = expectedPages.filter((p) => citedPages.has(p));
  const citationScore = expectedPages.length === 0
    ? 1.0
    : pagesMatched.length / expectedPages.length;

  // Verdict: both fully matched → pass; both completely missed → fail; else partial.
  let verdict;
  if (contentScore === 1.0 && citationScore === 1.0) verdict = 'pass';
  else if (contentScore === 0 && citationScore === 0) verdict = 'fail';
  else verdict = 'partial';

  return {
    contentScore, citationScore,
    includesMatched, expectedIncludes,
    pagesMatched, expectedPages,
    citedPages: [...citedPages].sort((a, b) => a - b),
    verdict,
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function pct(n) { return `${(n * 100).toFixed(1)}%`; }

function isTodoQuestion(q) {
  if (!q.expected_includes) return true;
  return q.expected_includes.some((s) => String(s).toUpperCase().includes('TODO'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Report generation
function buildReport({ runs, startedAt, finishedAt, backendUrl, totals }) {
  const lines = [];
  lines.push(`# Phase 3 mini eval — ${startedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  lines.push('');
  lines.push(`Backend: ${backendUrl}`);
  lines.push(`Duration: ${((finishedAt - startedAt) / 1000).toFixed(1)} s`);
  lines.push('');
  lines.push('## Per-PDF results');
  lines.push('');
  for (const r of runs) {
    lines.push(`### ${r.pdf}`);
    if (r.skipped) {
      lines.push(`*Skipped: ${r.skipReason}*`);
      lines.push('');
      continue;
    }
    lines.push('');
    lines.push('| # | Question | Verdict | Content | Citation | Conf | Ground | Refused | Latency (ms) |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    r.questions.forEach((q, i) => {
      const s = q.score;
      lines.push(
        `| ${i + 1} | ${escapeMd(q.q)} | **${s.verdict}** | ${pct(s.contentScore)} | ${pct(s.citationScore)} ` +
        `| ${pct(q.response.confidence ?? 0)} | ${pct(q.response.groundedness ?? 0)} ` +
        `| ${q.response.refused ? '✓' : ''} | ${q.response.latency_ms} |`
      );
    });
    lines.push('');
    r.questions.forEach((q, i) => {
      const s = q.score;
      lines.push(`#### Q${i + 1}: ${q.q}`);
      lines.push(`- Expected includes: \`${JSON.stringify(s.expectedIncludes)}\` — matched: \`${JSON.stringify(s.includesMatched)}\``);
      lines.push(`- Expected pages: \`${JSON.stringify(s.expectedPages)}\` — cited: \`${JSON.stringify(s.citedPages)}\``);
      lines.push('');
      lines.push('> ' + (q.response.answer || '(no answer)').replace(/\n/g, '\n> '));
      lines.push('');
    });
  }
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value | Target | Status |');
  lines.push('|---|---|---|---|');
  lines.push(`| Questions evaluated | ${totals.total} | — | — |`);
  lines.push(`| Pass | ${totals.pass} | — | — |`);
  lines.push(`| Partial | ${totals.partial} | — | — |`);
  lines.push(`| Fail | ${totals.fail} | — | — |`);
  lines.push(`| **Weighted pass rate** | **${pct(totals.weightedPassRate)}** | ≥ 80% | ${totals.weightedPassRate >= 0.8 ? '✅' : '❌'} |`);
  lines.push(`| Mean groundedness | ${pct(totals.meanGroundedness)} | ≥ 85% | ${totals.meanGroundedness >= 0.85 ? '✅' : '❌'} |`);
  lines.push(`| Mean confidence | ${pct(totals.meanConfidence)} | — | — |`);
  lines.push(`| P50 latency | ${totals.p50Latency} ms | — | — |`);
  lines.push(`| P95 latency | ${totals.p95Latency} ms | ≤ 4000 ms | ${totals.p95Latency <= 4000 ? '✅' : '❌'} |`);
  lines.push(`| Refusals on TODO/garbage probes | ${totals.refused} | n/a | — |`);
  lines.push('');
  return lines.join('\n');
}

function escapeMd(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
async function main() {
  await loadEnv();

  const baseUrl = process.env.NIB_BACKEND_URL || 'http://localhost:8080';
  const email = process.env.NIB_EVAL_EMAIL;
  const password = process.env.NIB_EVAL_PASSWORD;
  const keepDocuments = process.env.NIB_EVAL_KEEP_DOCUMENTS === '1';

  if (!email || !password) {
    console.error('Missing NIB_EVAL_EMAIL / NIB_EVAL_PASSWORD. Copy eval/.env.eval.example to eval/.env.eval and fill in test credentials.');
    process.exit(1);
  }

  const api = new NibApi(baseUrl);
  console.log(`Logging in to ${baseUrl} as ${email}…`);
  try {
    await api.login(email, password);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  const yamlRaw = await fs.readFile(QUESTIONS_PATH, 'utf8');
  const docs = yaml.load(yamlRaw);

  const runs = [];
  const allLatencies = [];
  let totalEvaluated = 0;
  let pass = 0, partial = 0, fail = 0;
  let confidenceSum = 0, groundednessSum = 0, refused = 0;
  const startedAt = new Date();

  for (const doc of docs) {
    const pdfPath = path.join(PDF_DIR, doc.pdf);
    console.log(`\n=== ${doc.pdf} ===`);

    let pdfExists = true;
    try { await fs.access(pdfPath); } catch { pdfExists = false; }

    const realQuestions = (doc.questions || []).filter((q) => !isTodoQuestion(q));
    if (!pdfExists) {
      console.log(`  ✗ skip — ${pdfPath} not found`);
      runs.push({ pdf: doc.pdf, skipped: true, skipReason: 'PDF file not found' });
      continue;
    }
    if (realQuestions.length === 0) {
      console.log('  ✗ skip — all questions are TODO placeholders');
      runs.push({ pdf: doc.pdf, skipped: true, skipReason: 'all questions are TODO placeholders' });
      continue;
    }

    let documentId = null;
    try {
      console.log('  uploading…');
      const uploaded = await api.uploadPdf(pdfPath, doc.pdf.replace(/\.pdf$/i, ''));
      documentId = uploaded.id;
      console.log(`  document ${documentId} — waiting for ingestion…`);
      await waitForIngestion(api, documentId);
      console.log('  ingestion complete.');
      const session = await api.getOrCreateSession(documentId);

      const questionResults = [];
      for (let i = 0; i < realQuestions.length; i++) {
        const q = realQuestions[i];
        console.log(`  Q${i + 1}: ${q.q}`);
        const response = await api.query(session.id, q.q);
        const score = scoreAnswer(q, response);
        console.log(`     -> ${score.verdict}  (content ${pct(score.contentScore)}, citation ${pct(score.citationScore)}, ${response.latency_ms} ms)`);
        questionResults.push({ q: q.q, response, score });

        totalEvaluated++;
        if (score.verdict === 'pass') pass++;
        else if (score.verdict === 'partial') partial++;
        else fail++;
        confidenceSum += response.confidence ?? 0;
        groundednessSum += response.groundedness ?? 0;
        if (response.refused) refused++;
        allLatencies.push(response.latency_ms);
      }
      runs.push({ pdf: doc.pdf, questions: questionResults });
    } catch (err) {
      console.error(`  ! error: ${err.message}`);
      runs.push({ pdf: doc.pdf, skipped: true, skipReason: `runtime error: ${err.message}` });
    } finally {
      if (documentId && !keepDocuments) {
        try { await api.deleteDocument(documentId); } catch { /* best effort */ }
      }
    }
  }

  const finishedAt = new Date();
  if (totalEvaluated === 0) {
    console.error('\nNo questions were evaluated. Populate eval/phase2-mini/pdfs/ and questions.yaml first.');
    process.exit(1);
  }

  const totals = {
    total: totalEvaluated,
    pass, partial, fail,
    weightedPassRate: (pass + 0.5 * partial) / totalEvaluated,
    meanConfidence: confidenceSum / totalEvaluated,
    meanGroundedness: groundednessSum / totalEvaluated,
    p50Latency: percentile(allLatencies, 50),
    p95Latency: percentile(allLatencies, 95),
    refused,
  };

  const report = buildReport({ runs, startedAt, finishedAt, backendUrl: baseUrl, totals });
  const stamp = startedAt.toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const outPath = path.join(EVAL_DIR, `results-${stamp}.md`);
  await fs.writeFile(outPath, report, 'utf8');

  console.log('\n────────────────────────────────────────');
  console.log(`Evaluated: ${totals.total}   pass ${totals.pass}   partial ${totals.partial}   fail ${totals.fail}`);
  console.log(`Weighted pass rate: ${pct(totals.weightedPassRate)}   (target ≥ 80%)`);
  console.log(`Mean confidence:    ${pct(totals.meanConfidence)}`);
  console.log(`Mean groundedness:  ${pct(totals.meanGroundedness)}   (target ≥ 85%)`);
  console.log(`Latency P50/P95:    ${totals.p50Latency} ms / ${totals.p95Latency} ms   (target P95 ≤ 4000 ms)`);
  console.log(`Report written to:  ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
