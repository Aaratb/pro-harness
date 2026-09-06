#!/usr/bin/env node
// Supplied aggregate evidence only: no execution, data collection or source arithmetic certification.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digestBytes } from './lib/digests.mjs';
import { canonicalRoot } from './lib/repository-paths.mjs';
import { validateJsonSchema } from './lib/json-schema.mjs';
import { contentDigest, withContentDigest, hasSensitiveContent, hasDirectiveContent, readFileNoFollow, readJsonNoFollow } from './lib/review-safety.mjs';

const SCHEMA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../schemas/outcome-pro/report.schema.json');
const DAY_MS = 24 * 60 * 60 * 1000;
const ROUTES = Object.freeze({ suspected_defect: 'review-pro', new_capability: 'feature-pro', structural_limit: 'architecture-pro', evidence_gap: 'collect-evidence', none: 'none' });
// Exact numeric aggregate names only: not a general exception for email/PII keys.
const EMAIL_AGGREGATES = new Set(['email_open_rate', 'email_click_rate', 'email_bounce_rate', 'email_unsubscribe_rate', 'total_email_messages']);
const DIAGNOSTIC_FIELDS = new Set((
  'schema run_id evaluated_at feature name repo hypothesis release ref released_at evidence_ids evidence id path sha256 kind note '
  + 'metrics role target operator value unit baseline observed cohort definition window_start window_end sample_size sample_policy minimum_n minimum_days '
  + 'comparability status reason caveats assessment measurement recommendation rationale limitations causal_claim follow_up destination content_digest'
).split(' '));

function safeDiagnosticPath(pointer = '') {
  const accepted = [];
  for (const part of pointer.split('/').slice(1)) {
    if (!DIAGNOSTIC_FIELDS.has(part) && !/^(?:0|[1-9][0-9]{0,2})$/.test(part)) break;
    accepted.push(part);
  }
  return `/${accepted.join('/')}`;
}

const issue = (code, message, location = '') => ({ code, message, path: safeDiagnosticPath(location) });

function evidenceExists(report, ids, kind) {
  return Array.isArray(ids) && ids.length > 0 && ids.every(id => report.evidence.some(item => item.id === id && item.kind === kind));
}

// This pure calculator assumes schema-valid metadata. Hashes and actual files are
// independently checked by validateReport; numbers alone do not certify evidence.
function assessOutcome(report) {
  const released = Date.parse(report.release.released_at);
  const evaluated = Date.parse(report.evaluated_at);
  const metrics = report.metrics.map(metric => {
    const reasons = [];
    const { target, baseline, observed, sample_policy: policy } = metric;
    if (!report.release.ref || !Number.isFinite(released) || !evidenceExists(report, report.release.evidence_ids, 'release')) reasons.push('Release identity, date or release evidence is missing.');
    if (!target || !evidenceExists(report, target.evidence_ids, 'intent')) reasons.push('Original target or its intent evidence is missing.');
    if (!policy || !evidenceExists(report, policy.evidence_ids, 'intent')) reasons.push('Accepted sample policy or its intent evidence is missing.');
    if (metric.comparability.status !== 'COMPARABLE') reasons.push('Comparability is not established.');
    for (const [kind, value] of [['baseline', baseline], ['observed', observed]]) {
      if (!value || !evidenceExists(report, value.evidence_ids, kind)) reasons.push(`${kind} value or matching evidence is missing.`);
      if (!value) continue;
      const start = Date.parse(value.window_start);
      const end = Date.parse(value.window_end);
      if (!(start < end)) reasons.push(`${kind} window must have positive duration.`);
      if (kind === 'baseline' && !(end <= released)) reasons.push('Baseline window must precede release.');
      if (kind === 'observed' && (!(start >= released) || !(end <= evaluated))) reasons.push('Observed window must follow release and finish by evaluation.');
      if (policy && value.sample_size < policy.minimum_n) reasons.push(`${kind} sample is below the accepted minimum.`);
      if (policy && (end - start) / DAY_MS < policy.minimum_days) reasons.push(`${kind} window is shorter than the accepted measurement duration.`);
    }
    if (baseline && observed && ['unit', 'cohort', 'definition'].some(key => baseline[key] !== observed[key])) reasons.push('Baseline and observed unit, cohort or definition do not match.');
    if (target && observed && target.unit !== observed.unit) reasons.push('Target unit does not match the observation; conversions are not inferred.');
    const met = target && observed && (target.operator === 'gte' ? observed.value >= target.value : observed.value <= target.value);
    return { id: metric.id, status: reasons.length ? 'INSUFFICIENT_EVIDENCE' : met ? 'MET' : 'MISSED', reasons };
  });
  const required = metrics.filter((_, index) => report.metrics[index].role !== 'secondary');
  const measurement = !report.metrics.some(metric => metric.role === 'primary') || required.some(metric => metric.status === 'INSUFFICIENT_EVIDENCE')
    ? 'INSUFFICIENT_EVIDENCE' : required.some(metric => metric.status === 'MISSED') ? 'MISSED' : 'MET';
  return { measurement, metrics };
}

function unsafeContentPath(value) {
  const unsafeString = text => hasSensitiveContent(text) || hasDirectiveContent(text);
  function visit(member, location) {
    if (typeof member === 'string') return unsafeString(member) ? location || '/' : null;
    if (!member || typeof member !== 'object') return null;
    for (const [key, nested] of Object.entries(member)) {
      if (unsafeString(key)) return location || '/';
      if (EMAIL_AGGREGATES.has(key) && typeof nested === 'number' && Number.isFinite(nested)) continue;
      if (hasSensitiveContent({ [key]: null })) return location || '/';
      const child = `${location}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;
      const found = visit(nested, child);
      if (found !== null) return found;
    }
    return null;
  }
  return visit(value, '');
}

function validTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = match.slice(1).map(part => Number(part ?? 0));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
    && hour <= 23 && minute <= 59 && second <= 59 && offsetHour <= 23 && offsetMinute <= 59
    && Number.isFinite(Date.parse(value));
}

function validateReport(report, { evidenceRoot, now = Date.now() } = {}) {
  const errors = [];
  try {
    const unsafeReport = unsafeContentPath(report);
    if (unsafeReport !== null) return { ok: false, errors: [issue('EUNSAFE', 'Report contains common sensitive data or embedded instructions; supply sanitized aggregate evidence.', unsafeReport)] };
    const failures = validateJsonSchema(report, SCHEMA_FILE);
    if (failures.length) return { ok: false, errors: failures.slice(0, 20).map(message => issue('ESCHEMA', 'Report schema constraint failed.', schemaLocation(message))) };
    if (!Number.isFinite(now)) return { ok: false, errors: [issue('ECLOCK', 'The trusted caller clock must be a finite epoch-millisecond number.')] };
    const timestamps = [[report.evaluated_at, '/evaluated_at'], [report.release.released_at, '/release/released_at']];
    report.metrics.forEach((metric, index) => {
      for (const kind of ['baseline', 'observed']) {
        if (metric[kind]) for (const field of ['window_start', 'window_end']) timestamps.push([metric[kind][field], `/metrics/${index}/${kind}/${field}`]);
      }
    });
    for (const [value, location] of timestamps) {
      if (value !== null && !validTimestamp(value)) errors.push(issue('ETIME', 'Timestamp must use a real Gregorian date, timezone and supported clock fields; leap seconds are unsupported.', location));
    }
    if (Date.parse(report.evaluated_at) > now) errors.push(issue('EFUTURE', 'Evaluation cannot be later than the trusted current clock.', '/evaluated_at'));
    if (errors.length) return { ok: false, errors };
    if (contentDigest(report) !== report.content_digest) errors.push(issue('EDIGEST', 'Report content digest does not match its canonical content.', '/content_digest'));
    const root = canonicalRoot(evidenceRoot);
    const ids = new Set();
    let totalBytes = 0;
    for (const [index, item] of report.evidence.entries()) {
      const location = `/evidence/${index}`;
      if (ids.has(item.id)) errors.push(issue('EDUPLICATE', 'Evidence identifiers must be unique.', `${location}/id`));
      ids.add(item.id);
      try {
        const bytes = readFileNoFollow(root, item.path, 256 * 1024);
        totalBytes += bytes.length;
        if (totalBytes > 4 * 1024 * 1024) { errors.push(issue('ESIZE', 'Combined evidence exceeds the four MiB assessment limit.', location)); break; }
        if (digestBytes(bytes) !== item.sha256) errors.push(issue('EEVIDENCE_DIGEST', 'An evidence file differs from its declared digest.', `${location}/sha256`));
        const text = bytes.toString('utf8');
        if (!text.trim()) { errors.push(issue('EEMPTY', 'Evidence is empty; provide an aggregate export or record the measurement as unknown.', `${location}/path`)); continue; }
        const structured = [];
        try { structured.push(JSON.parse(text)); } catch {
          // As in Review, JSONL records also need decoded-key checks. The file
          // is already byte-bounded; other text retains the plaintext scan.
          for (const line of text.split(/\r?\n/)) {
            if (!line.trim()) continue;
            try { structured.push(JSON.parse(line)); } catch { /* Plain-text evidence remains supported. */ }
          }
        }
        if (unsafeContentPath(text) !== null || structured.some(value => unsafeContentPath(value) !== null)) errors.push(issue('EUNSAFE', 'Evidence contains common sensitive data or embedded instructions; provide a sanitized aggregate export.', location));
      } catch (error) { errors.push(issue('EEVIDENCE_PATH', `Cannot read bounded evidence safely (${safeErrorCode(error)}).`, `${location}/path`)); }
    }
    function checkReferences(references, kind, location) {
      for (const [index, id] of references.entries()) {
        const source = report.evidence.find(item => item.id === id);
        if (!source || source.kind !== kind) errors.push(issue('EREFERENCE', 'An evidence reference is missing or has the wrong kind.', `${location}/${index}`));
      }
    }
    checkReferences(report.release.evidence_ids, 'release', '/release/evidence_ids');
    const metricIds = new Set();
    for (const [index, metric] of report.metrics.entries()) {
      if (metricIds.has(metric.id)) errors.push(issue('EDUPLICATE', 'Metric identifiers must be unique.', `/metrics/${index}/id`));
      metricIds.add(metric.id);
      for (const [field, kind] of [['target', 'intent'], ['sample_policy', 'intent'], ['baseline', 'baseline'], ['observed', 'observed']]) {
        if (metric[field]) checkReferences(metric[field].evidence_ids, kind, `/metrics/${index}/${field}/evidence_ids`);
      }
    }
    if (!report.metrics.some(metric => metric.role === 'primary')) errors.push(issue('EPRIMARY', 'At least one primary metric is required.', '/metrics'));
    const assessment = assessOutcome(report);
    const proposed = report.assessment;
    if (proposed.measurement !== assessment.measurement) errors.push(issue('EMEASUREMENT', 'Declared measurement differs from recomputed primary and guardrail results.', '/assessment/measurement'));
    if (proposed.recommendation === 'CONTINUE' && assessment.measurement !== 'MET') errors.push(issue('ERECOMMENDATION', 'CONTINUE requires all required metrics to be MET.', '/assessment/recommendation'));
    if (assessment.measurement === 'INSUFFICIENT_EVIDENCE' && (proposed.recommendation !== 'INSUFFICIENT_EVIDENCE' || proposed.follow_up.kind !== 'evidence_gap')) errors.push(issue('EGAP', 'Insufficient measurement requires the insufficient-evidence recommendation and a missing-evidence collection plan.', '/assessment'));
    if (proposed.follow_up.destination !== ROUTES[proposed.follow_up.kind]) errors.push(issue('EROUTE', 'Follow-up destination does not match its declared kind; suspected defects go to Review first.', '/assessment/follow_up/destination'));
    return { ok: errors.length === 0, errors, assessment };
  } catch (error) {
    return { ok: false, errors: [...errors, issue('EINPUT', `Cannot validate report safely (${safeErrorCode(error)}).`)] };
  }
}

// Schema diagnostics are never forwarded verbatim: keys and values are untrusted.
function schemaLocation(message) {
  return message.split(':', 1)[0].replace(/^\$/, '').replace(/\[([0-9]+)\]/g, '/$1').replace(/\./g, '/');
}
function safeErrorCode(error) {
  const allowed = ['ENOENT', 'EACCES', 'EPERM', 'ELOOP', 'ENOTDIR', 'EISDIR', 'ESIZE', 'ELIMIT', 'EPATH', 'EPATH_RACE', 'EJSON_PARSE'];
  return allowed.includes(error?.code) ? error.code : 'invalid input';
}

export function runCli(argv, io = process) {
  try {
    if (argv.length === 1 && argv[0] === '--help') {
      io.stdout.write('Usage: validate-outcome-report.mjs --report <relative-json> --evidence-root <absolute-root> [--report-root <absolute-root>]\nReport root defaults to evidence root; source evidence always resolves under evidence root.\nRead-only: valid insufficient-evidence reports exit 0; invalid or unsafe input exits 1.\n');
      return 0;
    }
    const names = { '--report': 'report', '--evidence-root': 'evidenceRoot', '--report-root': 'reportRoot' };
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
      if (!Object.hasOwn(names, argv[index])) throw new Error('invalid arguments');
      const name = names[argv[index]];
      if (Object.hasOwn(options, name) || !argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error('invalid arguments');
      options[name] = argv[index + 1];
    }
    if (!options.report || !options.evidenceRoot || !path.isAbsolute(options.evidenceRoot)) throw new Error('explicit report and absolute evidence root required');
    if (options.reportRoot && !path.isAbsolute(options.reportRoot)) throw new Error('report root must be absolute');
    const result = validateReport(readJsonNoFollow(options.reportRoot ?? options.evidenceRoot, options.report, 256 * 1024), { evidenceRoot: options.evidenceRoot });
    (result.ok ? io.stdout : io.stderr).write(JSON.stringify(result) + '\n');
    return result.ok ? 0 : 1;
  } catch { io.stderr.write('Outcome validation failed: supply paired arguments, explicit roots and a bounded readable JSON report.\n'); return 1; }
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runCli(process.argv.slice(2));
export { assessOutcome, contentDigest, withContentDigest, validateReport };
