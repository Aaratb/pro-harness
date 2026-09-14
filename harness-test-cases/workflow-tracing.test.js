'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');
const writer = path.join(HARNESS_ROOT, 'scripts', 'record-workflow-event.mjs');
const validator = path.join(HARNESS_ROOT, 'scripts', 'validate-workflow-trace.mjs');

function record(root, event, extra = []) {
  return JSON.parse(childProcess.execFileSync(process.execPath, [
    writer, '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'feature-run-1',
    '--event', event, '--summary', `${event} evidence`, ...extra,
  ], { encoding: 'utf8' }));
}

test('workflow tracing appends private schema-valid phase evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-trace-'));
  try {
    record(root, 'run-started', ['--status', 'in-progress']);
    record(root, 'phase-started', ['--phase', '1', '--actor', 'implementation-planner']);
    fs.writeFileSync(path.join(root, 'requirements.md'), '# Requirements\n');
    record(root, 'phase-completed', ['--phase', '1', '--status', 'passed', '--artifact', 'requirements.md', '--duration-ms', '12']);

    const checked = JSON.parse(childProcess.execFileSync(process.execPath, [validator, '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'feature-run-1'], { encoding: 'utf8' }));
    assert.equal(checked.status, 'success');
    assert.match(checked.summary, /3 event\(s\)/);
    const trace = path.join(root, 'run-events.jsonl');
    assert.equal(fs.statSync(trace).mode & 0o077, 0);
    const rows = fs.readFileSync(trace, 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(rows.map(({ event }) => event), ['run-started', 'phase-started', 'phase-completed']);
    assert.equal(rows[2].artifacts[0], 'requirements.md');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('workflow tracing rejects path traversal and sensitive summaries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-trace-reject-'));
  try {
    const traversal = childProcess.spawnSync(process.execPath, [
      writer, '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'feature-run-1',
      '--event', 'run-started', '--summary', 'starting', '--artifact', '../escape.txt',
    ], { encoding: 'utf8' });
    assert.notEqual(traversal.status, 0);
    assert.equal(fs.existsSync(path.join(root, 'run-events.jsonl')), false);

    const sensitive = childProcess.spawnSync(process.execPath, [
      writer, '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'feature-run-1',
      '--event', 'run-started', '--summary', 'authorization: do-not-record-this-value',
    ], { encoding: 'utf8' });
    assert.notEqual(sensitive.status, 0);
    assert.match(sensitive.stdout, /appears to contain secrets/);
    assert.doesNotMatch(sensitive.stdout, /do-not-record-this-value/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('workflow trace validator rejects impossible phase completion sequence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-trace-sequence-'));
  try {
    record(root, 'run-started');
    // Historical corruption must still be diagnosed, even though the writer now refuses it.
    const trace = path.join(root, 'run-events.jsonl');
    const row = JSON.parse(fs.readFileSync(trace, 'utf8'));
    fs.appendFileSync(trace, `${JSON.stringify({ ...row, event_id: require('node:crypto').randomUUID(), event: 'phase-completed', phase: 2, status: 'passed' })}\n`);
    const result = childProcess.spawnSync(process.execPath, [validator, '--artifact-root', root], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /phase 2 completed without a start event/);
    assert.deepEqual(JSON.parse(result.stdout).verification, { schema: 'pass', sequence: 'fail', privacy: 'pass' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writer exposes the exact schema vocabulary without starting a workflow', () => {
  const result = childProcess.spawnSync(process.execPath, [writer, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const schema = require('../schemas/workflow-event/workflow-event.schema.json');
  for (const value of [...schema.properties.event.enum, ...schema.properties.status.enum]) assert.ok(result.stdout.includes(value));
});

test('shared trace validation respects string, date-time and artifact schema constraints', async () => {
  const { validateTrace } = await import('../scripts/lib/workflow-trace.mjs');
  const row = { schema_version: 'pro-harness/workflow-event@1', event_id: require('node:crypto').randomUUID(), run_id: 'test', workflow: 'feature-pro', event: 'run-started', status: 'in-progress', occurred_at: new Date().toISOString(), summary: 'safe', artifacts: [] };
  for (const change of [{ run_id: 123 }, { occurred_at: 2026 }, { occurred_at: '2026' }, { artifacts: ['a', 'a'] }, { artifacts: ['a'.repeat(513)] }]) {
    assert.equal(validateTrace(JSON.stringify({ ...row, ...change })).verification.schema, 'fail');
  }
});

test('writer rejects invalid lifecycle events before changing the trace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-trace-preflight-'));
  const invoke = (event, extra = []) => childProcess.spawnSync(process.execPath, [writer, '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'feature-run-1', '--event', event, '--summary', 'safe evidence', ...extra], { encoding: 'utf8' });
  const trace = path.join(root, 'run-events.jsonl');
  try {
    assert.notEqual(invoke('phase-completed', ['--phase', '1']).status, 0);
    assert.equal(fs.existsSync(trace), false);
    record(root, 'run-started');
    const before = fs.readFileSync(trace, 'utf8');
    for (const [event, extra] of [
      ['phase-completed', ['--phase', '1']], ['phase-started', []], ['run-started', []],
      ['workflow-started', []], ['skill-skipped', []], ['skill-completed', ['--status', 'started']],
    ]) {
      assert.notEqual(invoke(event, extra).status, 0, event);
      assert.equal(fs.readFileSync(trace, 'utf8'), before, event);
    }
    record(root, 'phase-started', ['--phase', '1']);
    record(root, 'skill-completed', ['--phase', '1', '--status', 'skipped']);
    record(root, 'phase-completed', ['--phase', '1', '--status', 'passed']);
    assert.notEqual(invoke('phase-completed', ['--phase', '1']).status, 0);
    record(root, 'run-completed', ['--status', 'passed']);
    const completed = fs.readFileSync(trace, 'utf8');
    assert.notEqual(invoke('run-resumed').status, 0);
    assert.equal(fs.readFileSync(trace, 'utf8'), completed);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('writer preserves oversized history and refuses busy or symlinked targets', async () => {
  const { MAX_TRACE_BYTES } = await import('../scripts/lib/workflow-trace.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-trace-safety-'));
  const trace = path.join(root, 'run-events.jsonl');
  const invoke = () => childProcess.spawnSync(process.execPath, [writer, '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'feature-run-1', '--event', 'run-resumed', '--summary', 'resuming'], { encoding: 'utf8', timeout: 3000 });
  try {
    record(root, 'run-started');
    const first = fs.readFileSync(trace, 'utf8');
    fs.writeFileSync(path.join(root, '.run-events.lock'), 'another writer');
    assert.notEqual(invoke().status, 0);
    assert.equal(fs.readFileSync(trace, 'utf8'), first);
    assert.equal(fs.readFileSync(path.join(root, '.run-events.lock'), 'utf8'), 'another writer');
    fs.unlinkSync(path.join(root, '.run-events.lock'));
    const padded = first.trimEnd() + ' '.repeat(MAX_TRACE_BYTES - Buffer.byteLength(first));
    fs.writeFileSync(trace, padded + '\n');
    const limit = invoke();
    assert.notEqual(limit.status, 0);
    assert.match(limit.stdout, /trace size limit/);
    assert.equal(fs.statSync(trace).size, MAX_TRACE_BYTES);
    fs.renameSync(trace, path.join(root, 'preserved.jsonl'));
    fs.symlinkSync(path.join(root, 'preserved.jsonl'), trace);
    assert.notEqual(invoke().status, 0);
    assert.equal(fs.statSync(path.join(root, 'preserved.jsonl')).size, MAX_TRACE_BYTES);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
