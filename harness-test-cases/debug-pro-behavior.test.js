'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const invoke = (name, args, env = process.env) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', name), ...args], { encoding: 'utf8', env });
const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
const canonical = (value) => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(canonical)
  : Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
const hash = (bytes) => 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
function bind(packet) {
  const copy = structuredClone(packet);
  delete copy.content_digest;
  return { ...copy, content_digest: hash(JSON.stringify(canonical(copy))) };
}
function fixture(t) {
  const repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pro-debug-')));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.name', 'Debug Test']);
  git(repo, ['config', 'user.email', 'debug@example.invalid']);
  git(repo, ['config', 'commit.gpgsign', 'false']);
  git(repo, ['config', 'core.hooksPath', '/dev/null']);
  fs.writeFileSync(path.join(repo, 'value.js'), 'module.exports = 1;\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'base']);
  const result = invoke('resolve-debug-root.mjs', ['--repo', repo, '--slug', 'value-bug', '--create']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const root = JSON.parse(result.stdout).artifact_root;
  return { repo, root, head: git(repo, ['rev-parse', 'HEAD']) };
}
const contextArgs = (f) => ['--repo-root', f.repo, '--artifact-root', f.root];
function context(f, extra = []) {
  const result = invoke('debug-context.mjs', [...contextArgs(f), ...extra]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return JSON.parse(result.stdout).context;
}
function repair(t) {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, 'user-notes.txt'), 'Unrelated work\n');
  const baseline = context(f);
  fs.writeFileSync(path.join(f.repo, 'regression.js'), "require('node:assert/strict').equal(require('./value'), 2);\n");
  const argv = ['node', 'regression.js'];
  const run = () => spawnSync(process.execPath, argv.slice(1), { cwd: f.repo, encoding: 'utf8' });
  const red = run(); assert.equal(red.status, 1);
  fs.writeFileSync(path.join(f.repo, 'value.js'), 'module.exports = 2;\n');
  const green = run(); assert.equal(green.status, 0);
  const original = run(); assert.equal(original.status, 0);
  const after = context(f, ['--pre-fix-sha', f.head]);
  const report = '# Debug report\n\nvalue.js:1 returns the wrong constant. regression.js:1 fails before the fix and passes after.\n'
    + '\nScope: value.js and regression.js. User notes are unchanged. No temporary probes remain.\n';
  fs.writeFileSync(path.join(f.root, 'DEBUG_REPORT.md'), report);
  const proof = (result) => ({ argv, cwd: f.repo, exit_code: result.status, fresh_pid: result.pid, ledger_seq: [] });
  const story = { applicable: false, status: 'N/A', current_behavior: 'Pure constant export at value.js:1.', scenario: 'No relevant runtime boundary.',
    evidence_ledger_seq: [], customer_impact: 'No separate impact.', resource_impact: 'Constant work.', recovery: 'Not applicable.', protection: 'Regression check.',
    missing_protection: 'None for this scope.', experiment: 'Static inspection of value.js:1.', remaining_risk: 'No runtime claim.',
    na_reason: 'value.js:1 has no I/O, shared state or inputs.', evidence_type: 'static' };
  f.packet = {
    schema: 'debug-pro/resolution@1', debug_run_id: 'value-bug', source: { kind: 'direct', review_id: null, finding_id: null, handoff_digest: null },
    target: { repo: after.repository_identity, repo_root: f.repo, pre_fix_sha: f.head, post_fix_sha: after.head_sha,
      diff_mode: 'working-tree', diff_digest: after.diff_digest, changed_files: after.changed_files,
      run_relative_path: '.agents/debug/value-bug', baseline_files: baseline.baseline_files },
    status: 'RESOLVED', diagnosis: { root_cause: 'Incorrect constant at value.js:1.', causal_tier: 'CONFIRMED', confidence: null, repair_seam: 'value.js:1', evidence_ledger_seq: [] },
    repair: { repair_plan_path: '', regression_test_paths: ['regression.js'], production_paths: ['value.js'], data_repair_paths: [] },
    proof: { red: proof(red), green: proof(green), original_reproduction: proof(original), broader_checks: [],
      logs_and_traces: { request_ids: [], trace_ids: [], artifact_paths: ['DEBUG_REPORT.md'] },
      failure_story: Object.fromEntries(['dependency_unavailable', 'simultaneous_execution', 'malicious_input', 'ten_x_volume'].map((key) => [key, { ...story }])) },
    remaining_risks: [], review_acceptance_criteria: ['Exported value is 2.'],
    recommended_command: `/review-pro "--working" --reverify ${JSON.stringify(path.join(f.root, 'resolution.json'))}`,
  };
  f.persist = () => fs.writeFileSync(path.join(f.root, 'resolution.json'), JSON.stringify(bind(f.packet), null, 2));
  f.validate = () => { f.persist(); return invoke('validate-debug-resolution.mjs', [...contextArgs(f), '--resolution', path.join(f.root, 'resolution.json')]); };
  f.refresh = () => {
    const actual = context(f, ['--pre-fix-sha', f.head]);
    f.packet.target.diff_digest = actual.diff_digest;
    f.packet.target.changed_files = actual.changed_files;
    f.packet.target.post_fix_sha = actual.head_sha;
  };
  return f;
}

test('Debug root resolves the owning repository, rejects traversal, orphan roots and symlinks', (t) => {
  const f = fixture(t);
  const nested = path.join(f.repo, 'src'); fs.mkdirSync(nested);
  const result = invoke('resolve-debug-root.mjs', ['--repo', nested, '--slug', 'nested']);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(JSON.parse(result.stdout).artifact_root, path.join(f.repo, '.agents/debug/nested'));
  assert.equal(invoke('resolve-debug-root.mjs', ['--repo', f.repo, '--slug', '../escape']).status, 1);
  fs.symlinkSync(nested, path.join(f.repo, '.agents/debug/link'));
  assert.equal(invoke('resolve-debug-root.mjs', ['--repo', f.repo, '--slug', 'link']).status, 1);
  const orphan = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-orphan-'));
  t.after(() => fs.rmSync(orphan, { recursive: true, force: true }));
  assert.equal(invoke('resolve-debug-root.mjs', ['--repo', orphan, '--slug', 'test']).status, 1);
});

test('Debug context is read-only, ignores Git overrides, and excludes only this exact run', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, 'user.txt'), 'in progress');
  fs.mkdirSync(path.join(f.repo, '.agents/debug/another'));
  fs.writeFileSync(path.join(f.repo, '.agents/debug/another/note.md'), 'Other run');
  fs.writeFileSync(path.join(f.root, 'note.md'), 'Current run');
  const before = fs.readdirSync(f.root);
  const result = invoke('debug-context.mjs', contextArgs(f), { ...process.env, GIT_DIR: '/does-not-exist' });
  assert.equal(result.status, 0, result.stdout);
  const actual = JSON.parse(result.stdout).context;
  assert.deepEqual(actual.changed_files, ['.agents/debug/another/note.md', 'user.txt']);
  assert.equal(actual.baseline_files.find((entry) => entry.path === 'user.txt').sha256, hash('in progress'));
  assert.deepEqual(fs.readdirSync(f.root), before);
});

test('Lean repair validates actual RED/GREEN context and round-trips through independent Review intake', (t) => {
  const f = repair(t);
  const result = f.validate();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).reverification_status, 'READY_FOR_INDEPENDENT_REVERIFICATION');
  assert.equal(fs.existsSync(path.join(f.repo, '.agents/reviews')), false);
  const review = path.join(f.repo, '.agents/reviews/fresh'); fs.mkdirSync(review, { recursive: true });
  const received = invoke('validate-review-resolution.mjs', ['--repo-root', f.repo, '--artifact-root', review, '--resolution', path.join(f.root, 'resolution.json')]);
  assert.equal(received.status, 0, received.stdout);
  assert.equal(fs.existsSync(path.join(f.root, 'state.json')), false);
});

test('Resolved gate rejects changed commands, missing fresh reproduction, failed checks and unsupported failure stories', (t) => {
  const f = repair(t);
  const original = structuredClone(f.packet);
  const cases = [
    [(p) => { p.proof.green.argv = ['node', 'other.js']; }, /matching RED and GREEN/],
    [(p) => { p.proof.original_reproduction.fresh_pid = p.proof.red.fresh_pid; }, /fresh reproduction/],
    [(p) => { p.proof.original_reproduction.exit_code = null; }, /original reproduction/],
    [(p) => { p.diagnosis.causal_tier = 'PLAUSIBLE'; }, /confirmed causal/],
    [(p) => { p.proof.broader_checks = [{ ...p.proof.green, name: 'build', required: true, exit_code: 1 }]; }, /required broader/],
    [(p) => { p.proof.failure_story.ten_x_volume = { ...p.proof.failure_story.ten_x_volume, applicable: true, status: 'UNVERIFIED' }; }, /failure story/],
    [(p) => { p.proof.failure_story.malicious_input.na_reason = ''; }, /failure story/],
    [(p) => { p.repair.production_paths.push('regression.js'); p.repair.regression_test_paths = []; }, /permanent regression/],
    [(p) => { p.repair.regression_test_paths.push('missing-regression.js'); }, /ENOENT/],
  ];
  for (const [mutate, message] of cases) {
    f.packet = structuredClone(original); mutate(f.packet);
    const result = f.validate(); assert.equal(result.status, 1, result.stdout); assert.match(result.stdout, message);
  }
});

test('Linked harness CLI entry points execute validation rather than silently succeeding', (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-link-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const linked = path.join(temporary, 'harness'); fs.symlinkSync(ROOT, linked);
  for (const name of ['debug-context.mjs', 'validate-review-resolution.mjs', 'review-source.mjs']) {
    const result = spawnSync(process.execPath, [path.join(linked, 'scripts', name)], { encoding: 'utf8' });
    assert.equal(result.status, 1, name + result.stdout);
    assert.equal(JSON.parse(result.stdout).status, 'error');
  }
});

test('Debug uses the shared redacted trace without requiring a new state file', (t) => {
  const f = fixture(t);
  for (const event of ['run-started', 'run-completed']) {
    const result = invoke('record-workflow-event.mjs', ['--artifact-root', f.root, '--workflow', 'debug-pro', '--run-id', 'value-bug', '--event', event, '--summary', 'Bounded investigation event']);
    assert.equal(result.status, 0, result.stdout);
  }
  const checked = invoke('validate-workflow-trace.mjs', ['--artifact-root', f.root, '--workflow', 'debug-pro', '--run-id', 'value-bug']);
  assert.equal(checked.status, 0, checked.stdout);
  assert.equal(fs.existsSync(path.join(f.root, 'state.json')), false);
  assert.equal(fs.statSync(path.join(f.root, 'run-events.jsonl')).mode & 0o077, 0);
});

test('Unchanged dirty baseline is preserved; altered or reverted user work blocks an out-of-scope repair', (t) => {
  const f = repair(t);
  assert.equal(f.validate().status, 0);
  fs.writeFileSync(path.join(f.repo, 'user-notes.txt'), 'Overwritten'); f.refresh();
  let result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
  fs.unlinkSync(path.join(f.repo, 'user-notes.txt')); f.refresh();
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
});

test('Resolution validation rejects stale hashes, roots, unsafe evidence and empty proof while never executing packet argv', (t) => {
  const f = repair(t);
  f.persist();
  const originalBytes = fs.readFileSync(path.join(f.root, 'resolution.json'));
  const packet = JSON.parse(originalBytes); packet.status = 'UNRESOLVED';
  fs.writeFileSync(path.join(f.root, 'resolution.json'), JSON.stringify(packet));
  assert.equal(invoke('validate-debug-resolution.mjs', [...contextArgs(f), '--resolution', path.join(f.root, 'resolution.json')]).status, 1);
  f.packet.proof.red.argv = ['node', '-e', 'process.exit(88)'];
  assert.equal(f.validate().status, 1);
  f.packet.status = 'UNRESOLVED'; f.packet.remaining_risks = ['Proof unavailable.'];
  assert.equal(f.validate().status, 0);
  fs.writeFileSync(path.join(f.root, 'DEBUG_REPORT.md'), 'password=not-for-publication');
  const sensitive = f.validate(); assert.equal(sensitive.status, 1); assert.match(sensitive.stdout, /sensitive content/);
  assert.equal(invoke('validate-debug-resolution.mjs', ['--repo-root', f.repo, '--artifact-root', f.repo, '--resolution', path.join(f.root, 'resolution.json')]).status, 1);
});
