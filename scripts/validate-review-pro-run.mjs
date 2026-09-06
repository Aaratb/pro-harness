#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureReviewSource, currentHead } from './review-source.mjs';
import { digestFile } from './lib/digests.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { contentDigest, hasDirectiveContent, hasSensitiveContent, readJsonNoFollow } from './lib/review-safety.mjs';
import { normalizeLocalScope } from './lib/local-directory.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'review-pro.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'commands', 'review-pro', 'contract.json'), 'utf8'));
const schema = (name) => path.join(harnessRoot, 'schemas', 'review-pro', `${name}.schema.json`);
const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const requireComplete = args.includes('--require-complete');
const errors = [];
const verification = [];
const check = (condition, code, detail) => { verification.push({ code, status: condition ? 'passed' : 'failed', detail }); if (!condition) errors.push(`${code}: ${detail}`); };
const sameScope = (left, right) => JSON.stringify(left.local_scope) === JSON.stringify(right.local_scope);

function comparisonOf(binding, intakeComparison) {
  if (binding.comparison !== undefined) return binding.comparison;
  // Legacy commit-backed artifacts did not carry a comparison discriminator.
  if (typeof binding.reviewed_head_sha === 'string' && (!Object.hasOwn(binding, 'base_sha') || typeof binding.base_sha === 'string')
      && ['committed-range', 'working-tree'].includes(intakeComparison)) return intakeComparison;
  return undefined;
}

function directJsonFiles(root, directory) {
  const absolute = containedPath(root, directory, { expectedType: 'directory' });
  const files = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`${directory}/${entry.name} must not be a symlink`);
    if (entry.isFile() && entry.name.endsWith('.json')) files.push(`${directory}/${entry.name}`);
  }
  return files.sort();
}

try {
  const requestedLocal = args.includes('--local');
  if (requestedLocal && !args.includes('--scope')) throw new Error('local-directory validation requires independently supplied caller --scope');
  if (!requestedLocal && args.includes('--scope')) throw new Error('--scope requires explicit local-directory validation');
  const callerScope = requestedLocal ? normalizeLocalScope(JSON.parse(valueFor('--scope'))) : undefined;
  const repositoryRoot = canonicalRoot(valueFor('--repo-root'));
  const artifactRoot = canonicalRoot(valueFor('--artifact-root'));
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  check(/^\.agents\/reviews\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative), 'artifact-root', 'review root must be repository-owned');
  const state = readJsonNoFollow(artifactRoot, 'state.json');
  assertJsonSchema(state, schema('state'), 'Review Pro state');
  check(!(state.mode === 'fast' && state.decision === 'SAFE_TO_MERGE'), 'fast-verdict-cap', 'fast review cannot certify deep readiness or emit SAFE_TO_MERGE');
  check(state.repository_root === repositoryRoot && state.artifact_root === artifactRoot, 'state-roots', 'state roots must match canonical inputs');
  const intake = readJsonNoFollow(artifactRoot, 'intake.json');
  check(['committed-range', 'working-tree', 'initial-working-tree', 'local-directory'].includes(intake.comparison), 'intake-comparison', 'intake must declare a supported comparison');
  const comparison = comparisonOf(state.target, intake.comparison);
  const local = comparison === 'local-directory';
  if (local !== requestedLocal) throw new Error('local-directory validation requires explicit caller --local authorization and cannot reinterpret a Git review');
  if (local) {
    check(JSON.stringify(intake.local_scope) === JSON.stringify(normalizeLocalScope(intake.local_scope)), 'local-scope', 'saved local scope must be canonical');
    if (JSON.stringify(callerScope) !== JSON.stringify(intake.local_scope)) {
      throw new Error('caller scope must match the saved local scope before source recapture');
    }
  }
  check(comparison === intake.comparison, 'intake-binding', 'comparison must match intake');
  check(sameScope(state.target, intake), 'intake-binding', 'local scope must match intake');
  check(!(comparison !== 'committed-range' && state.decision === 'SAFE_TO_MERGE'), 'local-verdict-cap', 'local source review cannot certify PR, CI, or merge readiness');
  for (const field of ['repository_identity', 'base_sha', 'reviewed_head_sha', 'diff_digest', 'workspace_digest']) check(state.target[field] === intake[field], 'intake-binding', `${field} must match intake`);
  check(JSON.stringify(state.target.changed_files) === JSON.stringify(intake.changed_files), 'changed-files', 'state changed files must match intake');
  check(JSON.stringify(state.target.workspace_changed_files) === JSON.stringify(intake.workspace_changed_files), 'workspace-files', 'state workspace paths must match intake');
  const fresh = captureReviewSource({ repositoryRoot, artifactRoot, base: intake.base_sha, head: intake.reviewed_head_sha,
    working: !local && intake.comparison !== 'committed-range', local, localScope: callerScope, write: false });
  check(fresh.repository_identity === intake.repository_identity && sameScope(fresh, intake), 'source-binding', 'source identity and local scope must remain unchanged during recapture');
  for (const field of ['comparison', 'base_sha', 'reviewed_head_sha']) check(fresh[field] === intake[field], 'source-binding', `${field} must remain unchanged during source recapture`);
  check(fresh.evidence_gaps.every(gap => state.evidence_caps.includes(gap)), 'source-coverage', 'unhashed content and other source-coverage gaps must remain explicit evidence caps, not verified content');
  check(fresh.diff_digest === state.target.diff_digest, 'source-freshness', 'reviewed diff must remain unchanged outside artifact_root');
  check(JSON.stringify(fresh.changed_files) === JSON.stringify(state.target.changed_files), 'source-paths', 'reviewed changed paths must remain unchanged');
  check(fresh.workspace_digest === state.target.workspace_digest, 'workspace-freshness', 'working tree changed outside artifact_root during review');
  check(JSON.stringify(fresh.workspace_changed_files) === JSON.stringify(state.target.workspace_changed_files), 'workspace-paths', 'working-tree paths changed outside artifact_root during review');
  if (!local) check(currentHead(repositoryRoot) === state.target.reviewed_head_sha, 'head-freshness', 'current HEAD or its verified absence must match reviewed head');
  const expectedDigests = {
    command_digest: digestFile(path.join(harnessRoot, 'commands', 'review-pro.md')),
    core_skill_digest: digestFile(path.join(harnessRoot, 'skills', 'review-core', 'SKILL.md')),
    routing_digest: digestFile(path.join(harnessRoot, 'commands', 'review-pro', 'routing.md')),
    policy_digest: digestFile(path.join(harnessRoot, 'config', 'review-pro.json')),
  };
  for (const [field, digest] of Object.entries(expectedDigests)) check(state.loaded_contract[field] === digest, 'contract-freshness', `${field} must match the installed contract`);

  const evidenceById = new Map();
  for (const relativePath of directJsonFiles(artifactRoot, 'evidence')) {
    const evidence = readJsonNoFollow(artifactRoot, relativePath);
    assertJsonSchema(evidence, schema('evidence'), `Review Pro evidence ${relativePath}`);
    check(evidence.content_digest === contentDigest(evidence), 'evidence-digest', `${relativePath} content digest must be valid`);
    check(relativePath === `evidence/${evidence.id}.json`, 'evidence-path', `${evidence.id} must use its canonical evidence filename`);
    check(!evidenceById.has(evidence.id), 'evidence-id', `${evidence.id} must be unique`);
    check(evidence.repository_identity === state.target.repository_identity && evidence.base_sha === state.target.base_sha && evidence.reviewed_head_sha === state.target.reviewed_head_sha && evidence.diff_digest === state.target.diff_digest, 'evidence-binding', `${evidence.id} must bind the active review target`);
    check(comparisonOf(evidence, comparison) === comparison, 'evidence-binding', `${evidence.id} must bind the active comparison`);
    check(sameScope(evidence, state.target), 'evidence-binding', `${evidence.id} must bind the active local scope`);
    check(!hasSensitiveContent(evidence) && !hasDirectiveContent(evidence), 'evidence-safety', `${evidence.id} must not contain sensitive or directive-shaped content`);
    if (evidence.artifact_path === null) check(evidence.artifact_digest === null, 'evidence-artifact', `${evidence.id} null artifact path requires a null digest`);
    else check(evidence.artifact_digest === digestFile(containedPath(artifactRoot, evidence.artifact_path, { expectedType: 'file' })), 'evidence-artifact', `${evidence.id} artifact digest must match its contained file`);
    evidenceById.set(evidence.id, evidence);
  }

  const laneReports = [];
  const lanesById = new Map(policy.lanes.map((lane) => [lane.id, lane]));
  for (const relativePath of directJsonFiles(artifactRoot, 'lanes')) {
    const report = readJsonNoFollow(artifactRoot, relativePath);
    assertJsonSchema(report, schema('lane-report'), `Review Pro lane ${relativePath}`);
    const expectedLane = lanesById.get(report.lane_id);
    check(Boolean(expectedLane), 'lane-id', `${report.lane_id} must exist in Review Pro policy`);
    if (expectedLane) check(report.agent === expectedLane.agent && report.profile === expectedLane.profile, 'lane-routing', `${report.lane_id} agent and profile must match policy`);
    check(report.repository_identity === state.target.repository_identity && report.base_sha === state.target.base_sha && report.reviewed_head_sha === state.target.reviewed_head_sha && report.diff_digest === state.target.diff_digest, 'lane-binding', `${report.lane_id} must bind the active review target`);
    check(comparisonOf(report, comparison) === comparison, 'lane-binding', `${report.lane_id} must bind the active comparison`);
    check(sameScope(report, state.target), 'lane-binding', `${report.lane_id} must bind the active local scope`);
    check(report.content_digest === contentDigest(report), 'lane-digest', `${report.lane_id} content digest must be valid`);
    check(report.evidence_ids.every((id) => evidenceById.has(id)), 'lane-evidence', `${report.lane_id} references missing evidence`);
    check(!hasSensitiveContent(report) && !hasDirectiveContent(report), 'lane-safety', `${report.lane_id} must not contain sensitive or directive-shaped content`);
    laneReports.push(report);
  }

  let findingsById = new Map();
  if (state.findings.path) {
    const findings = readJsonNoFollow(artifactRoot, state.findings.path);
    assertJsonSchema(findings, schema('findings'), 'Review Pro findings');
    check(findings.content_digest === contentDigest(findings), 'findings-digest', 'findings content digest must be valid');
    check(state.findings.digest === digestFile(containedPath(artifactRoot, state.findings.path, { expectedType: 'file' })), 'findings-file-digest', 'state findings digest must match file');
    check(findings.repository_identity === state.target.repository_identity && findings.base_sha === state.target.base_sha && findings.reviewed_head_sha === state.target.reviewed_head_sha && findings.diff_digest === state.target.diff_digest && comparisonOf(findings, comparison) === comparison, 'findings-binding', 'findings must bind review target and comparison');
    check(sameScope(findings, state.target), 'findings-binding', 'findings must bind the active local scope');
    findingsById = new Map(findings.records.map((finding) => [finding.finding_id, finding]));
    check(findingsById.size === findings.records.length && state.findings.count === findings.records.length, 'finding-count', 'finding identifiers and count must be unique and current');
    for (const finding of findings.records) {
      check(finding.content_digest === contentDigest(finding), 'finding-digest', `${finding.finding_id} digest must be valid`);
      check(finding.repository_identity === state.target.repository_identity && finding.base_sha === state.target.base_sha && finding.reviewed_head_sha === state.target.reviewed_head_sha && finding.diff_digest === state.target.diff_digest, 'finding-binding', `${finding.finding_id} must bind the active review target`);
      check(comparisonOf(finding, comparison) === comparison, 'finding-binding', `${finding.finding_id} must bind the active comparison`);
      check(sameScope(finding, state.target), 'finding-binding', `${finding.finding_id} must bind the active local scope`);
      check(finding.changed_paths.every((relativePath) => state.target.changed_files.includes(relativePath)), 'finding-paths', `${finding.finding_id} changed paths must exist in the reviewed diff`);
      check(finding.evidence_ids.every((id) => evidenceById.has(id)), 'finding-evidence', `${finding.finding_id} references missing evidence`);
      check(!(finding.verification_status === 'REFUTED' && finding.requires_correction), 'finding-status', `${finding.finding_id} refuted finding cannot require correction`);
      check(!(['CONFIRMED', 'REPRODUCED'].includes(finding.verification_status) && finding.reachability === 'unverified'), 'finding-reachability', `${finding.finding_id} confirmed finding requires verified reachability`);
      check(!(['CRITICAL', 'HIGH'].includes(finding.severity) && ['CONFIRMED', 'REPRODUCED'].includes(finding.verification_status) && finding.confidence < policy.high_severity_minimum_confidence), 'finding-confidence', `${finding.finding_id} high severity lacks minimum confidence`);
    }
    check(!hasSensitiveContent(findings) && !hasDirectiveContent(findings), 'findings-safety', 'findings must not contain sensitive or directive-shaped content');
  }

  if (state.production_risks.path) {
    const risks = readJsonNoFollow(artifactRoot, state.production_risks.path);
    assertJsonSchema(risks, schema('production-risks'), 'Review Pro production risks');
    check(risks.content_digest === contentDigest(risks), 'risks-digest', 'production risks content digest must be valid');
    check(state.production_risks.digest === digestFile(containedPath(artifactRoot, state.production_risks.path, { expectedType: 'file' })), 'risks-file-digest', 'state production risks digest must match file');
    check(risks.repository_identity === state.target.repository_identity && risks.reviewed_head_sha === state.target.reviewed_head_sha, 'risks-binding', 'production risks must bind the active review target');
    check(comparisonOf(risks, comparison) === comparison, 'risks-binding', 'production risks must bind the active comparison');
    check(sameScope(risks, state.target), 'risks-binding', 'production risks must bind the active local scope');
    check(risks.findings_digest === state.findings.digest, 'risks-findings', 'production risks must bind the authenticated findings file');
    check(risks.slots.every((slot, index) => slot.rank === index + 1), 'risk-ranks', 'risk slots must be ranked 1 through 5 in order');
    const used = new Set();
    for (const slot of risks.slots) {
      if (slot.finding_id === null) check(slot.evidence_status === 'NO_ADDITIONAL_EVIDENCE_BACKED_RISK' && slot.confidence === 0, 'risk-filler', `unused slot ${slot.rank} must be explicit and zero-confidence`);
      else {
        const finding = findingsById.get(slot.finding_id);
        check(Boolean(finding), 'risk-finding', `slot ${slot.rank} references an unknown finding`);
        check(!used.has(slot.finding_id), 'risk-duplicate', `${slot.finding_id} appears more than once`);
        used.add(slot.finding_id);
        if (finding) {
          check(slot.evidence_status === finding.verification_status, 'risk-status', `${slot.finding_id} status differs from authenticated finding`);
          check(slot.confidence === finding.confidence, 'risk-confidence', `${slot.finding_id} confidence differs from authenticated finding`);
        }
      }
    }
    check(state.production_risks.count === risks.slots.length, 'risk-count', 'state production risk count must match slots');
  }

  for (const report of laneReports) check(report.finding_ids.every((id) => findingsById.has(id)), 'lane-findings', `${report.lane_id} references an unknown finding`);

  for (const [relativePath, expected] of Object.entries(state.outputs)) check(digestFile(containedPath(artifactRoot, relativePath, { expectedType: 'file' })) === expected, 'output-digest', `${relativePath} digest must match state`);
  const tracePath = path.join(artifactRoot, 'run-events.jsonl');
  check(fs.existsSync(tracePath) && fs.lstatSync(tracePath).isFile() && !fs.lstatSync(tracePath).isSymbolicLink(), 'workflow-trace', 'run-events.jsonl must be a regular file');

  if (requireComplete) {
    for (const phase of contract.modes[state.mode]) check(['passed', 'skipped'].includes(state.phases[String(phase)]), 'phase-complete', `phase ${phase} must be passed or explicitly skipped`);
    for (const output of policy.required_outputs[state.mode]) check(state.outputs[output] !== undefined, 'required-output', `${output} must be digest-bound in state for ${state.mode} mode`);
    check(state.findings.path === 'findings.json' && state.findings.digest === state.outputs['findings.json'], 'findings-index', 'completed reports must bind the authenticated findings index');
    check(state.production_risks.path === 'production-risks.json' && state.production_risks.digest === state.outputs['production-risks.json'], 'risks-index', 'completed reports must bind the authenticated production-risk index');
    check(state.decision !== 'REVIEW_INCOMPLETE', 'decision', 'completed run needs a final decision');
    check(state.production_risks.count === 5, 'risk-complete', 'completed run needs exactly five production-risk slots');
  }

  console.log(JSON.stringify({ status: errors.length ? 'error' : 'success', summary: errors.length ? `${errors.length} Review Pro run checks failed` : 'Review Pro run is valid', verification, errors, artifacts: ['state.json', 'intake.json', 'run-events.jsonl'], next_actions: errors.length ? ['Repair stale or invalid review artifacts without changing reviewed source.'] : ['Continue the active phase or run the completion hook.'] }, null, 2));
  if (errors.length) process.exit(1);
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, verification, errors, artifacts: [], next_actions: ['Provide a contained repository-owned Review Pro run and retry.'] }, null, 2));
  process.exit(1);
}
