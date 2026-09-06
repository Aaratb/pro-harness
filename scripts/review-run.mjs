#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { captureReviewSource } from './review-source.mjs';
import { digestFile } from './lib/digests.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { canonicalRoot, ensureContainedDirectory } from './lib/repository-paths.mjs';
import { atomicWriteJson } from './lib/review-safety.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'review-pro.json'), 'utf8'));
const schema = (name) => path.join(harnessRoot, 'schemas', 'review-pro', `${name}.schema.json`);

function parseArguments(argv) {
  const operation = argv.shift();
  const values = new Map();
  const booleans = new Set(['--working', '--local', '--comment', '--mutation', '--load', '--network']);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith('--')) throw new Error(`unexpected argument ${flag}`);
    if (booleans.has(flag)) { values.set(flag, true); continue; }
    if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
    values.set(flag, argv[index + 1]); index += 1;
  }
  return { operation, value: (flag) => values.get(flag), has: (flag) => values.has(flag) };
}

function contractDigests() {
  return {
    command_digest: digestFile(path.join(harnessRoot, 'commands', 'review-pro.md')),
    core_skill_digest: digestFile(path.join(harnessRoot, 'skills', 'review-core', 'SKILL.md')),
    routing_digest: digestFile(path.join(harnessRoot, 'commands', 'review-pro', 'routing.md')),
    policy_digest: digestFile(path.join(harnessRoot, 'config', 'review-pro.json')),
    loaded_at: new Date().toISOString(),
  };
}

function initialize(args) {
  const repositoryRoot = canonicalRoot(args.value('--repo-root'));
  const artifactRoot = canonicalRoot(args.value('--artifact-root'));
  const statePath = path.join(artifactRoot, 'state.json');
  if (fs.existsSync(statePath)) throw new Error('state.json already exists; resume or choose a different review slug');
  const mode = String(args.value('--mode') ?? 'deep').toLowerCase();
  if (!policy.allowed_modes.includes(mode)) throw new Error(`mode must be one of ${policy.allowed_modes.join(', ')}`);
  if (args.has('--local') && args.has('--head')) throw new Error('local directory review cannot specify --head');
  for (const directory of ['lanes', 'evidence', 'findings', 'debug-handoffs', 'quarantine']) ensureContainedDirectory(artifactRoot, directory);
  const intake = captureReviewSource({
    repositoryRoot, artifactRoot, base: args.value('--base'), head: args.value('--head') ?? 'HEAD', working: args.has('--working'), write: true,
    local: args.has('--local'), localScope: args.has('--scope') ? JSON.parse(args.value('--scope')) : undefined,
  });
  const phases = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 1), index === 0 ? 'passed' : index === 1 ? 'in_progress' : 'pending']));
  const state = {
    schema_version: 'review-pro/state@1',
    run_id: `review-${crypto.randomUUID()}`,
    slug: path.basename(artifactRoot),
    mode,
    repository_root: repositoryRoot,
    artifact_root: artifactRoot,
    target: {
      repository_identity: intake.repository_identity,
      comparison: intake.comparison,
      ...(intake.comparison === 'local-directory' ? { local_scope: intake.local_scope } : {}),
      base_sha: intake.base_sha,
      reviewed_head_sha: intake.reviewed_head_sha,
      diff_digest: intake.diff_digest,
      changed_files: intake.changed_files,
      workspace_digest: intake.workspace_digest,
      workspace_changed_files: intake.workspace_changed_files,
      captured_at: intake.captured_at,
      stale: false,
    },
    current_phase: 2,
    phases,
    lanes: { triggered: [], completed: [], blocked: [] },
    evidence_caps: [...intake.evidence_gaps, ...(intake.comparison === 'committed-range' ? [] : ['Local source review only; pull-request, CI, and merge readiness are not certified.']),
      ...(intake.comparison === 'local-directory' ? ['Only the explicitly selected local scope was captured; unselected project contents were not reviewed.'] : [])],
    findings: { path: null, digest: null, count: 0 },
    production_risks: { path: null, digest: null, count: 0 },
    outputs: {},
    transport: { comment: args.has('--comment'), mutation: args.has('--mutation'), load: args.has('--load'), network: args.has('--network') },
    workflow_trace: { status: 'pending', path: 'run-events.jsonl' },
    loaded_contract: contractDigests(),
    decision: 'REVIEW_INCOMPLETE',
  };
  assertJsonSchema(state, schema('state'), 'Review Pro state');
  atomicWriteJson(artifactRoot, 'state.json', state);
  execFileSync(process.execPath, [
    path.join(harnessRoot, 'scripts', 'record-workflow-event.mjs'), '--artifact-root', artifactRoot,
    '--workflow', 'review-pro', '--run-id', state.run_id, '--event', 'run-started', '--status', 'in-progress',
    '--phase', '1', '--summary', 'Review Pro initialized with repository-bound intake evidence.', '--artifact', 'intake.json', '--artifact', 'state.json',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  return { state, intake };
}

try {
  const args = parseArguments(process.argv.slice(2));
  if (args.operation !== 'init' || !args.value('--repo-root') || !args.value('--artifact-root')) throw new Error('usage: review-run.mjs init --repo-root <path> --artifact-root <path> [--base <ref>] [--head <ref>] [--working | --local --scope <JSON array>] [--mode deep|fast|reverify] [--comment] [--mutation] [--load] [--network]');
  const result = initialize(args);
  console.log(JSON.stringify({ status: 'success', summary: `initialized Review Pro run ${result.state.run_id}`, artifacts: ['intake.json', 'state.json', 'run-events.jsonl'], next_actions: ['Continue with Phase 2 change intake validation.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Correct the contained artifact root, base/head, or mode and retry with a new review slug.'] }, null, 2));
  process.exit(1);
}
