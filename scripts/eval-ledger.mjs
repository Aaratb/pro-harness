#!/usr/bin/env node

// The deterministic half of the eval loop.
//
// Producing an artifact and judging it needs models. Deciding what a set of verdicts *means* --
// met-rate, regression, whether a run may be accepted -- does not, and keeping that half free of
// model calls is what makes the gate testable, reproducible, and cheap to reason about.
//
// record   append verdicts from one run
// report   met-rate per criterion for the most recent run
// gate     compare the latest run against the accepted baseline; exit 1 on regression
// accept   promote the latest run to be the new baseline (a deliberate act)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERDICTS = new Set(['met', 'partial', 'not_met']);
// A partial counts as half. Judges disagree least at the extremes, so a criterion that lands on
// partial repeatedly is a signal the criterion is ambiguous, not that the output is mediocre.
const WEIGHT = { met: 1, partial: 0.5, not_met: 0 };

const fail = (message) => { throw new Error(message); };
const ledgerPath = (suite) => path.join(HARNESS_ROOT, 'evals', 'ledger', `${suite}.jsonl`);
const baselinePath = (suite) => path.join(HARNESS_ROOT, 'evals', 'baseline', `${suite}.json`);

export function readLedger(suite) {
  const file = ledgerPath(suite);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error(`${suite} ledger line ${index + 1} is not JSON`); }
  });
}

export function assertVerdict(entry) {
  for (const field of ['run_id', 'suite', 'discipline', 'rubric_version', 'case', 'criterion', 'verdict', 'reason', 'producer_model', 'judge_model', 'sample']) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') fail(`verdict is missing ${field}`);
  }
  if (!VERDICTS.has(entry.verdict)) fail(`unknown verdict ${entry.verdict}`);
  if (!Number.isInteger(entry.rubric_version) || entry.rubric_version < 1) fail('rubric_version must be a positive integer');
  // A judge that cannot point at the artifact has not judged it, so an unsupported verdict is
  // rejected at write time rather than discovered later in a report that already looks credible.
  if (String(entry.reason).trim().length < 20) fail(`${entry.criterion}: verdict needs a reason citing the artifact`);
  // Self-grading is the failure mode that makes an eval suite quietly worthless.
  if (entry.producer_model === entry.judge_model) fail(`${entry.criterion}: producer and judge must be different models`);
  return entry;
}

export function record(suite, entries) {
  const lines = entries.map(assertVerdict).map((entry) => JSON.stringify(entry));
  fs.mkdirSync(path.dirname(ledgerPath(suite)), { recursive: true });
  fs.appendFileSync(ledgerPath(suite), lines.length ? `${lines.join('\n')}\n` : '');
  return lines.length;
}

/** Met-rate per criterion for one run: the mean weight across its samples. */
export function summarise(entries) {
  const buckets = new Map();
  for (const entry of entries) {
    // Two-arm runs record a control (no harness) beside the real thing. Without the arm in the
    // key both collapse into one bucket and the comparison silently disappears. Entries with no
    // arm keep their original key, so baselines accepted before two-arm runs stay valid.
    const key = `${entry.arm ? `${entry.arm}/` : ''}${entry.discipline}/${entry.case}/${entry.criterion}`;
    if (!buckets.has(key)) buckets.set(key, { key, rubric_version: entry.rubric_version, weights: [], reasons: [] });
    const bucket = buckets.get(key);
    // A rubric change invalidates comparison, so mixing versions inside one run is an error
    // rather than something to average over.
    if (bucket.rubric_version !== entry.rubric_version) fail(`${key}: one run mixes rubric versions`);
    bucket.weights.push(WEIGHT[entry.verdict]);
    if (entry.verdict !== 'met') bucket.reasons.push(entry.reason);
  }
  return [...buckets.values()]
    .map(({ key, rubric_version, weights, reasons }) => ({
      key,
      rubric_version,
      samples: weights.length,
      met_rate: Number((weights.reduce((sum, weight) => sum + weight, 0) / weights.length).toFixed(3)),
      reasons,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function latestRun(suite) {
  const entries = readLedger(suite);
  if (!entries.length) return null;
  const runId = entries[entries.length - 1].run_id;
  return { run_id: runId, entries: entries.filter((entry) => entry.run_id === runId) };
}

export function readBaseline(suite) {
  const file = baselinePath(suite);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

/**
 * Regression, not aggregate movement.
 *
 * A criterion blocks when its met-rate falls materially below the accepted baseline, or when the
 * rubric it was accepted under has since changed. An aggregate score is reported and never gates:
 * aggregates are the easiest thing to drift upward without anything actually improving.
 */
export function gate(suite, { tolerance = 0.15 } = {}) {
  const latest = latestRun(suite);
  if (!latest) return { status: 'no-runs', blockers: [], summary: [] };
  const summary = summarise(latest.entries);
  const baseline = readBaseline(suite);
  if (!baseline) return { status: 'no-baseline', run_id: latest.run_id, blockers: [], summary };

  const blockers = [];
  for (const row of summary) {
    // The control arm measures the bare model, which is not ours to regress. It is reported so
    // the delta is visible, but only the harness arm can block.
    if (row.key.startsWith('baseline/')) continue;
    const accepted = baseline.criteria?.[row.key];
    if (accepted === undefined) continue; // new criterion: reported, never a blocker on first sight
    if (baseline.rubric_version !== row.rubric_version) {
      blockers.push({ key: row.key, kind: 'rubric-changed',
        detail: `accepted under rubric_version ${baseline.rubric_version}, ran under ${row.rubric_version}; re-accept the baseline` });
      continue;
    }
    if (row.met_rate < accepted - tolerance) {
      blockers.push({ key: row.key, kind: 'regression',
        detail: `met-rate ${row.met_rate} is below the accepted ${accepted} by more than ${tolerance}`,
        reasons: row.reasons.slice(0, 2) });
    }
  }
  return { status: blockers.length ? 'regressed' : 'ok', run_id: latest.run_id, blockers, summary };
}

export function accept(suite) {
  const latest = latestRun(suite);
  if (!latest) fail(`${suite} has no recorded run to accept`);
  const summary = summarise(latest.entries);
  const document = {
    schema_version: 1,
    suite,
    accepted_run: latest.run_id,
    rubric_version: summary[0]?.rubric_version ?? 1,
    accepted_at: latest.entries[0].recorded_at ?? null,
    criteria: Object.fromEntries(summary.map((row) => [row.key, row.met_rate])),
  };
  fs.mkdirSync(path.dirname(baselinePath(suite)), { recursive: true });
  fs.writeFileSync(baselinePath(suite), `${JSON.stringify(document, null, 2)}\n`);
  return document;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [command, suite] = process.argv.slice(2);
  try {
    if (!command || !suite) fail('usage: eval-ledger.mjs <report|gate|accept> <suite>');
    if (command === 'report') {
      const latest = latestRun(suite);
      if (!latest) { console.log(JSON.stringify({ status: 'no-runs', suite }, null, 2)); process.exit(0); }
      console.log(JSON.stringify({ status: 'ok', suite, run_id: latest.run_id, criteria: summarise(latest.entries) }, null, 2));
    } else if (command === 'gate') {
      const result = gate(suite);
      console.log(JSON.stringify({ suite, ...result }, null, 2));
      if (result.status === 'regressed') process.exit(1);
    } else if (command === 'accept') {
      console.log(JSON.stringify(accept(suite), null, 2));
    } else fail(`unknown command ${command}`);
  } catch (error) {
    console.log(JSON.stringify({ status: 'error', summary: error.message }, null, 2));
    process.exitCode = 1;
  }
}
