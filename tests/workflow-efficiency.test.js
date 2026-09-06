'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const harness = path.resolve(__dirname, '..');
const invoke = (script, args) => spawnSync(process.execPath, [path.join(harness, 'scripts', script), ...args], { encoding: 'utf8', timeout: 10000 });

function fixture(t, workflow) {
  const repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-efficiency-')));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const relative = '.agents/architecture/sample-system';
  const root = path.join(repo, relative);
  fs.mkdirSync(root, { recursive: true });
  const rows = ['phase-completed', 'run-started'].map(event => ({
    schema_version: 'pro-harness/workflow-event@1', event_id: crypto.randomUUID(),
    workflow, run_id: 'run-1', event, status: 'passed',
    occurred_at: '2026-09-05T04:00:00.000Z', summary: 'Observed boundary', artifacts: [],
    ...(event.startsWith('phase-') ? { phase: 1 } : {}),
  }));
  fs.writeFileSync(path.join(root, 'run-events.jsonl'), rows.map(JSON.stringify).join('\n') + '\n');
  fs.writeFileSync(path.join(root, 'checkpoint.md'), '# Checkpoint\nPrior gates remain unproven.\n');
  const args = ['--artifact-root', root, '--workflow', workflow, '--run-id', 'run-1'];
  const recover = () => invoke('recover-workflow-trace.mjs', [...args, '--checkpoint', 'checkpoint.md', '--approval', 'User approved trace-only continuation']);
  return { repo, relative, root, args, recover };
}

for (const workflow of ['architecture-pro', 'review-pro', 'explainer-pro']) {
  test(`${workflow} can recover ordering-only history without rewriting or certifying it`, t => {
    const f = fixture(t, workflow);
    const original = fs.readFileSync(path.join(f.root, 'run-events.jsonl'));
    const result = f.recover();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const checked = JSON.parse(invoke('validate-workflow-trace.mjs', f.args).stdout);
    assert.equal(checked.trace_status, 'recovered-with-gaps');
    assert.equal(checked.history.verification.sequence, 'fail');
    assert.equal(checked.verification.sequence, 'pass');
    assert.deepEqual(fs.readFileSync(path.join(f.root, 'run-events.jsonl')), original);
    assert.equal(invoke('record-workflow-event.mjs', [...f.args, '--event', 'phase-started', '--phase', '2', '--summary', 'Current phase starts']).status, 0);
    assert.equal(invoke('record-workflow-event.mjs', [...f.args, '--event', 'phase-completed', '--phase', '2', '--summary', 'Current phase ends']).status, 0);
    fs.appendFileSync(path.join(f.root, 'checkpoint.md'), 'changed');
    assert.notEqual(invoke('validate-workflow-trace.mjs', f.args).status, 0, 'changed recovery evidence must fail');
  });
}

test('trace recovery scope does not expand to untouched commands or unknown workflows', t => {
  for (const workflow of ['debug-pro', 'outcome-pro', 'other']) {
    const f = fixture(t, workflow);
    assert.notEqual(f.recover().status, 0);
    assert.equal(fs.existsSync(path.join(f.root, 'trace-recovery.json')), false);
  }
});

test('Architecture transition exposes qualified recovery and still blocks unrelated gates', t => {
  const f = fixture(t, 'architecture-pro');
  const state = JSON.parse(fs.readFileSync(path.join(harness, 'commands/architecture-pro/state.example.json')));
  state.run_id = 'run-1';
  state.workflow_trace.status = 'degraded';
  const stateFile = path.join(f.root, 'state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state));
  assert.equal(f.recover().status, 0);
  const args = ['--workflow', 'architecture-pro', '--event', 'before-phase-transition', '--repo-root', f.repo, '--artifact-root', f.relative];
  const result = invoke('run-workflow-hook.mjs', args);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.workflow_trace.trace_status, 'recovered-with-gaps');
  assert.equal(payload.workflow_trace.history.verification.sequence, 'fail');
  state.workflow_trace.status = 'passed';
  fs.writeFileSync(stateFile, JSON.stringify(state));
  assert.notEqual(invoke('run-workflow-hook.mjs', args).status, 0, 'recovered history cannot be claimed clean');
  state.workflow_trace.status = 'degraded';
  state.transition_log.push({ from: 1, to: 9, reason: 'illegal jump' });
  fs.writeFileSync(stateFile, JSON.stringify(state));
  assert.notEqual(invoke('run-workflow-hook.mjs', args).status, 0, 'trace recovery never waives transition rules');
  assert.notEqual(invoke('validate-architecture-pro-run.mjs', ['--repo-root', f.repo, '--artifact-root', f.relative, '--require-complete']).status, 0, 'trace recovery never certifies missing work');
});

test('Explainer completion has one owner for nested course and trace validation', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(harness, 'hooks/registry.json')));
  const hook = registry.hooks.find(hook => hook.id === 'explainer-pro.completion');
  assert.deepEqual(hook.steps.map(step => step.script), ['scripts/validate-explainer-pro-command.mjs', 'scripts/validate-explainer-pro-run.mjs']);
  assert.ok(hook.steps[1].arguments.includes('--require-complete'));
});

test('loaded-context CLI is read-only, explicit and honest about unmeasured model tokens', () => {
  const result = invoke('measure-workflow-context.mjs', ['--file', 'commands/review-pro.md', '--file', 'skills/review-core/SKILL.md']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.files.length, 2);
  assert.equal(payload.model_tokens, null);
  assert.notEqual(invoke('measure-workflow-context.mjs', []).status, 0);
  assert.notEqual(invoke('measure-workflow-context.mjs', ['--file', '../outside']).status, 0);
});
