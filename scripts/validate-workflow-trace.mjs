#!/usr/bin/env node

import path from 'node:path';
import { canonicalRoot } from './lib/repository-paths.mjs';
import { validateTrace } from './lib/workflow-trace.mjs';
import { readTraceBundle } from './lib/workflow-trace-storage.mjs';

const args = process.argv.slice(2);
const knownFlags = new Set(['--artifact-root', '--workflow', '--run-id']);
for (let index = 0; index < args.length; index += 2) {
  if (!knownFlags.has(args[index]) || args[index + 1] === undefined || args[index + 1].startsWith('--')) {
    console.log(JSON.stringify({ status: 'error', summary: `invalid or incomplete argument at position ${index + 1}`, artifacts: [], next_actions: ['Use the documented flag/value pairs and retry.'] }, null, 2));
    process.exit(1);
  }
}
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
try {
  const artifactRootInput = valueFor('--artifact-root');
  const expectedWorkflow = valueFor('--workflow');
  const expectedRunId = valueFor('--run-id');
  if (!artifactRootInput) throw new Error('usage: validate-workflow-trace.mjs --artifact-root <path> [--workflow <workflow>] [--run-id <id>]; see record-workflow-event.mjs --help for supported workflows');
  const artifactRoot = canonicalRoot(artifactRootInput);
  const bundle = readTraceBundle(artifactRoot, {expectedWorkflow,expectedRunId});
  const tracePath = path.join(artifactRoot, bundle.activeName);
  const { errors, verification, eventCount } = validateTrace(bundle.content, { expectedWorkflow, expectedRunId });
  const result = errors.length === 0
    ? { status: 'success', summary: `workflow trace valid: ${eventCount} event(s)`, verification, artifacts: [tracePath], next_actions: ['Use this trace as execution evidence; verify product telemetry separately.'] }
    : { status: 'error', summary: `${errors.length} workflow trace validation error(s)`, verification, errors, artifacts: [tracePath], next_actions: ['Preserve history and mark tracing degraded; do not invent or backfill start events.'] };
  if (bundle.recovery) {
    result.trace_status = errors.length ? 'degraded' : 'recovered-with-gaps';
    result.history = bundle.history;
    result.artifacts.push(path.join(artifactRoot,'run-events.jsonl'),path.join(artifactRoot,'trace-recovery.json'),path.join(artifactRoot,bundle.recovery.checkpoint));
    result.next_actions = ['Historical gaps remain explicit. This result concerns continuation tracing only; independently verify all product and approval gates.'];
  }
  console.log(JSON.stringify(result, null, 2));
  if (errors.length > 0) process.exit(1);
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Provide a valid caller-supplied artifact_root containing run-events.jsonl.'] }, null, 2));
  process.exit(1);
}
