'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const invoke = (name, args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', name), ...args], { encoding: 'utf8' });
const hash = (bytes) => 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = (value) => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(canonical)
  : Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
const bind = (input) => { const value = structuredClone(input); delete value.content_digest; return { ...value, content_digest: hash(JSON.stringify(canonical(value))) }; };
const okay = (result) => { assert.equal(result.status, 0, result.stdout + result.stderr); return JSON.parse(result.stdout); };
const stories = () => Object.fromEntries(['dependency_unavailable', 'simultaneous_execution', 'malicious_input', 'ten_x_volume'].map((key) => [key, {
  applicable: false, status: 'N/A', current_behavior: 'Pure export at src/value.js:1.', scenario: 'No relevant runtime boundary.',
  evidence_ledger_seq: [], customer_impact: 'No separate impact.', resource_impact: 'Constant work.', recovery: 'Not applicable.',
  protection: 'Regression check.', missing_protection: 'None in scope.', experiment: 'Static inspection at src/value.js:1.', remaining_risk: 'No runtime claim.',
  na_reason: 'src/value.js:1 has no I/O or shared state.', evidence_type: 'static',
}]));

function fixture(t, review = false) {
  const repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'debug-directory-')));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  fs.mkdirSync(path.join(repo, 'src'));
  fs.writeFileSync(path.join(repo, 'src/value.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(repo, 'src/notes.txt'), 'Preserve user work.\n');
  fs.writeFileSync(path.join(repo, 'outside.txt'), 'Not in the explicitly selected scope.\n');
  const debugRoot = path.join(repo, '.agents/debug/value-bug'); fs.mkdirSync(debugRoot, { recursive: true });
  const scope = ['src'];
  const args = ['--local', '--repo-root', repo, '--artifact-root', debugRoot];
  const f = { repo, debugRoot, scope, args };
  if (review) {
    f.reviewRoot = path.join(repo, '.agents/reviews/local-review'); fs.mkdirSync(f.reviewRoot, { recursive: true });
    okay(invoke('review-run.mjs', ['init', '--local', '--repo-root', repo, '--artifact-root', f.reviewRoot, '--scope', JSON.stringify(scope)]));
    const state = JSON.parse(fs.readFileSync(path.join(f.reviewRoot, 'state.json')));
    const target = { repository_identity: state.target.repository_identity, comparison: state.target.comparison, local_scope: state.target.local_scope,
      base_sha: null, reviewed_head_sha: null, diff_digest: state.target.diff_digest };
    const evidence = bind({ schema_version: 'review-pro/evidence@1', id: 'RPE-LOCAL', type: 'source', ...target,
      location: 'src/value.js:1', summary: 'Exported constant differs from the agreed existing contract.',
      collection: { method: 'source inspection', status: 'observed', captured_at: new Date().toISOString() }, artifact_path: null, artifact_digest: null });
    fs.writeFileSync(path.join(f.reviewRoot, 'evidence/RPE-LOCAL.json'), JSON.stringify(evidence));
    const finding = bind({ schema_version: 'review-pro/finding@1', finding_id: 'RP-LOCAL', category: 'correctness', severity: 'HIGH', verification_status: 'CONFIRMED', confidence: 90, ...target,
      changed_paths: ['src/value.js'], affected_paths: ['src/value.js'], title: 'Incorrect exported result', expected: 'Return two.', actual: 'Returns one.', trigger: 'Read the exported constant.',
      failure_mechanism: 'Consumer receives the wrong value.', reachability: 'changed-path', evidence_ids: [evidence.id], impact: 'Incorrect result.', suspected_boundary: 'src/value.js:1',
      requires_correction: true, remediation_direction: 'Restore the agreed value.', validation_target: 'Permanent regression passes.' });
    fs.writeFileSync(path.join(f.reviewRoot, 'findings/RP-LOCAL.json'), JSON.stringify(finding));
    f.handoffRelative = 'debug-handoffs/RP-LOCAL.json';
    f.handoff = bind({ schema_version: 'review-pro/debug-handoff@2', handoff_id: `${state.run_id}:RP-LOCAL`, created_at: new Date().toISOString(),
      review: { review_id: state.run_id, finding_id: finding.finding_id, finding_digest: finding.content_digest, artifact_path: 'findings/RP-LOCAL.json', artifact_digest: hash(fs.readFileSync(path.join(f.reviewRoot, 'findings/RP-LOCAL.json'))) },
      target: { ...target, pull_request_url: null, files: ['src/value.js'] },
      symptom: { summary: 'Incorrect constant.', expected: 'Return two.', actual: 'Returns one.', customer_impact: 'Incorrect result.', side_effect_class: 'pure-read' },
      evidence: [{ id: evidence.id, type: evidence.type, location: evidence.location, summary: evidence.summary, content_digest: evidence.content_digest }],
      reproduction: { prerequisites: [], steps: ['Read the exported constant.'], expected: 'Return two.', actual: 'Returns one.', safety_constraints: ['Local fixture only.'] },
      suspected_boundary: { provisional: true, component: 'constant', location: 'src/value.js:1', reason: 'Export differs from the expected behavior.' },
      logs_and_traces: { request_ids: [], trace_ids: [], evidence_ids: [], missing_evidence: [] },
      failure_story: Object.fromEntries(Object.keys(stories()).map((key) => [key, { status: 'N/A', summary: 'Pure constant export.', evidence_ids: [evidence.id] }])),
      acceptance_criteria: ['Exported value is 2.'], constraints: ['Preserve unrelated files.'], route: { command: 'debug-pro', flag: '--from-review' } });
    fs.writeFileSync(path.join(f.reviewRoot, f.handoffRelative), JSON.stringify(f.handoff));
    args.push('--review-root', f.reviewRoot, '--handoff', f.handoffRelative);
  }
  f.context = (extra = []) => invoke('debug-context.mjs', [...args, '--scope', JSON.stringify(scope), ...extra]);
  return f;
}

function repair(f) {
  const before = okay(f.context()).context;
  fs.writeFileSync(path.join(f.repo, 'src/regression.js'), "require('node:assert/strict').equal(require('./value'), 2);\n");
  const argv = ['node', 'src/regression.js'];
  const run = () => spawnSync(process.execPath, argv.slice(1), { cwd: f.repo, encoding: 'utf8' });
  const red = run(); assert.equal(red.status, 1);
  fs.writeFileSync(path.join(f.repo, 'src/value.js'), 'module.exports = 2;\n');
  const green = run(); assert.equal(green.status, 0);
  const original = run(); assert.equal(original.status, 0);
  const after = okay(f.context(['--pre-fix-snapshot', before.pre_fix_snapshot_digest])).context;
  fs.writeFileSync(path.join(f.debugRoot, 'DEBUG_REPORT.md'), '# Debug report\n\nsrc/value.js:1 returned the wrong value. The permanent regression fails before and passes after correction.\n');
  const proof = (result) => ({ argv, cwd: f.repo, exit_code: result.status, fresh_pid: result.pid, ledger_seq: [] });
  f.packet = {
    schema: 'debug-pro/resolution@1', debug_run_id: 'value-bug', source: before.source,
    target: { repo: after.repository_identity, repo_root: f.repo, pre_fix_sha: null, post_fix_sha: null,
      diff_mode: 'local-directory', local_scope: before.local_scope, pre_fix_snapshot_digest: before.pre_fix_snapshot_digest,
      initial_snapshot_entries: before.initial_snapshot_entries, diff_digest: after.diff_digest, changed_files: after.changed_files,
      run_relative_path: '.agents/debug/value-bug', baseline_files: before.baseline_files },
    status: 'RESOLVED', diagnosis: { root_cause: 'Incorrect constant at src/value.js:1.', causal_tier: 'CONFIRMED', confidence: null, repair_seam: 'src/value.js:1', evidence_ledger_seq: [] },
    repair: { repair_plan_path: '', regression_test_paths: ['src/regression.js'], production_paths: ['src/value.js'], data_repair_paths: [] },
    proof: { red: proof(red), green: proof(green), original_reproduction: proof(original), broader_checks: [], logs_and_traces: { request_ids: [], trace_ids: [], artifact_paths: ['DEBUG_REPORT.md'] }, failure_story: stories() },
    remaining_risks: [], review_acceptance_criteria: ['Exported value is 2.'],
    recommended_command: `/review-pro ${JSON.stringify(f.repo)} --local --reverify ${JSON.stringify(path.join(f.debugRoot, 'resolution.json'))}`,
  };
  f.persist = () => fs.writeFileSync(path.join(f.debugRoot, 'resolution.json'), JSON.stringify(bind(f.packet), null, 2));
  f.validate = (extra = []) => { f.persist(); return invoke('validate-debug-resolution.mjs', [...f.args, '--scope', JSON.stringify(f.scope), '--resolution', path.join(f.debugRoot, 'resolution.json'), ...extra]); };
  f.refresh = () => { const actual = okay(f.context(['--pre-fix-snapshot', before.pre_fix_snapshot_digest])).context; f.packet.target.diff_digest = actual.diff_digest; f.packet.target.changed_files = actual.changed_files; };
  return f;
}

test('Explicit local Debug repairs a non-Git project with real RED/GREEN and independent Review intake', (t) => {
  const f = repair(fixture(t));
  okay(f.validate());
  const reviewRoot = path.join(f.repo, '.agents/reviews/fresh'); fs.mkdirSync(reviewRoot, { recursive: true });
  okay(invoke('validate-review-resolution.mjs', ['--local', '--repo-root', f.repo, '--scope', JSON.stringify(f.scope), '--artifact-root', reviewRoot, '--resolution', path.join(f.debugRoot, 'resolution.json')]));
  assert.equal(fs.existsSync(path.join(f.repo, '.git')), false);
  assert.deepEqual(f.packet.target.local_scope, ['src']);
  assert.equal(f.packet.target.changed_files.includes('outside.txt'), false);
  assert.equal(fs.readFileSync(path.join(f.repo, 'src/notes.txt'), 'utf8'), 'Preserve user work.\n');
});

test('Local Review handoff repairs and returns with original scope, identity and acceptance criteria', (t) => {
  const f = repair(fixture(t, true));
  okay(f.validate());
  const reviewRoot = path.join(f.repo, '.agents/reviews/fresh'); fs.mkdirSync(reviewRoot, { recursive: true });
  okay(invoke('validate-review-resolution.mjs', ['--local', '--repo-root', f.repo, '--scope', JSON.stringify(f.scope), '--artifact-root', reviewRoot,
    '--review-root', f.reviewRoot, '--handoff', f.handoffRelative, '--resolution', path.join(f.debugRoot, 'resolution.json')]));
  f.packet.target.local_scope = ['src/value.js'];
  assert.equal(f.validate().status, 1);
});

test('Local Review intake rejects source drift and incompatible explicit scope before repair', (t) => {
  const f = fixture(t, true);
  const before = okay(f.context()).context;
  fs.writeFileSync(path.join(f.repo, 'src/value.js'), 'module.exports = 2;\n');
  const stale = f.context(); assert.equal(stale.status, 1); assert.match(stale.stdout, /current reviewed diff/);
  okay(f.context(['--pre-fix-snapshot', before.pre_fix_snapshot_digest]));
  assert.equal(f.context(['--pre-fix-snapshot', hash('forged')]).status, 1);
  f.scope.splice(0, 1, 'src/value.js');
  assert.equal(f.context(['--pre-fix-snapshot', before.pre_fix_snapshot_digest]).status, 1);
});

test('Local packet is never authority to select a local root; scope is explicit and immutable', (t) => {
  const f = repair(fixture(t));
  f.persist();
  assert.equal(invoke('validate-debug-resolution.mjs', [...f.args.filter((arg) => arg !== '--local'), '--resolution', path.join(f.debugRoot, 'resolution.json')]).status, 1);
  assert.equal(invoke('validate-debug-resolution.mjs', [...f.args, '--resolution', path.join(f.debugRoot, 'resolution.json')]).status, 1);
  assert.equal(invoke('debug-context.mjs', f.args).status, 1);
  assert.equal(f.validate(['--scope', JSON.stringify(['src/value.js'])]).status, 1);
  f.packet.target.local_scope = ['src/value.js'];
  assert.equal(f.validate().status, 1);
});

test('A fully rehashed broadened local packet cannot grant scope beyond independent caller selectors', async (t) => {
  const f = repair(fixture(t));
  const { captureLocalDirectory, digestLocalDirectory } = await import('../scripts/lib/local-directory.mjs');
  const broadened = ['outside.txt', 'src'];
  const initialEntries = [...f.packet.target.initial_snapshot_entries, {
    path: 'outside.txt', kind: 'file', digest: hash(fs.readFileSync(path.join(f.repo, 'outside.txt'))), mode: '100644', index: [],
  }].sort((a, b) => a.path.localeCompare(b.path));
  const current = captureLocalDirectory(f.repo, broadened, ['.agents/debug/value-bug']);
  Object.assign(f.packet.target, { local_scope: broadened, initial_snapshot_entries: initialEntries,
    pre_fix_snapshot_digest: digestLocalDirectory(initialEntries, broadened, f.repo), diff_digest: current.digest, changed_files: current.files,
    baseline_files: initialEntries.map((entry) => ({ path: entry.path, sha256: entry.digest })) });
  const result = f.validate();
  assert.equal(result.status, 1); assert.match(result.stdout, /scope differs/);
});

test('Local repair rejects stale final bytes, rewritten retained baseline, and changes outside repair allowlist', (t) => {
  const f = repair(fixture(t));
  const original = structuredClone(f.packet);
  f.packet.target.initial_snapshot_entries[0].digest = hash('forged');
  assert.equal(f.validate().status, 1);
  f.packet = structuredClone(original);
  fs.appendFileSync(path.join(f.repo, 'src/value.js'), '// late edit\n');
  assert.equal(f.validate().status, 1);
  f.refresh(); okay(f.validate());
  for (const mutate of [
    () => fs.chmodSync(path.join(f.repo, 'src/notes.txt'), 0o755),
    () => fs.writeFileSync(path.join(f.repo, 'src/notes.txt'), 'Overwritten'),
    () => fs.unlinkSync(path.join(f.repo, 'src/notes.txt')),
  ]) {
    mutate(); f.refresh();
    const result = f.validate(); assert.equal(result.status, 1); assert.match(result.stdout, /outside the repair scope/);
  }
});

test('Local repair retains proof, path and snapshot-mode safety gates', (t) => {
  const f = repair(fixture(t));
  const original = structuredClone(f.packet);
  for (const mutate of [
    (p) => { p.proof.green.argv = ['node', 'other.js']; },
    (p) => { p.proof.original_reproduction.fresh_pid = p.proof.red.fresh_pid; },
    (p) => { p.proof.red.cwd = path.dirname(f.repo); },
    (p) => { p.target.pre_fix_sha = 'a'.repeat(40); },
    (p) => { p.target.diff_mode = 'initial-working-tree'; },
    (p) => { p.repair.production_paths.push('outside.txt'); },
    (p) => { p.recommended_command = `/review-pro ${JSON.stringify(f.repo)} --reverify ${JSON.stringify(path.join(f.debugRoot, 'resolution.json'))}`; },
    (p) => { p.recommended_command = `/review-pro ${JSON.stringify(path.dirname(f.repo))} --local --reverify ${JSON.stringify(path.join(f.debugRoot, 'resolution.json'))}`; },
  ]) {
    f.packet = structuredClone(original); mutate(f.packet); assert.equal(f.validate().status, 1);
  }
  f.packet = structuredClone(original);
  fs.symlinkSync(path.join(f.repo, 'outside.txt'), path.join(f.repo, 'src/link'));
  assert.equal(f.context().status, 1);
});

test('Local evidence refuses automatic conversion when a Git repository is initialized', (t) => {
  const f = repair(fixture(t));
  assert.equal(spawnSync('git', ['init', '-q', f.repo]).status, 0);
  assert.equal(f.validate().status, 1);
});
