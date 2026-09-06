import fs from 'node:fs';
import { assertRelativePath } from './repository-paths.mjs';

export const schema = JSON.parse(fs.readFileSync(new URL('../../schemas/workflow-event/workflow-event.schema.json', import.meta.url), 'utf8'));
export const MAX_TRACE_BYTES = 8 * 1024 * 1024;
const events = new Set(schema.properties.event.enum);
const statuses = new Set(schema.properties.status.enum);
const workflows = new Set(schema.properties.workflow.enum);
const allowedKeys = new Set(Object.keys(schema.properties));
const sensitive = [
  /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization)\b\s*[:=]/i,
  /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{12,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:chain[- ]of[- ]thought|hidden reasoning|raw prompt|tool payload)\b/i,
];

// One validation contract for the append writer and the read-only CLI.
export function validateTrace(content, { expectedWorkflow, expectedRunId } = {}) {
  const errors = [];
  let domain = 'schema';
  const issue = (line, message, category = domain) => errors.push({ line, message, domain: category });
  const lines = content.split('\n').filter((line) => line.length > 0);
  if (lines.length === 0) issue(0, 'trace is empty');
  const seenIds = new Set();
  const startedPhases = new Set();
  const phaseEvents = new Set(['phase-started', 'phase-completed', 'phase-skipped', 'phase-blocked', 'phase-waived']);
  let runStarted = false;
  let runCompleted = false;
  let traceWorkflow;
  let traceRunId;
  let previousTimestamp = 0;

  for (const [index, line] of lines.entries()) {
    domain = 'schema';
    const lineNumber = index + 1;
    let record;
    try { record = JSON.parse(line); } catch { issue(lineNumber, 'invalid JSON'); continue; }
    if (!record || typeof record !== 'object' || Array.isArray(record)) { issue(lineNumber, 'event must be an object'); continue; }
    for (const key of Object.keys(record)) if (!allowedKeys.has(key)) issue(lineNumber, `unknown property ${key}`);
    for (const key of ['schema_version', 'event_id', 'run_id', 'workflow', 'event', 'status', 'occurred_at', 'summary', 'artifacts']) if (!Object.hasOwn(record, key)) issue(lineNumber, `missing ${key}`);
    if (record.schema_version !== schema.properties.schema_version.const) issue(lineNumber, 'invalid schema_version');
    if (typeof record.event_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.event_id)) issue(lineNumber, 'invalid event_id');
    if (seenIds.has(record.event_id)) issue(lineNumber, 'duplicate event_id'); else seenIds.add(record.event_id);
    if (typeof record.run_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(record.run_id)) issue(lineNumber, 'invalid run_id');
    if (!workflows.has(record.workflow)) issue(lineNumber, 'invalid workflow');
    if (!events.has(record.event)) issue(lineNumber, 'invalid event');
    if (!statuses.has(record.status)) issue(lineNumber, 'invalid status');
    if (typeof record.occurred_at !== 'string' || !/^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/.test(record.occurred_at) || Number.isNaN(Date.parse(record.occurred_at))) issue(lineNumber, 'invalid occurred_at');
    if (typeof record.summary !== 'string' || record.summary.length < 1 || record.summary.length > 500) issue(lineNumber, 'invalid summary');
    const privacyInputs = [line, JSON.stringify(record), ...Object.values(record).flat().filter(value => typeof value === 'string')];
    if (sensitive.some(pattern => privacyInputs.some(value => pattern.test(value)))) issue(lineNumber, 'possible secret, raw prompt, hidden reasoning, or tool payload', 'privacy');
    if (!Array.isArray(record.artifacts)) issue(lineNumber, 'artifacts must be an array');
    else {
      if (new Set(record.artifacts).size !== record.artifacts.length) issue(lineNumber, 'duplicate artifacts');
      for (const artifact of record.artifacts) {
        if (typeof artifact !== 'string' || [...artifact].length > 512) issue(lineNumber, 'invalid artifact length/type');
        try { assertRelativePath(artifact); } catch (error) { issue(lineNumber, `invalid artifact path: ${error.message}`); }
      }
    }
    if (record.phase !== undefined && (!Number.isInteger(record.phase) || record.phase < 1 || record.phase > 99)) issue(lineNumber, 'invalid phase');
    if (phaseEvents.has(record.event) && !Number.isInteger(record.phase)) issue(lineNumber, `${record.event} requires phase`);
    if (record.actor !== undefined && (typeof record.actor !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(record.actor))) issue(lineNumber, 'invalid actor');
    if (record.duration_ms !== undefined && (!Number.isInteger(record.duration_ms) || record.duration_ms < 0)) issue(lineNumber, 'invalid duration_ms');
    domain = 'sequence';
    if (expectedWorkflow && record.workflow !== expectedWorkflow) issue(lineNumber, `workflow differs from ${expectedWorkflow}`);
    if (expectedRunId && record.run_id !== expectedRunId) issue(lineNumber, `run_id differs from ${expectedRunId}`);
    traceWorkflow ??= record.workflow;
    traceRunId ??= record.run_id;
    if (record.workflow !== traceWorkflow) issue(lineNumber, `workflow differs from first event ${traceWorkflow}`);
    if (record.run_id !== traceRunId) issue(lineNumber, `run_id differs from first event ${traceRunId}`);
    const timestamp = Date.parse(record.occurred_at ?? '');
    if (!Number.isNaN(timestamp) && timestamp < previousTimestamp) issue(lineNumber, 'occurred_at moves backwards');
    if (!Number.isNaN(timestamp)) previousTimestamp = timestamp;
    if (record.event === 'run-started') {
      if (runStarted) issue(lineNumber, 'duplicate run start; use run-resumed');
      runStarted = true;
    } else if (!runStarted) issue(lineNumber, 'event occurs before run-started');
    if (record.event === 'run-resumed' && !runStarted) issue(lineNumber, 'run resumed without an earlier start event');
    if (record.event === 'phase-started') {
      if (startedPhases.has(record.phase)) issue(lineNumber, `phase ${record.phase} already started`);
      startedPhases.add(record.phase);
    }
    if (record.event === 'phase-completed' && !startedPhases.has(record.phase)) issue(lineNumber, `phase ${record.phase} completed without a start event`);
    if (['phase-completed', 'phase-skipped', 'phase-waived'].includes(record.event)) startedPhases.delete(record.phase);
    if (record.event === 'run-completed') { if (!runStarted) issue(lineNumber, 'run completed without a start event'); runCompleted = true; }
    if (runCompleted && index < lines.length - 1) issue(lineNumber + 1, 'events occur after run completion');
  }

  const verification = Object.fromEntries(['schema', 'sequence', 'privacy'].map(key => [key, errors.some(error => error.domain === key) ? 'fail' : 'pass']));
  return { errors, verification, eventCount: lines.length };
}
