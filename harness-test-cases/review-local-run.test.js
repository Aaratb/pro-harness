'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const script = (name) => path.join(ROOT, 'scripts', name);
const run = (name, args) => childProcess.spawnSync(process.execPath, [script(name), ...args], { encoding: 'utf8' });
const git = (root, args) => childProcess.execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const hash = (bytes) => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
const fileHash = (file) => hash(fs.readFileSync(file));
function canonical(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function signed(value) {
  const copy = structuredClone(value);
  delete copy.content_digest;
  return { ...copy, content_digest: hash(JSON.stringify(canonical(copy))) };
}

function fixture(t, committed = false, beforeInit = () => {}) {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-review-local-'));
  t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
  git(repository, ['init', '-q']);
  for (const [key, value] of [['user.name', 'Review Fixture'], ['user.email', 'review@example.invalid'], ['commit.gpgsign', 'false'], ['core.hooksPath', '/dev/null']]) git(repository, ['config', key, value]);
  fs.mkdirSync(path.join(repository, 'src'));
  fs.writeFileSync(path.join(repository, 'src/index.js'), 'export const value = 1;\n');
  git(repository, ['add', 'src/index.js']);
  if (committed) git(repository, ['commit', '--no-verify', '-qm', 'initial fixture']);
  fs.writeFileSync(path.join(repository, 'src/index.js'), 'export const value = 2;\n');
  fs.writeFileSync(path.join(repository, 'src/new.js'), 'export const added = true;\n');
  beforeInit(repository);
  const resolved = run('resolve-review-root.mjs', ['--repo', repository, '--slug', 'local-review', '--create']);
  assert.equal(resolved.status, 0, resolved.stdout + resolved.stderr);
  const artifactRoot = JSON.parse(resolved.stdout).artifact_root;
  const init = run('review-run.mjs', ['init', '--repo-root', repository, '--artifact-root', artifactRoot, '--working']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  return { repository, artifactRoot, stateFile: path.join(artifactRoot, 'state.json'), validate: (complete = false) => run('validate-review-pro-run.mjs', ['--repo-root', repository, '--artifact-root', artifactRoot, ...(complete ? ['--require-complete'] : [])]) };
}

function materialize({ artifactRoot, stateFile }) {
  const state = read(stateFile);
  const { repository_identity, comparison, base_sha, reviewed_head_sha, diff_digest } = state.target;
  const binding = { repository_identity, comparison, base_sha, reviewed_head_sha, diff_digest };
  const evidence = signed({ schema_version: 'review-pro/evidence@1', id: 'RPE-LOCAL', type: 'source', ...binding,
    location: 'src/index.js:1', summary: 'Synthetic fixture source is present.', collection: { method: 'fixture construction', status: 'provided', captured_at: new Date().toISOString() }, artifact_path: null, artifact_digest: null });
  write(path.join(artifactRoot, 'evidence/RPE-LOCAL.json'), evidence);
  // A refuted synthetic candidate exercises record authentication, not real independent-review proof.
  const finding = signed({ schema_version: 'review-pro/finding@1', finding_id: 'RP-LOCAL', category: 'correctness', severity: 'LOW', verification_status: 'REFUTED', confidence: 0, ...binding,
    changed_paths: ['src/index.js'], affected_paths: ['src/index.js'], title: 'Synthetic candidate', expected: 'The export is present.', actual: 'The export is present.', trigger: 'Read the fixture.', failure_mechanism: 'No supported failure remains.', reachability: 'changed-path', evidence_ids: [evidence.id], impact: 'No evidenced impact.', suspected_boundary: 'src/index.js:1', requires_correction: false, remediation_direction: 'No correction indicated.', validation_target: 'Inspect the bounded source.' });
  write(path.join(artifactRoot, 'findings/RP-LOCAL.json'), finding);
  write(path.join(artifactRoot, 'findings.json'), signed({ schema_version: 'review-pro/findings@1', ...binding, records: [finding] }));
  write(path.join(artifactRoot, 'lanes/code.json'), signed({ schema_version: 'review-pro/lane-report@1', lane_id: 'code', agent: 'code-reviewer', profile: 'review-read-only', ...binding, status: 'passed', evidence_ids: [evidence.id], finding_ids: [finding.finding_id], gaps: ['Synthetic validation fixture, not runtime or CI evidence.'] }));
  const fields = ['customer_pain_and_blast_radius', 'resource_category', 'production_scenario', 'trigger_or_precondition', 'affected_component', 'available_log_evidence', 'expected_log_or_trace_signature', 'containment_recommendation', 'permanent_solution_recommendation', 'validation_or_acceptance_test', 'owner_or_next_action'];
  const slots = Array.from({ length: 5 }, (_, index) => ({ rank: index + 1, finding_id: null, evidence_status: 'NO_ADDITIONAL_EVIDENCE_BACKED_RISK', confidence: 0, ...Object.fromEntries(fields.map(field => [field, 'N/A - no additional evidence-backed risk.'])) }));
  write(path.join(artifactRoot, 'production-risks.json'), signed({ schema_version: 'review-pro/production-risks@1', repository_identity, comparison, reviewed_head_sha, findings_digest: fileHash(path.join(artifactRoot, 'findings.json')), slots }));
  state.findings = { path: 'findings.json', digest: fileHash(path.join(artifactRoot, 'findings.json')), count: 1 };
  state.production_risks = { path: 'production-risks.json', digest: fileHash(path.join(artifactRoot, 'production-risks.json')), count: 5 };
  state.phases = Object.fromEntries(Object.keys(state.phases).map(phase => [phase, 'passed']));
  state.current_phase = 10;
  state.decision = 'SAFE_WITH_CONDITIONS';
  state.evidence_caps.push('Local snapshot only: PR and CI checks were not performed.');
  for (const name of ['CODE_REVIEW.md', 'SCORECARD.md', 'PRODUCTION_READINESS.md', 'PM_REVIEW.md']) fs.writeFileSync(path.join(artifactRoot, name), '# Local review fixture\n\nLocal source reviewed; PR and CI not assessed.\n');
  for (const name of ['CODE_REVIEW.md', 'SCORECARD.md', 'PRODUCTION_READINESS.md', 'PM_REVIEW.md', 'findings.json', 'production-risks.json']) state.outputs[name] = fileHash(path.join(artifactRoot, name));
  write(stateFile, state);
}

test('Unborn local review initializes and completes authenticated artifacts without a commit or remote', t => {
  const context = fixture(t);
  const state = read(context.stateFile);
  assert.equal(state.target.comparison, 'initial-working-tree');
  assert.equal(state.target.base_sha, null);
  assert.equal(state.target.reviewed_head_sha, null);
  assert.deepEqual(state.target.changed_files, ['src/index.js', 'src/new.js']);
  materialize(context);
  const result = context.validate(true);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.notEqual(childProcess.spawnSync('git', ['-C', context.repository, 'rev-parse', '--verify', 'HEAD']).status, 0, 'review must not create a commit');
  const complete = read(context.stateFile);
  complete.decision = 'SAFE_TO_MERGE'; write(context.stateFile, complete);
  assert.match(context.validate(true).stdout, /local-verdict-cap/);
});

test('Local HEAD review needs no upstream and cannot certify merge readiness', t => {
  const context = fixture(t, true);
  const state = read(context.stateFile);
  assert.equal(state.target.comparison, 'working-tree');
  assert.equal(state.target.base_sha, state.target.reviewed_head_sha);
  materialize(context);
  assert.equal(context.validate(true).status, 0);
  const changed = read(context.stateFile);
  changed.decision = 'SAFE_TO_MERGE'; write(context.stateFile, changed);
  const result = context.validate(true);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /local-verdict-cap/);
});

test('Unborn artifact writes are excluded but sibling artifacts and source changes invalidate evidence', t => {
  const context = fixture(t);
  fs.writeFileSync(path.join(context.artifactRoot, 'notes.md'), 'Allowed review notes.\n');
  assert.equal(context.validate().status, 0);
  fs.mkdirSync(path.join(context.repository, '.agents/other'), { recursive: true });
  fs.writeFileSync(path.join(context.repository, '.agents/other/output.md'), 'Outside this review.\n');
  const sibling = context.validate();
  assert.notEqual(sibling.status, 0);
  assert.match(sibling.stdout, /freshness|source-paths/);
  fs.rmSync(path.join(context.repository, '.agents/other'), { recursive: true });
  fs.appendFileSync(path.join(context.repository, 'src/index.js'), 'export const drift = true;\n');
  assert.notEqual(context.validate().status, 0);
});

test('First commit after unborn capture invalidates that review even with unchanged source bytes', t => {
  const context = fixture(t);
  git(context.repository, ['add', 'src']);
  git(context.repository, ['commit', '--no-verify', '-qm', 'first commit after capture']);
  const result = context.validate();
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /HEAD|unborn|initial|head/i);
});

test('Unborn evidence still rejects tampering and forged comparison kinds', t => {
  const context = fixture(t);
  materialize(context);
  const evidenceFile = path.join(context.artifactRoot, 'evidence/RPE-LOCAL.json');
  const original = read(evidenceFile);
  write(evidenceFile, { ...original, summary: 'Changed without authentication.' });
  assert.match(context.validate().stdout, /evidence-digest/);
  write(evidenceFile, signed({ ...original, comparison: 'working-tree' }));
  assert.notEqual(context.validate().status, 0);
  write(evidenceFile, original);
  const state = read(context.stateFile);
  state.target.comparison = 'committed-range'; write(context.stateFile, state);
  assert.notEqual(context.validate().status, 0);
});

test('Snapshot schema variants require explicit comparison and correctly paired null commits', async t => {
  const context = fixture(t);
  materialize(context);
  const { validateJsonSchema } = await import('../scripts/lib/json-schema.mjs');
  const objects = [
    ['state', read(context.stateFile), value => value.target],
    ['evidence', read(path.join(context.artifactRoot, 'evidence/RPE-LOCAL.json')), value => value],
    ['finding', read(path.join(context.artifactRoot, 'findings/RP-LOCAL.json')), value => value],
    ['findings', read(path.join(context.artifactRoot, 'findings.json')), value => value],
    ['lane-report', read(path.join(context.artifactRoot, 'lanes/code.json')), value => value],
    ['production-risks', read(path.join(context.artifactRoot, 'production-risks.json')), value => value],
  ];
  for (const [name, original, binding] of objects) {
    const schema = path.join(ROOT, 'schemas/review-pro', `${name}.schema.json`);
    assert.deepEqual(validateJsonSchema(original, schema), [], `${name}: valid initial binding`);
    for (const mutate of [target => { delete target.comparison; }, target => { target.comparison = 'committed-range'; }, target => { target.reviewed_head_sha = 'a'.repeat(40); }]) {
      const invalid = structuredClone(original); mutate(binding(invalid));
      assert.ok(validateJsonSchema(invalid, schema).length, `${name}: invalid initial binding must fail`);
    }
  }
});

test('Aggregate findings authenticate base SHA', t => {
  const context = fixture(t, true);
  materialize(context);
  const findingsFile = path.join(context.artifactRoot, 'findings.json');
  const findings = read(findingsFile);
  findings.base_sha = 'f'.repeat(40);
  write(findingsFile, signed(findings));
  const result = context.validate();
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /findings-binding/);
});

test('Commit-backed evidence cannot forge a different comparison even with a valid content digest', t => {
  const context = fixture(t, true);
  materialize(context);
  for (const [relative, expected] of [['evidence/RPE-LOCAL.json', /evidence-binding/], ['lanes/code.json', /lane-binding/], ['findings.json', /findings-binding/], ['production-risks.json', /risks-binding/]]) {
    const file = path.join(context.artifactRoot, relative);
    const original = read(file);
    write(file, signed({ ...original, comparison: 'committed-range' }));
    const result = context.validate();
    assert.notEqual(result.status, 0, relative);
    assert.match(result.stdout, expected, relative);
    write(file, original);
  }
});

test('Legacy commit-backed artifacts may derive omitted comparison from current authenticated intake', t => {
  const context = fixture(t, true);
  materialize(context);
  const removeComparison = value => { const copy = structuredClone(value); delete copy.comparison; return signed(copy); };
  for (const relative of ['evidence/RPE-LOCAL.json', 'findings/RP-LOCAL.json', 'lanes/code.json']) {
    const file = path.join(context.artifactRoot, relative); write(file, removeComparison(read(file)));
  }
  const findingsFile = path.join(context.artifactRoot, 'findings.json');
  const findings = read(findingsFile);
  findings.records = findings.records.map(removeComparison);
  write(findingsFile, removeComparison(findings));
  const risksFile = path.join(context.artifactRoot, 'production-risks.json');
  const risks = read(risksFile); risks.findings_digest = fileHash(findingsFile);
  write(risksFile, removeComparison(risks));
  const state = read(context.stateFile);
  delete state.target.comparison;
  state.findings.digest = state.outputs['findings.json'] = fileHash(findingsFile);
  state.production_risks.digest = state.outputs['production-risks.json'] = fileHash(risksFile);
  write(context.stateFile, state);
  const result = context.validate(true);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('Initial snapshot coverage gaps must remain visible without blocking an explicitly capped local review', t => {
  const context = fixture(t, false, repository => fs.writeFileSync(path.join(repository, 'large.bin'), Buffer.alloc(4 * 1024 * 1024 + 1)));
  const intake = read(path.join(context.artifactRoot, 'intake.json'));
  assert.deepEqual(intake.evidence_gaps, ['large.bin: initial content was not hashed']);
  materialize(context);
  const capped = context.validate(true);
  assert.equal(capped.status, 0, capped.stdout + capped.stderr);
  const state = read(context.stateFile);
  state.evidence_caps = state.evidence_caps.filter(cap => !intake.evidence_gaps.includes(cap));
  write(context.stateFile, state);
  const hidden = context.validate(true);
  assert.notEqual(hidden.status, 0);
  assert.match(hidden.stdout, /source-coverage/);
});
