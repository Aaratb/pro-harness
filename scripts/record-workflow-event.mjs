#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertRelativePath, canonicalRoot } from './lib/repository-paths.mjs';
import { MAX_TRACE_BYTES, schema, validateTrace } from './lib/workflow-trace.mjs';
import { readTraceBundle, withTraceLock } from './lib/workflow-trace-storage.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(JSON.stringify({
    usage: 'record-workflow-event.mjs --artifact-root <path> --workflow <workflow> --run-id <id> --event <event> --summary <redacted text> [--phase <1..99>] [--status <status>] [--actor <canonical-name>] [--artifact <relative-path>] [--duration-ms <integer>]',
    workflows: schema.properties.workflow.enum,
    events: schema.properties.event.enum,
    statuses: schema.properties.status.enum,
    lifecycle: ['run-started / in-progress', 'phase-started --phase 1 / in-progress', 'phase-completed --phase 1 / passed', 'run-completed / passed'],
    skipped_skill: 'skill-completed --status skipped; no skill-skipped event exists',
    writer: 'The coordinator serializes writes. Stop a batch on the first failed append. Never backfill history.',
  }, null, 2));
  process.exit(0);
}
const knownFlags = new Set(['--artifact-root', '--workflow', '--run-id', '--event', '--summary', '--phase', '--actor', '--status', '--artifact', '--duration-ms']);
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
const valuesFor = (flag) => args.flatMap((value, index) => value === flag && args[index + 1] ? [args[index + 1]] : []);
const fail = (message) => {
  console.log(JSON.stringify({ status: 'error', summary: message, artifacts: [], next_actions: ['Correct the event inputs and retry once; if tracing remains unavailable, mark the workflow degraded.'] }, null, 2));
  process.exit(1);
};

const events = new Set(schema.properties.event.enum);
const statuses = new Set(schema.properties.status.enum);
const workflows = new Set(schema.properties.workflow.enum);
const sensitive = [
  /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization)\b\s*[:=]/i,
  /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{12,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:chain[- ]of[- ]thought|hidden reasoning|raw prompt|tool payload)\b/i,
];

try {
  const artifactRootInput = valueFor('--artifact-root');
  const workflow = valueFor('--workflow');
  const runId = valueFor('--run-id');
  const eventName = valueFor('--event');
  const status = valueFor('--status') ?? 'in-progress';
  const summary = valueFor('--summary');
  const phaseInput = valueFor('--phase');
  const actor = valueFor('--actor');
  const durationInput = valueFor('--duration-ms');

  if (!artifactRootInput || !workflow || !runId || !eventName || !summary) {
    throw new Error(`usage: record-workflow-event.mjs --artifact-root <path> --workflow <${[...workflows].join('|')}> --run-id <id> --event <event> --summary <redacted summary> [--phase <number>] [--actor <canonical-agent>] [--status <status>] [--artifact <relative path>] [--duration-ms <number>]`);
  }
  if (!workflows.has(workflow)) throw new Error(`unsupported workflow: ${workflow}`);
  if (!events.has(eventName)) throw new Error(`unsupported event: ${eventName}`);
  if (!statuses.has(status)) throw new Error(`unsupported status: ${status}`);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) throw new Error('run-id has an invalid format');
  if (summary.length > 500) throw new Error('summary must not exceed 500 characters');
  if (sensitive.some((pattern) => pattern.test(summary))) throw new Error('summary appears to contain secrets, raw prompts, hidden reasoning, or tool payloads');
  if (actor && !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(actor)) throw new Error('actor must be a canonical kebab-case name');

  const artifacts = [...new Set(valuesFor('--artifact'))];
  for (const artifact of artifacts) assertRelativePath(artifact);
  const phase = phaseInput === undefined ? undefined : Number(phaseInput);
  if (phase !== undefined && (!Number.isInteger(phase) || phase < 1 || phase > 99)) throw new Error('phase must be an integer from 1 to 99');
  const durationMs = durationInput === undefined ? undefined : Number(durationInput);
  if (durationMs !== undefined && (!Number.isInteger(durationMs) || durationMs < 0)) throw new Error('duration-ms must be a non-negative integer');

  const artifactRoot = canonicalRoot(artifactRootInput);
  const rootIdentity = fs.lstatSync(artifactRoot);
  let tracePath;
  const record = {
    schema_version: schema.properties.schema_version.const,
    event_id: crypto.randomUUID(),
    run_id: runId,
    workflow,
    event: eventName,
    ...(phase === undefined ? {} : { phase }),
    ...(actor ? { actor } : {}),
    status,
    occurred_at: new Date().toISOString(),
    summary,
    artifacts,
    ...(durationMs === undefined ? {} : { duration_ms: durationMs }),
  };

  // A short exclusive lock prevents two coordinator invocations validating the
  // same tail. No polling or automatic deletion of another writer's lock.
  withTraceLock(artifactRoot, () => {
    const bundle = readTraceBundle(artifactRoot, {expectedWorkflow:workflow,expectedRunId:runId,allowMissing:true});
    tracePath = path.join(artifactRoot,bundle.activeName);
    const snapshot = bundle.snapshot;
    const existing = bundle.content;
    if (existing && !existing.endsWith('\n')) throw new Error('trace has an incomplete final line; preserve history and mark tracing degraded');
    const line = `${JSON.stringify(record)}\n`;
    if (Buffer.byteLength(existing + line) > MAX_TRACE_BYTES) throw new Error('trace size limit reached; event not appended; preserve history and mark tracing degraded');
    const { errors } = validateTrace(existing + line, { expectedWorkflow: workflow, expectedRunId: runId });
    if (errors.length) throw new Error(`event not appended: ${errors.map(error => `line ${error.line}: ${error.message}`).join('; ')}`);
    const descriptor = fs.openSync(tracePath, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK | (snapshot ? 0 : fs.constants.O_CREAT | fs.constants.O_EXCL), 0o600);
    try {
      const opened = fs.fstatSync(descriptor);
      const currentRoot = fs.lstatSync(artifactRoot);
      const currentFile = fs.lstatSync(tracePath);
      if (!currentRoot.isDirectory() || currentRoot.isSymbolicLink() || currentRoot.dev !== rootIdentity.dev || currentRoot.ino !== rootIdentity.ino || canonicalRoot(artifactRoot) !== artifactRoot) throw new Error('artifact root changed during append');
      if (!opened.isFile() || currentFile.isSymbolicLink() || currentFile.dev !== opened.dev || currentFile.ino !== opened.ino || (snapshot && (opened.dev !== snapshot.dev || opened.ino !== snapshot.ino || opened.size !== snapshot.size || opened.mtimeMs !== snapshot.mtimeMs || opened.ctimeMs !== snapshot.ctimeMs))) throw new Error('trace changed during append');
      if (bundle.recovery) {
        const currentBundle = readTraceBundle(artifactRoot, {expectedWorkflow:workflow,expectedRunId:runId});
        if (JSON.stringify(currentBundle.recovery) !== JSON.stringify(bundle.recovery) || currentBundle.content !== existing) throw new Error('recovery changed during append');
      }
      fs.fchmodSync(descriptor, 0o600);
      fs.writeFileSync(descriptor, line, 'utf8');
      fs.fsyncSync(descriptor);
    } finally { fs.closeSync(descriptor); }
  });

  console.log(JSON.stringify({
    status: 'success',
    summary: `recorded ${eventName} for ${workflow} run ${runId}`,
    event_id: record.event_id,
    artifacts: [tracePath],
    next_actions: ['Continue the workflow and append the next phase, gate, approval, or completion event.'],
  }, null, 2));
} catch (error) {
  fail(error.message);
}
