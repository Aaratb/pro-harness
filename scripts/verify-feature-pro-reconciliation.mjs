#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(harnessRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const reconciliation = readJson('commands/feature-pro/reconciliation.json');
const contract = readJson('commands/feature-pro/contract.json');
const sourceIndex = process.argv.indexOf('--source');

assert(reconciliation.schema_version === 1, 'reconciliation schema_version must be 1');
assert(reconciliation.status === 'reconciled-with-approved-normalizations', 'reconciliation is not certified');
assert(reconciliation.phase_map.length === contract.phase_count, 'reconciliation must map every phase');
assert(reconciliation.phase_map.every((phase, index) => phase.target === index + 1), 'reconciliation phase map must target integers 1-21');
assert(reconciliation.behavior_domains.length >= 20, 'reconciliation must cover at least one behavior domain per phase');

const coveredPhases = new Set(reconciliation.behavior_domains.flatMap(({ phases }) => phases));
for (const phase of contract.phases) assert(coveredPhases.has(phase.number), `Phase ${phase.number} has no reconciled behavior domain`);

for (const record of [...reconciliation.approved_normalizations, ...reconciliation.behavior_domains]) {
  assert(record.id && Array.isArray(record.evidence) && record.evidence.length > 0, `${record.id ?? 'record'}: missing evidence`);
  for (const evidence of record.evidence) assert(fs.existsSync(path.join(harnessRoot, evidence)), `${record.id}: missing evidence ${evidence}`);
}

if (sourceIndex >= 0) {
  const sourcePath = process.argv[sourceIndex + 1];
  assert(sourcePath, '--source requires a path');
  const source = fs.readFileSync(path.resolve(sourcePath), 'utf8');
  assert(sha256(source) === reconciliation.source_snapshot.sha256, 'source snapshot digest differs; reconcile new source drift before certifying');
}

console.log(`Feature Pro reconciliation valid: ${reconciliation.phase_map.length} phases, ${reconciliation.behavior_domains.length} behavior domains, ${reconciliation.approved_normalizations.length} approved normalizations`);
