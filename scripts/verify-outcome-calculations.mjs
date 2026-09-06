#!/usr/bin/env node

// Optional, data-only arithmetic proof for outcome-pro/report@1. Worksheet:
// {schema:'outcome-pro/calculations@1', report_digest, calculations:[{
//   metric_id, field:'observed.value', operation:'ratio', unit:'percent',
//   inputs:[{evidence_id, pointer:'/completed/value', unit_pointer:'/completed/unit'}, ...]
// }]}. weighted_mean alone adds weights:[source references], one per input.
// Each source is a scalar envelope {value:number, unit:string}: pointers must
// select value and unit siblings under the SAME decoded JSON parent path.
// Other export shapes require a separately documented equivalent arithmetic proof.
// No fetches, queries, expressions, constants, inferred conversions or rounding.
// This proves arithmetic over supplied exports, NOT population, query correctness,
// causality, disjointness, representative sampling, or business interpretation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRoot } from './lib/repository-paths.mjs';
import { digestBytes } from './lib/digests.mjs';
import { hasSensitiveContent, hasDirectiveContent, readFileNoFollow, readJsonNoFollow } from './lib/review-safety.mjs';
import { validateReport } from './validate-outcome-report.mjs';

const MAX_BYTES = 256 * 1024;
const FIELDS = Object.freeze({
  'baseline.value': null, 'baseline.sample_size': 'count',
  'observed.value': null, 'observed.sample_size': 'count',
  'target.value': null, 'sample_policy.minimum_n': 'count', 'sample_policy.minimum_days': 'days',
});
const OPERATIONS = new Set(['identity', 'sum', 'difference', 'ratio', 'weighted_mean']);
const fail = code => { const error = new Error(code); error.code = code; throw error; };
const diagnostic = code => ({ code, message: ({
  EREPORT: 'The paired report or its evidence is invalid; validate it separately.',
  EDIGEST: 'Worksheet does not match the report content digest.',
  EWORKSHEET: 'Worksheet must use the exact bounded data-only format.',
  EPOINTER: 'A source pointer does not select an exact supported JSON field.',
  EUNIT: 'Source, operation or bound report units do not agree.',
  EREFERENCE: 'Source is not evidence cited by the bound report field.',
  EBINDING: 'Calculation does not bind a present supported report numeric field.',
  EDUPLICATE: 'Each report numeric field may be bound only once.',
  ENUMBER: 'A scalar or result is not finite, safely bounded, or a valid count.',
  EARITHMETIC: 'Operation has an invalid denominator, weight or intermediate result.',
  EMISMATCH: 'Computed value does not exactly equal the unrounded report value.',
  EEVIDENCE_DIGEST: 'Source bytes used for arithmetic differ from the declared digest.',
  EEVIDENCE: 'A bounded source JSON export could not be read safely.',
  ECOVERAGE: 'Not every present report numeric field has verified arithmetic.',
  ELIMIT: 'Input exceeds supported size, depth or node bounds.',
  EUNSAFE: 'Worksheet contains sensitive material or embedded instructions.',
  EINPUT: 'Calculation verification failed safely; check the supplied inputs.',
})[code] || 'Calculation verification failed safely.' });

function bounded(value) {
  let nodes = 0;
  const ancestors = new Set();
  function visit(member, depth) {
    if (++nodes > 20000 || depth > 32) fail('ELIMIT');
    if (member === null || ['string', 'boolean'].includes(typeof member)) return;
    if (typeof member === 'number') { if (!Number.isFinite(member)) fail('ENUMBER'); return; }
    if (!member || typeof member !== 'object' || ancestors.has(member)) fail('EINPUT');
    const prototype = Object.getPrototypeOf(member);
    if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) fail('EINPUT');
    ancestors.add(member);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(member))) {
      if (!Object.hasOwn(descriptor, 'value')) fail('EINPUT');
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(member);
  }
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_BYTES) fail('ELIMIT');
}

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail('EWORKSHEET');
}

function pointerParts(value) {
  if (typeof value !== 'string' || value.length > 512 || (value !== '' && !value.startsWith('/')) || /~(?![01])/u.test(value)) fail('EPOINTER');
  return (value === '' ? [] : value.slice(1).split('/')).map(encoded => encoded.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function pointer(source, parts) {
  for (const key of parts) {
    if (!source || typeof source !== 'object' || !Object.hasOwn(source, key)
        || (Array.isArray(source) && !/^(?:0|[1-9][0-9]*)$/.test(key))) fail('EPOINTER');
    source = source[key];
  }
  return source;
}

function numeric(value, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER
      || (unit === 'count' && (!Number.isSafeInteger(value) || value < 0))) fail('ENUMBER');
  return value;
}

function compute(operation, inputs, weights, unit) {
  const values = inputs.map(item => item.value);
  if (operation === 'ratio') {
    if (!['ratio', 'percent'].includes(unit) || inputs[0].unit !== inputs[1].unit) fail('EUNIT');
    if (values[1] === 0) fail('EARITHMETIC');
    return numeric(values[0] / values[1] * (unit === 'percent' ? 100 : 1), unit);
  }
  if (inputs.some(item => item.unit !== unit)) fail('EUNIT');
  if (operation === 'identity') return values[0];
  if (operation === 'difference') return numeric(values[0] - values[1], unit);
  if (operation === 'sum') return values.reduce((total, value) => numeric(total + value, unit), 0);
  if (weights.some(item => !['count', 'ratio'].includes(item.unit) || item.unit !== weights[0].unit)) fail('EUNIT');
  if (weights.some(item => item.value < 0)) fail('EARITHMETIC');
  const total = weights.reduce((sum, item) => numeric(sum + item.value, item.unit), 0);
  if (total === 0) fail('EARITHMETIC');
  // Normalize first to avoid multiplying a large finite value by a large count.
  return numeric(values.reduce((sum, value, index) => numeric(sum + value * (weights[index].value / total), unit === 'count' ? 'ratio' : unit), 0), unit);
}

function verifyCalculations(report, worksheet, { evidenceRoot, requireComplete = true, now = Date.now() } = {}) {
  const errors = []; const required = new Map(); const verified = new Set();
  const result = () => ({ ok: errors.length === 0, proof: 'ARITHMETIC_ONLY', errors,
    coverage: { required: required.size, verified: verified.size, missing: [...required.keys()].filter(key => !verified.has(key)) } });
  try {
    if (typeof requireComplete !== 'boolean') fail('EINPUT');
    bounded(report); bounded(worksheet);
    if (!validateReport(report, { evidenceRoot, now }).ok) fail('EREPORT');
    if (hasSensitiveContent(worksheet) || hasDirectiveContent(JSON.stringify(worksheet))) fail('EUNSAFE');
    exactKeys(worksheet, ['schema', 'report_digest', 'calculations']);
    if (worksheet.schema !== 'outcome-pro/calculations@1' || !Array.isArray(worksheet.calculations) || worksheet.calculations.length > 140) fail('EWORKSHEET');
    if (worksheet.report_digest !== report.content_digest) fail('EDIGEST');
    for (const metric of report.metrics) for (const [field, fixedUnit] of Object.entries(FIELDS)) {
      const [section, member] = field.split('.');
      if (metric[section] !== null) required.set(`${metric.id}:${field}`, { value: metric[section][member], unit: fixedUnit ?? metric[section].unit, evidenceIds: metric[section].evidence_ids });
    }
    const root = canonicalRoot(evidenceRoot); const sources = new Map(); const seen = new Set();
    let sourceBytes = 0;
    function resolve(ref, allowed) {
      exactKeys(ref, ['evidence_id', 'pointer', 'unit_pointer']);
      if (!allowed.includes(ref.evidence_id)) fail('EREFERENCE');
      if (!sources.has(ref.evidence_id)) {
        const source = report.evidence.find(item => item.id === ref.evidence_id);
        let bytes;
        try { bytes = readFileNoFollow(root, source.path, MAX_BYTES); } catch { fail('EEVIDENCE'); }
        sourceBytes += bytes.length;
        if (sourceBytes > 4 * 1024 * 1024) fail('ELIMIT');
        if (digestBytes(bytes) !== source.sha256) fail('EEVIDENCE_DIGEST');
        let parsed;
        try { parsed = JSON.parse(bytes.toString('utf8')); } catch { fail('EEVIDENCE'); }
        bounded(parsed); sources.set(ref.evidence_id, parsed);
      }
      const source = sources.get(ref.evidence_id);
      const valuePath = pointerParts(ref.pointer); const unitPath = pointerParts(ref.unit_pointer);
      const value = pointer(source, valuePath); const unit = pointer(source, unitPath);
      if (valuePath.at(-1) !== 'value' || unitPath.at(-1) !== 'unit' || valuePath.length !== unitPath.length
          || valuePath.slice(0, -1).some((part, index) => part !== unitPath[index])) fail('EUNIT');
      if (typeof unit !== 'string' || !unit.trim() || unit.length > 2000) fail('EUNIT');
      return { value: numeric(value, unit), unit };
    }
    for (const calculation of worksheet.calculations) {
      try {
        exactKeys(calculation, ['metric_id', 'field', 'operation', 'unit', 'inputs', ...(calculation?.operation === 'weighted_mean' ? ['weights'] : [])]);
        const { operation, inputs, weights = [], unit } = calculation;
        if (!OPERATIONS.has(operation) || !Array.isArray(inputs) || inputs.length < 1 || inputs.length > 100
            || (operation === 'identity' && inputs.length !== 1)
            || (['difference', 'ratio'].includes(operation) && inputs.length !== 2)
            || (operation === 'weighted_mean' && (!Array.isArray(weights) || weights.length !== inputs.length))) fail('EWORKSHEET');
        const key = `${calculation.metric_id}:${calculation.field}`; const target = required.get(key);
        if (!target) fail('EBINDING');
        if (seen.has(key)) fail('EDUPLICATE');
        seen.add(key);
        if (unit !== target.unit) fail('EUNIT');
        const value = compute(operation, inputs.map(ref => resolve(ref, target.evidenceIds)), weights.map(ref => resolve(ref, target.evidenceIds)), unit);
        // Exact IEEE-754 equality. Tolerance or display rounding must never turn
        // a below-target value into MET; round only in the human presentation.
        if (value !== target.value) fail('EMISMATCH');
        verified.add(key);
      } catch (error) {
        errors.push(diagnostic(error.code || 'EINPUT'));
        if (errors.length >= 20) break;
      }
    }
    if (requireComplete && verified.size !== required.size) errors.push(diagnostic('ECOVERAGE'));
  } catch (error) { errors.push(diagnostic(error.code || 'EINPUT')); }
  return result();
}

function runCli(argv, io = process) {
  try {
    if (argv.length === 1 && argv[0] === '--help') {
      io.stdout.write('Usage: verify-outcome-calculations.mjs --report-root <absolute-root> --report <relative-json> --evidence-root <absolute-root> --worksheet <relative-json>\nWorksheet resolves under report root. Complete arithmetic coverage required; this never certifies source eligibility or causality.\n');
      return 0;
    }
    const names = { '--report-root': 'reportRoot', '--report': 'report', '--evidence-root': 'evidenceRoot', '--worksheet': 'worksheet' }; const options = {};
    for (let index = 0; index < argv.length; index += 2) {
      if (!Object.hasOwn(names, argv[index])) fail('EINPUT');
      const key = names[argv[index]];
      if (Object.hasOwn(options, key) || !argv[index + 1] || argv[index + 1].startsWith('--')) fail('EINPUT');
      options[key] = argv[index + 1];
    }
    if (Object.keys(options).length !== 4 || !path.isAbsolute(options.reportRoot) || !path.isAbsolute(options.evidenceRoot)) fail('EINPUT');
    const report = readJsonNoFollow(options.reportRoot, options.report, MAX_BYTES);
    const worksheet = readJsonNoFollow(options.reportRoot, options.worksheet, MAX_BYTES);
    const result = verifyCalculations(report, worksheet, { evidenceRoot: options.evidenceRoot });
    (result.ok ? io.stdout : io.stderr).write(`${JSON.stringify(result)}\n`);
    return result.ok ? 0 : 1;
  } catch { io.stderr.write('Calculation verification failed: supply all paired roots and bounded, contained JSON files.\n'); return 1; }
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runCli(process.argv.slice(2));
export { verifyCalculations, runCli };

