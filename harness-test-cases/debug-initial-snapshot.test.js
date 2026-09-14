'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const invoke = (name, args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', name), ...args], { encoding: 'utf8' });
const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const hash = (bytes) => 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = (value) => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(canonical)
  : Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
const bind = (input) => { const value = structuredClone(input); delete value.content_digest; return { ...value, content_digest: hash(JSON.stringify(canonical(value))) }; };
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const okay = (result) => { assert.equal(result.status, 0, result.stdout + result.stderr); return JSON.parse(result.stdout); };
const stories = () => Object.fromEntries(['dependency_unavailable', 'simultaneous_execution', 'malicious_input', 'ten_x_volume'].map((key) => [key, {
  applicable: false, status: 'N/A', current_behavior: 'Pure export at value.js:1.', scenario: 'No relevant runtime boundary.',
  evidence_ledger_seq: [], customer_impact: 'No separate impact.', resource_impact: 'Constant work.', recovery: 'Not applicable.',
  protection: 'Regression check.', missing_protection: 'None in scope.', experiment: 'Static inspection at value.js:1.', remaining_risk: 'No runtime claim.',
  na_reason: 'value.js:1 has no I/O or shared state.', evidence_type: 'static',
}]));

function fixture(t, review = false, withHead = false) {
  const repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'debug-initial-')));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.name', 'Snapshot Test']);
  git(repo, ['config', 'user.email', 'snapshot@example.invalid']);
  git(repo, ['config', 'commit.gpgsign', 'false']);
  git(repo, ['config', 'core.hooksPath', '/dev/null']);
  fs.writeFileSync(path.join(repo, 'value.js'), 'module.exports = 1;\n');
  git(repo, ['add', 'value.js']);
  fs.writeFileSync(path.join(repo, 'notes.txt'), 'Preserve these user notes.\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), 'ignored.txt\n');
  fs.writeFileSync(path.join(repo, 'ignored.txt'), 'Not in scope.\n');
  if (withHead) {
    fs.writeFileSync(path.join(repo, 'value.js'), 'module.exports = 0;\n');
    git(repo, ['add', 'value.js']); git(repo, ['commit', '-qm', 'base']);
    fs.writeFileSync(path.join(repo, 'value.js'), 'module.exports = 1;\n');
  }
  const debugRoot = okay(invoke('resolve-debug-root.mjs', ['--repo', repo, '--slug', 'value-bug', '--create'])).artifact_root;
  const f = { repo, debugRoot, args: ['--repo-root', repo, '--artifact-root', debugRoot] };
  if (review) {
    f.reviewRoot = okay(invoke('resolve-review-root.mjs', ['--repo', repo, '--slug', 'initial-review', '--create'])).artifact_root;
    okay(invoke('review-run.mjs', ['init', '--repo-root', repo, '--artifact-root', f.reviewRoot, '--working']));
    const state = JSON.parse(fs.readFileSync(path.join(f.reviewRoot, 'state.json')));
    const target = { repository_identity: state.target.repository_identity, comparison: state.target.comparison,
      base_sha: state.target.base_sha, reviewed_head_sha: state.target.reviewed_head_sha, diff_digest: state.target.diff_digest };
    const evidence = bind({ schema_version: 'review-pro/evidence@1', id: 'RPE-INITIAL', type: 'source', ...target,
      location: 'value.js:1', summary: 'Exported constant differs from the agreed existing contract.',
      collection: { method: 'source inspection', status: 'observed', captured_at: new Date().toISOString() }, artifact_path: null, artifact_digest: null });
    write(path.join(f.reviewRoot, 'evidence/RPE-INITIAL.json'), evidence);
    const finding = bind({ schema_version: 'review-pro/finding@1', finding_id: 'RP-INITIAL', category: 'correctness', severity: 'HIGH', verification_status: 'CONFIRMED', confidence: 90, ...target,
      changed_paths: ['value.js'], affected_paths: ['value.js'], title: 'Incorrect exported result', expected: 'Return two.', actual: 'Returns one.', trigger: 'Read the exported constant.',
      failure_mechanism: 'Consumer receives the wrong value.', reachability: 'changed-path', evidence_ids: [evidence.id], impact: 'Incorrect result.', suspected_boundary: 'value.js:1',
      requires_correction: true, remediation_direction: 'Restore the agreed value.', validation_target: 'Permanent regression passes.' });
    write(path.join(f.reviewRoot, 'findings/RP-INITIAL.json'), finding);
    f.handoffRelative = 'debug-handoffs/RP-INITIAL.json';
    f.handoff = bind({ schema_version: 'review-pro/debug-handoff@2', handoff_id: `${state.run_id}:RP-INITIAL`, created_at: new Date().toISOString(),
      review: { review_id: state.run_id, finding_id: finding.finding_id, finding_digest: finding.content_digest, artifact_path: 'findings/RP-INITIAL.json', artifact_digest: hash(fs.readFileSync(path.join(f.reviewRoot, 'findings/RP-INITIAL.json'))) },
      target: { ...target, pull_request_url: null, files: ['value.js'] },
      symptom: { summary: 'Incorrect constant.', expected: 'Return two.', actual: 'Returns one.', customer_impact: 'Incorrect result.', side_effect_class: 'pure-read' },
      evidence: [{ id: evidence.id, type: evidence.type, location: evidence.location, summary: evidence.summary, content_digest: evidence.content_digest }],
      reproduction: { prerequisites: [], steps: ['Read the exported constant.'], expected: 'Return two.', actual: 'Returns one.', safety_constraints: ['Local fixture only.'] },
      suspected_boundary: { provisional: true, component: 'constant', location: 'value.js:1', reason: 'Export differs from the expected behavior.' },
      logs_and_traces: { request_ids: [], trace_ids: [], evidence_ids: [], missing_evidence: [] },
      failure_story: Object.fromEntries(Object.keys(stories()).map((key) => [key, { status: 'N/A', summary: 'Pure constant export.', evidence_ids: [evidence.id] }])),
      acceptance_criteria: ['Exported value is 2.'], constraints: ['Preserve unrelated files.'], route: { command: 'debug-pro', flag: '--from-review' } });
    write(path.join(f.reviewRoot, f.handoffRelative), f.handoff);
    f.args.push('--review-root', f.reviewRoot, '--handoff', f.handoffRelative);
  }
  f.context = (extra = []) => invoke('debug-context.mjs', [...f.args, ...extra]);
  return f;
}

function repair(f) {
  const before = okay(f.context()).context;
  fs.writeFileSync(path.join(f.repo, 'regression.js'), "require('node:assert/strict').equal(require('./value'), 2);\n");
  const argv = ['node', 'regression.js'];
  const run = () => spawnSync(process.execPath, argv.slice(1), { cwd: f.repo, encoding: 'utf8' });
  const red = run(); assert.equal(red.status, 1);
  fs.writeFileSync(path.join(f.repo, 'value.js'), 'module.exports = 2;\n');
  const green = run(); assert.equal(green.status, 0);
  const original = run(); assert.equal(original.status, 0);
  const after = okay(f.context(['--pre-fix-snapshot', before.pre_fix_snapshot_digest])).context;
  fs.writeFileSync(path.join(f.debugRoot, 'DEBUG_REPORT.md'), '# Debug report\n\nvalue.js:1 returns the wrong value. regression.js:1 fails before and passes after repair.\n');
  const proof = (result) => ({ argv, cwd: f.repo, exit_code: result.status, fresh_pid: result.pid, ledger_seq: [] });
  f.packet = {
    schema: 'debug-pro/resolution@1', debug_run_id: 'value-bug', source: before.source,
    target: { repo: after.repository_identity, repo_root: f.repo, pre_fix_sha: null, post_fix_sha: null,
      diff_mode: 'initial-working-tree', pre_fix_snapshot_digest: before.pre_fix_snapshot_digest, initial_snapshot_entries: before.initial_snapshot_entries,
      diff_digest: after.diff_digest, changed_files: after.changed_files, run_relative_path: '.agents/debug/value-bug', baseline_files: before.baseline_files },
    status: 'RESOLVED', diagnosis: { root_cause: 'Incorrect constant at value.js:1.', causal_tier: 'CONFIRMED', confidence: null, repair_seam: 'value.js:1', evidence_ledger_seq: [] },
    repair: { repair_plan_path: '', regression_test_paths: ['regression.js'], production_paths: ['value.js'], data_repair_paths: [] },
    proof: { red: proof(red), green: proof(green), original_reproduction: proof(original), broader_checks: [], logs_and_traces: { request_ids: [], trace_ids: [], artifact_paths: ['DEBUG_REPORT.md'] }, failure_story: stories() },
    remaining_risks: [], review_acceptance_criteria: before.review_acceptance_criteria ?? ['Exported value is 2.'],
    recommended_command: `/review-pro "--working" --reverify ${JSON.stringify(path.join(f.debugRoot, 'resolution.json'))}`,
  };
  f.validate = () => { write(path.join(f.debugRoot, 'resolution.json'), bind(f.packet)); return invoke('validate-debug-resolution.mjs', [...f.args, '--resolution', path.join(f.debugRoot, 'resolution.json')]); };
  f.refresh = () => { const actual = okay(f.context(['--pre-fix-snapshot', before.pre_fix_snapshot_digest])).context; f.packet.target.diff_digest = actual.diff_digest; f.packet.target.changed_files = actual.changed_files; };
  return f;
}

for (const origin of ['direct', 'review']) {
  test(`Unborn ${origin} repair completes real RED/GREEN and independent Review intake without creating a commit`, (t) => {
    const f = repair(fixture(t, origin === 'review'));
    okay(f.validate());
    const fresh = path.join(f.repo, '.agents/reviews/fresh'); fs.mkdirSync(fresh, { recursive: true });
    okay(invoke('validate-review-resolution.mjs', ['--repo-root', f.repo, '--artifact-root', fresh, '--resolution', path.join(f.debugRoot, 'resolution.json'),
      ...(f.reviewRoot ? ['--review-root', f.reviewRoot, '--handoff', f.handoffRelative] : [])]));
    assert.throws(() => git(f.repo, ['rev-parse', '--verify', 'HEAD^{commit}']));
    assert.equal(fs.readFileSync(path.join(f.repo, 'notes.txt'), 'utf8'), 'Preserve these user notes.\n');
    assert.ok(!f.packet.target.changed_files.includes('ignored.txt'));
    assert.equal(f.packet.target.pre_fix_sha, null);
    assert.equal(f.packet.target.post_fix_sha, null);
  });
}

test('Unborn Review handoff rejects drift and forged initial snapshot while permitting explicit post-repair capture', (t) => {
  const f = fixture(t, true);
  const initial = okay(f.context()).context;
  fs.writeFileSync(path.join(f.repo, 'value.js'), 'module.exports = 2;\n');
  const stale = f.context(); assert.equal(stale.status, 1); assert.match(stale.stdout, /current reviewed diff/);
  okay(f.context(['--pre-fix-snapshot', initial.pre_fix_snapshot_digest]));
  const forged = f.context(['--pre-fix-snapshot', hash('forged')]); assert.equal(forged.status, 1); assert.match(forged.stdout, /snapshot/);
  const conflicting = f.context(['--pre-fix-snapshot', initial.pre_fix_snapshot_digest, '--pre-fix-sha', 'a'.repeat(40)]);
  assert.equal(conflicting.status, 1); assert.match(conflicting.stdout, /mutually exclusive/);
});

test('Initial snapshot preserves unrelated baseline content, deletion, and immutable original identity', (t) => {
  const f = repair(fixture(t, true));
  okay(f.validate());
  const original = structuredClone(f.packet);
  f.packet.target.pre_fix_snapshot_digest = hash('forged');
  let result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /snapshot/);
  f.packet = structuredClone(original);
  fs.chmodSync(path.join(f.repo, 'notes.txt'), 0o755); f.refresh();
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
  fs.chmodSync(path.join(f.repo, 'notes.txt'), 0o644);
  git(f.repo, ['add', 'notes.txt']); f.refresh();
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
  git(f.repo, ['rm', '--cached', 'notes.txt']);
  fs.writeFileSync(path.join(f.repo, 'notes.txt'), 'Overwritten'); f.refresh();
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
  fs.unlinkSync(path.join(f.repo, 'notes.txt')); f.refresh();
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
});

test('Initial handoff requires explicit comparison and baseline entries cannot be relabeled or omitted', (t) => {
  const f = repair(fixture(t, true));
  const original = structuredClone(f.packet);
  f.packet.target.baseline_files = [];
  let result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /baseline files/);
  f.packet = structuredClone(original);
  f.packet.target.initial_snapshot_entries.reverse();
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /ordered paths/);
  f.packet = structuredClone(original);
  const handoff = structuredClone(f.handoff); delete handoff.target.comparison;
  write(path.join(f.reviewRoot, f.handoffRelative), bind(handoff));
  result = f.context(); assert.equal(result.status, 1);
  assert.match(result.stdout, /validate-review-handoff/);
});

test('Initial packet rejects a newly created HEAD, stale final content, and null-SHA committed forms', (t) => {
  const f = repair(fixture(t));
  const original = structuredClone(f.packet);
  f.packet.target.diff_mode = 'committed';
  assert.equal(f.validate().status, 1);
  f.packet = structuredClone(original);
  fs.appendFileSync(path.join(f.repo, 'value.js'), '// later edit\n');
  let result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /diff digest/);
  f.refresh();
  git(f.repo, ['commit', '-qm', 'first commit']);
  result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /HEAD|unborn/);
});

for (const filterKind of ['clean', 'process']) {
  test(`Existing-HEAD Debug context never executes a configured Git ${filterKind} filter or edits Git config`, (t) => {
    const f = fixture(t);
    git(f.repo, ['commit', '-qm', 'base']);
    fs.writeFileSync(path.join(f.repo, '.gitattributes'), 'value.js filter=reviewprobe\n');
    const marker = path.join(f.repo, '.git', 'filter-ran');
    const driver = path.join(f.repo, '.git', 'filter.cjs');
    fs.writeFileSync(driver, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed'); process.exit(7);\n`);
    git(f.repo, ['config', `filter.reviewprobe.${filterKind}`, `${JSON.stringify(process.execPath)} ${JSON.stringify(driver)}`]);
    git(f.repo, ['config', 'filter.reviewprobe.required', 'true']);
    const config = fs.readFileSync(path.join(f.repo, '.git/config'));
    fs.writeFileSync(path.join(f.repo, 'value.js'), 'module.exports = 2;\n');
    const result = f.context();
    assert.equal(fs.existsSync(marker), false, `${filterKind} filter executed during read-only Debug capture`);
    okay(result);
    assert.deepEqual(fs.readFileSync(path.join(f.repo, '.git/config')), config);
  });
}

test('Commit-backed handoffs bind comparison to intake while accepting genuinely omitted legacy labels', (t) => {
  const f = fixture(t, true, true);
  const validate = () => invoke('validate-review-handoff.mjs', ['--repo-root', f.repo, '--artifact-root', f.reviewRoot, '--handoff', f.handoffRelative]);
  const stateFile = path.join(f.reviewRoot, 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile));
  const intakeFile = path.join(f.reviewRoot, 'intake.json');
  const intake = JSON.parse(fs.readFileSync(intakeFile));
  okay(validate());
  write(intakeFile, { ...intake, comparison: 'committed-range' });
  let result = validate(); assert.equal(result.status, 1); assert.match(result.stdout, /comparison/);
  write(intakeFile, intake);
  delete state.target.comparison; write(stateFile, state);
  const handoff = structuredClone(f.handoff);
  handoff.target.comparison = 'committed-range';
  write(path.join(f.reviewRoot, f.handoffRelative), bind(handoff));
  result = validate(); assert.equal(result.status, 1); assert.match(result.stdout, /comparison/);
  delete handoff.target.comparison; write(path.join(f.reviewRoot, f.handoffRelative), bind(handoff));
  okay(validate());
});
