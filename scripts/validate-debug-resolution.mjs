#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { currentFileDigest } from './debug-context.mjs';
import { digestInitialWorkingTree } from './review-source.mjs';
import { resolutionArguments, resolutionRepository, resolutionRoot, validateResolutionInput } from './validate-review-resolution.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bare = (value) => value?.replace(/^sha256:/, '') ?? null;

try {
  const options = resolutionArguments(process.argv.slice(2));
  const { result, packet, snapshot } = validateResolutionInput(options, { consumer: 'debug' });
  const repository = resolutionRepository(options['--repo-root'], { local: options['--local'] === true });
  const active = resolutionRoot(repository, options['--repo-root'], options['--artifact-root'], 'debug');
  assertJsonSchema(packet, path.join(harnessRoot, 'schemas/debug-pro/resolution.schema.json'), 'Debug Pro producer');
  assert(packet.debug_run_id === path.basename(active.root), 'debug_run_id must match the explicit run slug');
  assert(result.referenced_evidence.some((entry) => entry.path === active.relative + '/DEBUG_REPORT.md'), 'resolution must reference the Debug report as evidence');
  const allowlist = new Set([...packet.repair.regression_test_paths, ...packet.repair.production_paths, ...packet.repair.data_repair_paths]);
  const baseline = new Map(packet.target.baseline_files.map((entry) => [entry.path, bare(entry.sha256)]));
  assert(baseline.size === packet.target.baseline_files.length, 'duplicate baseline path');
  // Include vanished baseline files: reverting or deleting a user's dirty file is
  // still a change, even when Git no longer reports it in the final diff.
  if (snapshot) {
    const initial = new Map(packet.target.initial_snapshot_entries.map((entry) => [entry.path, entry]));
    const current = new Map(snapshot.entries.map((entry) => [entry.path, entry]));
    for (const file of new Set([...initial.keys(), ...current.keys()])) {
      if (initial.has(file) && current.has(file)
        && digestInitialWorkingTree([initial.get(file)]) === digestInitialWorkingTree([current.get(file)])) continue;
      assert(allowlist.has(file), `changed file is outside the repair scope: ${file}`);
    }
  } else {
    for (const file of new Set([...packet.target.changed_files, ...baseline.keys()])) {
      if (baseline.has(file) && baseline.get(file) === bare(currentFileDigest(repository, file))) continue;
      assert(allowlist.has(file), `changed file is outside the repair scope: ${file}`);
    }
  }
  if (packet.repair.repair_plan_path) containedPath(active.root, packet.repair.repair_plan_path, { expectedType: 'file' });
  const commands = [packet.proof.red, packet.proof.green, packet.proof.original_reproduction, ...packet.proof.broader_checks];
  for (const proof of commands.filter((entry) => entry.argv.length)) {
    const cwd = canonicalRoot(proof.cwd);
    const relative = path.relative(repository, cwd);
    assert(!relative.startsWith('..') && !path.isAbsolute(relative), 'proof CWD escapes the repository');
    if (relative) containedPath(repository, relative, { expectedType: 'directory' });
  }
  if (packet.status === 'RESOLVED') {
    assert(packet.repair.regression_test_paths.length > 0, 'RESOLVED requires permanent regression validation paths');
    for (const file of packet.repair.regression_test_paths) containedPath(repository, file, { expectedType: 'file' });
    const { red, green, original_reproduction: original, broader_checks: checks, failure_story: stories } = packet.proof;
    assert(packet.diagnosis.causal_tier === 'CONFIRMED', 'RESOLVED requires a confirmed causal origin');
    assert(red.argv.length && red.exit_code > 0 && green.exit_code === 0 && same(red.argv, green.argv) && red.cwd === green.cwd, 'RESOLVED requires matching RED and GREEN commands and CWD');
    assert(original.argv.length && original.exit_code === 0, 'RESOLVED requires a passing original reproduction');
    assert(Number.isInteger(red.fresh_pid) && red.fresh_pid > 0 && Number.isInteger(original.fresh_pid) && original.fresh_pid > 0
      && red.fresh_pid !== original.fresh_pid, 'RESOLVED requires a fresh reproduction process distinct from RED');
    assert(checks.filter((entry) => entry.required).every((entry) => entry.argv.length && entry.exit_code === 0), 'RESOLVED has an unverified or failed required broader check');
    for (const [name, story] of Object.entries(stories)) {
      assert(story.applicable ? story.status === 'PASS' && ['observed', 'static'].includes(story.evidence_type)
        : story.status === 'N/A' && story.na_reason?.trim().length && story.evidence_type === 'static', `unsupported failure story: ${name}`);
    }
  } else {
    assert(packet.remaining_risks.length > 0, 'non-resolved outcomes must explain the remaining risk or decision');
  }
  console.log(JSON.stringify({ ...result, summary: 'validated Debug repair packet and recorded completion gates; independent review is still required' }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], reverification_status: 'REVERIFICATION_BLOCKED',
    next_actions: ['Correct the evidence, scope or packet status; this validator never executes proof commands or certifies causality.'] }, null, 2));
  process.exitCode = 1;
}
