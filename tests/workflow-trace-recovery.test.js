'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const harness = path.resolve(__dirname, '..');
const invoke = (script, root, extra = []) => spawnSync(process.execPath, [path.join(harness, 'scripts', script), '--artifact-root', root, '--workflow', 'feature-pro', '--run-id', 'run-1', ...extra], { encoding: 'utf8', timeout: 5000 });
const recover = (root, extra = []) => invoke('recover-workflow-trace.mjs', root, ['--checkpoint', 'checkpoint.md', '--approval', 'User approved trace-only continuation', ...extra]);
const record = (root, event, extra = []) => invoke('record-workflow-event.mjs', root, ['--event', event, '--summary', 'Current observed event', ...extra]);
const row = (event, extra = {}) => ({ schema_version: 'pro-harness/workflow-event@1', event_id: crypto.randomUUID(), run_id: 'run-1', workflow: 'feature-pro', event, status: 'passed', occurred_at: '2026-09-05T04:00:00.000Z', summary: 'Observed event', artifacts: [], ...extra });
function fixture(t, rows = [row('phase-completed', {phase:1}), row('run-started')]) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pro-trace-recovery-')));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.writeFileSync(path.join(root, 'run-events.jsonl'), rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  fs.writeFileSync(path.join(root, 'checkpoint.md'), '# Reconciliation\nNo prior phase completion is certified by this recovery.\n');
  return root;
}

test('authorized recovery links immutable history and routes writer/validator to a truthful continuation', t => {
  const root = fixture(t), original = fs.readFileSync(path.join(root, 'run-events.jsonl'));
  assert.notEqual(invoke('validate-workflow-trace.mjs', root).status, 0);
  const result = recover(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(root, 'run-events.jsonl')), original);
  let checked = JSON.parse(invoke('validate-workflow-trace.mjs', root).stdout);
  assert.equal(checked.status, 'success');
  assert.equal(checked.trace_status, 'recovered-with-gaps');
  assert.equal(checked.history.verification.sequence, 'fail');
  assert.equal(checked.verification.sequence, 'pass');
  assert.equal(record(root, 'phase-completed', ['--phase', '15']).status, 1, 'no inherited/fabricated starts');
  assert.equal(record(root, 'phase-started', ['--phase', '15']).status, 0);
  assert.equal(record(root, 'phase-completed', ['--phase', '15']).status, 0);
  const rows = fs.readFileSync(path.join(root, 'run-events.continuation.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(x=>x.event), ['run-started', 'phase-started', 'phase-completed']);
  assert.equal(rows[0].status, 'degraded');
  assert.equal(checked.history.event_count, 2);
  assert.equal(fs.statSync(path.join(root, 'trace-recovery.json')).mode & 0o077, 0);
  assert.deepEqual(fs.readFileSync(path.join(root, 'run-events.jsonl')), original);
  assert.notEqual(recover(root).status, 0, 'never overwrite existing continuation');
});

test('recovery requires explicit approval and never edits state or creates an unlinked stream', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'state.json'), '{"current_phase":7}\n');
  assert.notEqual(invoke('recover-workflow-trace.mjs', root, ['--checkpoint','checkpoint.md']).status, 0);
  assert.equal(fs.existsSync(path.join(root, 'run-events.continuation.jsonl')), false);
  assert.equal(recover(root).status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'state.json'),'utf8'), '{"current_phase":7}\n');
});

test('schema, privacy, mixed identity, terminal and clean traces cannot use recovery', t => {
  const cases = [
    [row('unknown')],
    [row('phase-started', {phase:1, summary:'authorization: private-value'})],
    [row('phase-started', {phase:1, run_id:'other-run'})],
    [row('phase-started', {phase:1, workflow:'review-pro'})],
    [row('phase-completed', {phase:1}), row('run-completed')],
    [row('run-started')],
  ];
  for (const rows of cases) {
    const root = fixture(t, rows), before=fs.readFileSync(path.join(root,'run-events.jsonl'));
    assert.notEqual(recover(root).status, 0);
    assert.deepEqual(fs.readFileSync(path.join(root,'run-events.jsonl')),before);
    assert.equal(fs.existsSync(path.join(root,'trace-recovery.json')), false);
    assert.equal(fs.existsSync(path.join(root,'run-events.continuation.jsonl')), false);
  }
});

test('changed original, checkpoint or continuation anchor blocks both validation and append', t => {
  for (const file of ['run-events.jsonl','checkpoint.md','run-events.continuation.jsonl','trace-recovery.json']) {
    const root=fixture(t);
    assert.equal(recover(root).status,0);
    const target=path.join(root,file);
    if (file==='run-events.continuation.jsonl') {
      const first=JSON.parse(fs.readFileSync(target,'utf8'));
      fs.writeFileSync(target,JSON.stringify({...first,event_id:crypto.randomUUID()})+'\n');
    } else if (file==='trace-recovery.json') {
      const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
      fs.writeFileSync(target,JSON.stringify({...manifest,active_path:'../escape.jsonl'}));
    } else fs.appendFileSync(target,'\nchanged');
    const before=fs.readFileSync(path.join(root,'run-events.continuation.jsonl'));
    assert.notEqual(invoke('validate-workflow-trace.mjs',root).status,0,file);
    assert.notEqual(record(root,'run-resumed').status,0,file);
    assert.deepEqual(fs.readFileSync(path.join(root,'run-events.continuation.jsonl')),before);
  }
});

test('recovery refuses busy locks, symlink targets, escaping checkpoints and orphan continuations', t => {
  for (const target of ['.run-events.lock','trace-recovery.json','run-events.continuation.jsonl','checkpoint.md','run-events.jsonl']) {
    const root=fixture(t), outside=path.join(root,'sentinel');
    fs.writeFileSync(outside,'untouched');
    if (fs.existsSync(path.join(root,target))) fs.renameSync(path.join(root,target),path.join(root,`old-${target}`));
    fs.symlinkSync(outside,path.join(root,target));
    assert.notEqual(recover(root).status,0,target);
    assert.equal(fs.readFileSync(outside,'utf8'),'untouched');
  }
  const root=fixture(t);
  assert.notEqual(recover(root,['--checkpoint','../outside.md']).status,0,'duplicate flags also rejected');
  fs.writeFileSync(path.join(root,'run-events.continuation.jsonl'),'unfinished');
  assert.notEqual(recover(root).status,0);
  assert.notEqual(record(root,'run-resumed').status,0);
});

test('recovery hashes raw bytes, not lossy UTF-8 text', t => {
  for (const name of ['run-events.jsonl','checkpoint.md']) {
    const root=fixture(t);
    const file=path.join(root,name);
    if (name==='run-events.jsonl') {
      const bytes=fs.readFileSync(file);
      const index=bytes.indexOf('Observed');
      bytes[index]=0xfe;
      fs.writeFileSync(file,bytes);
    } else fs.writeFileSync(file,Buffer.from([0xfe]));
    assert.equal(recover(root).status,0);
    const bytes=fs.readFileSync(file), index=bytes.indexOf(0xfe);
    bytes[index]=0xff; // Same decoded replacement character; different evidence bytes.
    fs.writeFileSync(file,bytes);
    assert.notEqual(invoke('validate-workflow-trace.mjs',root).status,0);
    assert.notEqual(record(root,'run-resumed').status,0);
  }
});

test('decoded privacy and strict string schema checks are recovery prerequisites', t => {
  for (const change of [{event_id:[crypto.randomUUID()]},{actor:['implementation-planner']},{actor:null},{summary:'authorization: synthetic-value'}]) {
    const root=fixture(t,[row('phase-completed',{phase:1,...change}),row('run-started')]);
    if (change.summary) {
      const file=path.join(root,'run-events.jsonl');
      fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('authorization','\\u0061uthorization'));
    }
    assert.notEqual(recover(root).status,0,JSON.stringify(change));
    assert.equal(fs.existsSync(path.join(root,'trace-recovery.json')),false);
  }
});

test('ordinary append detects a concurrent completion after the content read', t => {
  const root=fixture(t,[row('run-started')]);
  const trace=path.join(root,'run-events.jsonl');
  const hook=path.join(root,'race.mjs');
  fs.writeFileSync(hook,`import fs from 'node:fs';
const originalOpen=fs.openSync, originalClose=fs.closeSync;
let watched, fired=false;
fs.openSync=function(file,flags,...args){const fd=originalOpen.call(fs,file,flags,...args);if(file===${JSON.stringify(trace)} && typeof flags==='number' && (flags & 3)===0 && !fired) watched=fd;return fd;};
fs.closeSync=function(fd){const result=originalClose.call(fs,fd);if(fd===watched && !fired){fired=true;fs.appendFileSync(${JSON.stringify(trace)},${JSON.stringify(JSON.stringify(row('run-completed'))+'\n')});}return result;};
`);
  const result=spawnSync(process.execPath,['--import',hook,path.join(harness,'scripts/record-workflow-event.mjs'),'--artifact-root',root,'--workflow','feature-pro','--run-id','run-1','--event','run-resumed','--summary','Resume'],{encoding:'utf8',timeout:5000});
  assert.notEqual(result.status,0,result.stdout+result.stderr);
  assert.deepEqual(fs.readFileSync(trace,'utf8').trim().split('\n').map(x=>JSON.parse(x).event),['run-started','run-completed']);
});

test('mutable state cannot be a checkpoint; partial commit markers fail closed', t => {
  const root=fixture(t);
  fs.writeFileSync(path.join(root,'state.json'),'{}\n');
  const result=invoke('recover-workflow-trace.mjs',root,['--checkpoint','state.json','--approval','User approved recovery']);
  assert.notEqual(result.status,0);
  assert.equal(recover(root).status,0);
  fs.writeFileSync(path.join(root,'trace-recovery.json'),'{');
  const original=fs.readFileSync(path.join(root,'run-events.continuation.jsonl'));
  assert.notEqual(invoke('validate-workflow-trace.mjs',root).status,0);
  assert.notEqual(record(root,'run-resumed').status,0);
  assert.notEqual(recover(root).status,0);
  assert.deepEqual(fs.readFileSync(path.join(root,'run-events.continuation.jsonl')),original);
});
