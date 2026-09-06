#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digestFile } from './lib/digests.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { contentDigest, hasDirectiveContent, hasSensitiveContent, readJsonNoFollow } from './lib/review-safety.mjs';
import { normalizeLocalScope, resolveLocalProjectRoot } from './lib/local-directory.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = (name) => path.join(harnessRoot, 'schemas', 'review-pro', `${name}.schema.json`);
const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'review-pro.json'), 'utf8'));
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function bindComparison(record, target, label) {
  if (record.reviewed_head_sha === null || target.reviewed_head_sha === null || (record.comparison && target.comparison)) {
    assert(record.comparison === target.comparison, `${label} comparison differs from state`);
  }
  assert(JSON.stringify(record.local_scope) === JSON.stringify(target.local_scope), `${label} local scope differs from state`);
}

try {
  const requestedLocal = args.includes('--local');
  assert(!requestedLocal || args.includes('--scope'), 'local-directory handoff validation requires independently supplied caller --scope');
  assert(requestedLocal || !args.includes('--scope'), '--scope requires explicit local-directory validation');
  const callerScope = requestedLocal ? normalizeLocalScope(JSON.parse(valueFor('--scope'))) : undefined;
  const repositoryRoot = canonicalRoot(valueFor('--repo-root'));
  const artifactRoot = canonicalRoot(valueFor('--artifact-root'));
  const handoffRelative = valueFor('--handoff');
  if (!handoffRelative) throw new Error('usage: validate-review-handoff.mjs --repo-root <path> --artifact-root <path> --handoff <relative path>');
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  assert(/^\.agents\/reviews\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative), 'artifact root must be repository-owned');
  assert(/^debug-handoffs\/[A-Za-z0-9._-]+\.json$/.test(handoffRelative), 'handoff must be a direct JSON child of debug-handoffs');
  const state = readJsonNoFollow(artifactRoot, 'state.json');
  assertJsonSchema(state, schema('state'), 'Review Pro state');
  const intake = readJsonNoFollow(artifactRoot, 'intake.json');
  assert(['committed-range', 'working-tree', 'initial-working-tree', 'local-directory'].includes(intake.comparison), 'intake comparison is invalid');
  const local = intake.comparison === 'local-directory';
  assert(local === requestedLocal, 'local-directory handoff validation requires explicit caller --local authorization and cannot reinterpret a Git review');
  if (local) {
    resolveLocalProjectRoot(repositoryRoot);
    assert(JSON.stringify(intake.local_scope) === JSON.stringify(normalizeLocalScope(intake.local_scope)), 'intake local scope must be canonical');
    assert(JSON.stringify(callerScope) === JSON.stringify(intake.local_scope), 'caller local scope differs from intake before source or evidence reads');
  }
  for (const field of ['repository_identity', 'base_sha', 'reviewed_head_sha', 'diff_digest']) {
    assert(intake[field] === state.target[field], `intake ${field} differs from state`);
  }
  const boundTarget = { ...state.target, comparison: intake.comparison };
  assert(JSON.stringify(intake.local_scope) === JSON.stringify(state.target.local_scope), 'intake local scope differs from state');
  bindComparison(state.target, boundTarget, 'state target');
  const handoff = readJsonNoFollow(artifactRoot, handoffRelative);
  assertJsonSchema(handoff, schema('debug-handoff'), 'Debug Pro handoff');
  assert(handoff.content_digest === contentDigest(handoff), 'handoff content digest does not bind the canonical packet');
  assert(!hasSensitiveContent(handoff), 'handoff contains secret- or personal-data-shaped content');
  assert(!hasDirectiveContent(handoff), 'handoff contains directive-shaped untrusted prose');
  assert(handoff.handoff_id === `${handoff.review.review_id}:${handoff.review.finding_id}`, 'handoff id must bind review and finding identity');
  assert(handoff.review.review_id === state.run_id, 'handoff review id differs from state');
  for (const field of ['repository_identity', 'base_sha', 'reviewed_head_sha', 'diff_digest']) assert(handoff.target[field] === state.target[field], `handoff target ${field} differs from state`);
  bindComparison(handoff.target, boundTarget, 'handoff target');
  if (local) assert(handoff.target.pull_request_url === null, 'local directory handoff cannot claim a pull-request target');
  const finding = readJsonNoFollow(artifactRoot, handoff.review.artifact_path);
  assertJsonSchema(finding, schema('finding'), 'handoff finding');
  assert(finding.content_digest === contentDigest(finding), 'finding content digest is invalid');
  const findingFile = containedPath(artifactRoot, handoff.review.artifact_path, { expectedType: 'file' });
  assert(handoff.review.artifact_digest === digestFile(findingFile), 'handoff finding artifact digest is invalid');
  assert(handoff.review.finding_digest === finding.content_digest, 'handoff finding digest differs from finding');
  assert(finding.finding_id === handoff.review.finding_id, 'handoff finding identity differs from artifact');
  for (const field of ['repository_identity', 'base_sha', 'reviewed_head_sha', 'diff_digest']) assert(finding[field] === state.target[field], `finding ${field} differs from state`);
  bindComparison(finding, boundTarget, 'finding');
  assert(finding.changed_paths.every((relativePath) => state.target.changed_files.includes(relativePath)), 'finding changed paths differ from the reviewed diff');
  assert(['CONFIRMED', 'REPRODUCED'].includes(finding.verification_status) && finding.requires_correction, 'finding is not eligible for a Debug Pro handoff');
  if (['CRITICAL', 'HIGH'].includes(finding.severity)) assert(finding.confidence >= policy.high_severity_minimum_confidence, `high-severity handoff requires confidence of at least ${policy.high_severity_minimum_confidence}`);
  const evidenceIds = new Set(handoff.evidence.map(({ id }) => id));
  assert(evidenceIds.size === handoff.evidence.length, 'handoff evidence identifiers must be unique');
  assert(JSON.stringify([...evidenceIds].sort()) === JSON.stringify([...finding.evidence_ids].sort()), 'handoff evidence must exactly match the authenticated finding evidence');
  for (const entry of handoff.evidence) {
    const evidence = readJsonNoFollow(artifactRoot, `evidence/${entry.id}.json`);
    assertJsonSchema(evidence, schema('evidence'), `handoff evidence ${entry.id}`);
    assert(evidence.content_digest === contentDigest(evidence), `${entry.id} evidence content digest is invalid`);
    assert(entry.content_digest === evidence.content_digest && entry.type === evidence.type && entry.location === evidence.location && entry.summary === evidence.summary, `${entry.id} handoff evidence differs from its authenticated record`);
    for (const field of ['repository_identity', 'base_sha', 'reviewed_head_sha', 'diff_digest']) assert(evidence[field] === state.target[field], `${entry.id} evidence ${field} differs from state`);
    bindComparison(evidence, boundTarget, `${entry.id} evidence`);
    assert(!hasSensitiveContent(evidence) && !hasDirectiveContent(evidence), `${entry.id} evidence contains unsafe content`);
    if (evidence.artifact_path === null) assert(evidence.artifact_digest === null, `${entry.id} null artifact path requires a null digest`);
    else assert(evidence.artifact_digest === digestFile(containedPath(artifactRoot, evidence.artifact_path, { expectedType: 'file' })), `${entry.id} artifact digest is invalid`);
  }
  for (const entry of Object.values(handoff.failure_story)) for (const id of entry.evidence_ids) assert(evidenceIds.has(id), `failure story references missing evidence ${id}`);
  for (const id of handoff.logs_and_traces.evidence_ids) assert(evidenceIds.has(id), `logs and traces reference missing evidence ${id}`);
  assert(handoff.route.command === 'debug-pro' && handoff.route.flag === '--from-review', 'handoff route is invalid');
  const handoffPath = containedPath(artifactRoot, handoffRelative, { expectedType: 'file' });
  const scopeArgument = local ? `'${JSON.stringify(callerScope).replace(/'/g, "'\\''")}'` : '';
  console.log(JSON.stringify({ status: 'success', summary: `validated Debug Pro handoff ${handoff.handoff_id}`, rendered_command: `/debug-pro ${local ? `--local --scope ${scopeArgument} ` : ''}--from-review ${JSON.stringify(handoffPath)}`, artifacts: [handoffRelative], next_actions: ['Pass this exact validated handoff path to Debug Pro when that companion is installed.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Quarantine the packet, repair it from authenticated review evidence, and retry.'] }, null, 2));
  process.exit(1);
}
