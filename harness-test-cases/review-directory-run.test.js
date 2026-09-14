'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ROOT = path.resolve(__dirname, '..');
const run = (name, args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', name), ...args], { encoding: 'utf8' });
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

async function fixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-review-directory-run-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const root = path.join(project, '.agents/reviews/local'); fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(path.join(project, 'src')); fs.writeFileSync(path.join(project, 'src/app.js'), 'export const value = 1;\n');
  const args = ['--repo-root', project, '--artifact-root', root];
  const result = run('review-run.mjs', ['init', ...args, '--local', '--scope', '["src"]', '--mode', 'fast']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const { withContentDigest: signed } = await import('../scripts/lib/review-safety.mjs');
  const { digestFile } = await import('../scripts/lib/digests.mjs');
  return { project, root, args, signed, digestFile, validate: (...flags) => run('validate-review-pro-run.mjs', [...args, '--local', ...(flags.includes('--scope') ? [] : ['--scope', '["src"]']), ...flags]) };
}

function materialize(f) {
  const state = read(path.join(f.root, 'state.json'));
  const { repository_identity, comparison, local_scope, base_sha, reviewed_head_sha, diff_digest } = state.target;
  const binding = { repository_identity, comparison, local_scope, base_sha, reviewed_head_sha, diff_digest };
  const evidence = f.signed({ schema_version: 'review-pro/evidence@1', id: 'RPE-LOCAL', type: 'source', ...binding, location: 'src/app.js:1', summary: 'Synthetic source evidence.', collection: { method: 'fixture construction', status: 'provided', captured_at: new Date().toISOString() }, artifact_path: null, artifact_digest: null });
  const finding = f.signed({ schema_version: 'review-pro/finding@1', finding_id: 'RP-LOCAL', category: 'correctness', severity: 'LOW', verification_status: 'REFUTED', confidence: 0, ...binding,
    changed_paths: ['src/app.js'], affected_paths: ['src/app.js'], title: 'Synthetic candidate', expected: 'Export exists.', actual: 'Export exists.', trigger: 'Read source.', failure_mechanism: 'No supported failure.', reachability: 'changed-path', evidence_ids: [evidence.id], impact: 'No evidenced impact.', suspected_boundary: 'src/app.js:1', requires_correction: false, remediation_direction: 'None.', validation_target: 'Inspect source.' });
  write(path.join(f.root, 'evidence/RPE-LOCAL.json'), evidence);
  write(path.join(f.root, 'findings/RP-LOCAL.json'), finding);
  write(path.join(f.root, 'findings.json'), f.signed({ schema_version: 'review-pro/findings@1', ...binding, records: [finding] }));
  write(path.join(f.root, 'lanes/code.json'), f.signed({ schema_version: 'review-pro/lane-report@1', lane_id: 'code', agent: 'code-reviewer', profile: 'review-read-only', ...binding, status: 'passed', evidence_ids: [evidence.id], finding_ids: [finding.finding_id], gaps: ['Synthetic artifact test, not independent runtime review.'] }));
  const fields = ['customer_pain_and_blast_radius', 'resource_category', 'production_scenario', 'trigger_or_precondition', 'affected_component', 'available_log_evidence', 'expected_log_or_trace_signature', 'containment_recommendation', 'permanent_solution_recommendation', 'validation_or_acceptance_test', 'owner_or_next_action'];
  const slots = Array.from({ length: 5 }, (_, index) => ({ rank: index + 1, finding_id: null, evidence_status: 'NO_ADDITIONAL_EVIDENCE_BACKED_RISK', confidence: 0, ...Object.fromEntries(fields.map(field => [field, 'N/A - no additional evidence-backed risk.'])) }));
  write(path.join(f.root, 'production-risks.json'), f.signed({ schema_version: 'review-pro/production-risks@1', repository_identity, comparison, local_scope, reviewed_head_sha, findings_digest: f.digestFile(path.join(f.root, 'findings.json')), slots }));
  fs.writeFileSync(path.join(f.root, 'CODE_REVIEW.md'), '# Local directory review\n\nSynthetic validation fixture. No PR or CI checks performed.\n');
  state.phases = Object.fromEntries(Object.keys(state.phases).map(phase => [phase, 'passed'])); state.current_phase = 10; state.decision = 'SAFE_WITH_CONDITIONS';
  for (const name of ['findings.json', 'production-risks.json', 'CODE_REVIEW.md']) state.outputs[name] = f.digestFile(path.join(f.root, name));
  state.findings = { path: 'findings.json', digest: state.outputs['findings.json'], count: 1 };
  state.production_risks = { path: 'production-risks.json', digest: state.outputs['production-risks.json'], count: 5 };
  write(path.join(f.root, 'state.json'), state);
  return { state, binding, evidence, finding };
}

test('explicit local directory review completes without Git and remains below merge readiness', async t => {
  const f = await fixture(t); const { state } = materialize(f);
  assert.equal(state.target.comparison, 'local-directory'); assert.deepEqual(state.target.local_scope, ['src']);
  const complete = f.validate('--require-complete'); assert.equal(complete.status, 0, complete.stdout + complete.stderr);
  assert.equal(fs.existsSync(path.join(f.project, '.git')), false);
  assert.match(state.evidence_caps.join(' '), /local|PR|pull-request/i);
  state.decision = 'SAFE_TO_MERGE'; write(path.join(f.root, 'state.json'), state);
  assert.match(f.validate('--require-complete').stdout, /local-verdict-cap/);
});

test('local validators require caller authorization and bind the requested scope', async t => {
  const f = await fixture(t);
  const denied = run('validate-review-pro-run.mjs', f.args); assert.notEqual(denied.status, 0); assert.match(denied.stdout, /local|authorization/i);
  const deniedAggregate = run('validate-review-handoffs.mjs', f.args); assert.notEqual(deniedAggregate.status, 0); assert.match(deniedAggregate.stdout, /local|authorization/i);
  const noScope = run('validate-review-pro-run.mjs', [...f.args, '--local']); assert.notEqual(noScope.status, 0); assert.match(noScope.stdout, /scope/);
  const noAggregateScope = run('validate-review-handoffs.mjs', [...f.args, '--local']); assert.notEqual(noAggregateScope.status, 0); assert.match(noAggregateScope.stdout, /scope/);
  const narrowed = f.validate('--scope', '["src/app.js"]'); assert.notEqual(narrowed.status, 0); assert.match(narrowed.stdout, /scope/i);
  assert.match(JSON.parse(narrowed.stdout).summary, /scope.*before source recapture/);
  assert.equal(f.validate('--scope', '["src"]').status, 0);
});

test('local review rechecks selected source while excluding only its exact artifact root', async t => {
  const f = await fixture(t);
  fs.writeFileSync(path.join(f.root, 'notes.md'), 'Allowed artifact.'); assert.equal(f.validate().status, 0);
  fs.writeFileSync(path.join(f.project, 'outside.txt'), 'Not selected.'); assert.equal(f.validate().status, 0);
  fs.writeFileSync(path.join(f.project, 'src/new.js'), 'New selected file.');
  const stale = f.validate(); assert.notEqual(stale.status, 0); assert.match(stale.stdout, /freshness|paths/i);
});

test('fresh hashes on a widened local packet cannot replace independent caller scope', async t => {
  const f = await fixture(t);
  fs.mkdirSync(path.join(f.project, 'outside')); fs.writeFileSync(path.join(f.project, 'outside/private.js'), 'Outside authorized scope.');
  const { captureReviewSource } = await import('../scripts/review-source.mjs');
  const attacker = captureReviewSource({ repositoryRoot: f.project, artifactRoot: f.root, local: true, localScope: ['outside', 'src'], write: false });
  write(path.join(f.root, 'intake.json'), attacker);
  const state = read(path.join(f.root, 'state.json'));
  for (const field of ['local_scope', 'diff_digest', 'changed_files', 'workspace_digest', 'workspace_changed_files', 'captured_at']) state.target[field] = attacker[field];
  write(path.join(f.root, 'state.json'), state);
  const missing = run('validate-review-pro-run.mjs', [...f.args, '--local']); assert.notEqual(missing.status, 0); assert.match(missing.stdout, /scope/);
  const originalScope = f.validate(); assert.notEqual(originalScope.status, 0); assert.match(JSON.parse(originalScope.stdout).summary, /scope.*before source recapture/);
  const aggregate = run('validate-review-handoffs.mjs', [...f.args, '--local', '--scope', '["src"]']); assert.notEqual(aggregate.status, 0); assert.match(aggregate.stdout, /scope/);
});

test('every local evidence binding requires matching scope and correctly paired null commits', async t => {
  const f = await fixture(t); const { state } = materialize(f);
  const { validateJsonSchema } = await import('../scripts/lib/json-schema.mjs');
  const objects = [ ['state', state, value => value.target], ['evidence', read(path.join(f.root, 'evidence/RPE-LOCAL.json')), value => value], ['finding', read(path.join(f.root, 'findings/RP-LOCAL.json')), value => value], ['findings', read(path.join(f.root, 'findings.json')), value => value], ['lane-report', read(path.join(f.root, 'lanes/code.json')), value => value], ['production-risks', read(path.join(f.root, 'production-risks.json')), value => value] ];
  for (const [name, original, target] of objects) {
    const schema = path.join(ROOT, 'schemas/review-pro', name + '.schema.json'); assert.deepEqual(validateJsonSchema(original, schema), [], name);
    for (const mutate of [value => { delete value.local_scope; }, value => { value.local_scope = []; }, value => { value.reviewed_head_sha = 'a'.repeat(40); }, value => { value.comparison = 'initial-working-tree'; }]) {
      const changed = structuredClone(original); mutate(target(changed)); assert.ok(validateJsonSchema(changed, schema).length, name);
    }
  }
  for (const relative of ['evidence/RPE-LOCAL.json', 'lanes/code.json', 'findings.json', 'production-risks.json']) {
    const file = path.join(f.root, relative); const original = read(file); write(file, f.signed({ ...original, local_scope: ['src/app.js'] }));
    const result = f.validate(); assert.notEqual(result.status, 0, relative); assert.match(result.stdout, /scope|binding/i, relative); write(file, original);
  }
  const index = path.join(f.root, 'findings.json'); const findings = read(index); findings.records[0] = f.signed({ ...findings.records[0], local_scope: ['src/app.js'] }); write(index, f.signed(findings));
  assert.match(f.validate().stdout, /scope|binding/i);
});

test('local handoffs preserve explicit authority, immutable scope and a local Debug route', async t => {
  const f = await fixture(t); const { state, binding, finding: candidate, evidence } = materialize(f);
  const finding = f.signed({ ...candidate, verification_status: 'CONFIRMED', requires_correction: true });
  write(path.join(f.root, 'findings/RP-LOCAL.json'), finding);
  const story = Object.fromEntries(['dependency_unavailable', 'simultaneous_execution', 'malicious_input', 'ten_x_volume'].map(name => [name, { status: 'UNVERIFIED', summary: 'Synthetic handoff fixture only.', evidence_ids: [evidence.id] }]));
  const relative = 'debug-handoffs/RP-LOCAL.json';
  const handoff = f.signed({ schema_version: 'review-pro/debug-handoff@2', handoff_id: `${state.run_id}:${finding.finding_id}`, created_at: new Date().toISOString(),
    review: { review_id: state.run_id, finding_id: finding.finding_id, finding_digest: finding.content_digest, artifact_path: 'findings/RP-LOCAL.json', artifact_digest: f.digestFile(path.join(f.root, 'findings/RP-LOCAL.json')) },
    target: { ...binding, pull_request_url: null, files: ['src/app.js'] },
    symptom: { summary: 'Synthetic handoff.', expected: 'Expected behavior.', actual: 'Observed behavior.', customer_impact: 'Fixture only.', side_effect_class: 'pure-read' },
    evidence: [{ id: evidence.id, type: evidence.type, location: evidence.location, summary: evidence.summary, content_digest: evidence.content_digest }],
    reproduction: { prerequisites: ['Read the fixture.'], steps: ['Inspect source.'], expected: 'Expected behavior.', actual: 'Observed behavior.', safety_constraints: ['No external operations.'] },
    suspected_boundary: { provisional: true, component: 'app', location: 'src/app.js:1', reason: 'Synthetic fixture.' },
    logs_and_traces: { request_ids: [], trace_ids: [], evidence_ids: [evidence.id], missing_evidence: ['No runtime evidence in this fixture.'] },
    failure_story: story, acceptance_criteria: ['Inspect the selected source.'], constraints: ['Preserve unrelated files.'], route: { command: 'debug-pro', flag: '--from-review' },
  });
  const file = path.join(f.root, relative); write(file, handoff);
  const invoke = (...flags) => run('validate-review-handoff.mjs', [...f.args, '--handoff', relative, ...flags]);
  assert.notEqual(invoke().status, 0, 'packet cannot authorize local access');
  assert.notEqual(invoke('--local').status, 0, 'packet scope is not independent caller authorization');
  const localArgs = ['--local', '--scope', '["src"]'];
  const valid = invoke(...localArgs); assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  assert.match(JSON.parse(valid.stdout).rendered_command, /^\/debug-pro --local --scope .* --from-review /);
  const aggregate = run('validate-review-handoffs.mjs', [...f.args, '--local', '--scope', '["src"]']); assert.equal(aggregate.status, 0, aggregate.stdout + aggregate.stderr);
  write(file, f.signed({ ...handoff, target: { ...handoff.target, local_scope: ['src/app.js'] } })); assert.match(invoke(...localArgs).stdout, /scope/);
  write(file, f.signed({ ...handoff, target: { ...handoff.target, pull_request_url: 'https://example.invalid/pull/1' } })); assert.match(invoke(...localArgs).stdout, /pull-request/);
  write(file, handoff); fs.writeFileSync(path.join(f.project, 'src/app.js'), 'Post-repair bytes.');
  assert.equal(invoke(...localArgs).status, 0, 'original handoff authentication must remain available after repair; fresh source validation happens separately');
});
