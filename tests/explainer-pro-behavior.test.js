'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const node = process.execPath;
const script = (name) => path.join(ROOT, 'scripts', name);

function git(repository, args) {
  return childProcess.execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8' });
}

function repositoryFixture(prefix = 'pro-harness-explainer-') {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  git(repository, ['init', '-q']);
  git(repository, ['config', 'user.name', 'Explainer Pro Test']);
  git(repository, ['config', 'user.email', 'explainer-pro@example.invalid']);
  git(repository, ['config', 'commit.gpgsign', 'false']);
  git(repository, ['config', 'core.hooksPath', '/dev/null']);
  fs.mkdirSync(path.join(repository, 'src'));
  fs.writeFileSync(path.join(repository, 'src', 'helper.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(repository, 'src', 'index.js'), "import { value } from './helper.js';\nexport const result = value + 1;\n");
  fs.writeFileSync(path.join(repository, 'README.md'), '# Fixture\n');
  git(repository, ['add', '.']);
  git(repository, ['commit', '--no-verify', '-q', '-m', 'fixture']);
  return repository;
}

function resolveRoot(repository, slug = 'sample-repository') {
  return JSON.parse(childProcess.execFileSync(node, [script('resolve-explainer-root.mjs'), '--repo', repository, '--slug', slug, '--create'], { encoding: 'utf8' }));
}

function initialize(repository, artifactRoot, mode = 'COURSE', audience = 'PM') {
  return JSON.parse(childProcess.execFileSync(node, [script('explainer-course.mjs'), 'init', '--repo-root', repository, '--artifact-root', artifactRoot, '--mode', mode, '--audience', audience], { encoding: 'utf8' }));
}

function writeCapabilityFixture(artifactRoot, capability, phase, prerequisites, fingerprint, suffix = 'one', quiz = []) {
  const claimId = `claim-${capability}-${suffix}`;
  const section = {
    schema_version: 'explainer-pro/section@1', id: capability, capability, phase, title: capability,
    prerequisites, claim_ids: [claimId],
    content: { orientation: `Why ${capability} matters.`, mechanism: `How ${capability} works.`, evidence: `src/index.js:1 ${capability}`, consequence: `What changes around ${capability}.` },
    status: 'gated', source_fingerprint_sha256: fingerprint, diagrams: [], quiz,
  };
  const claims = {
    schema_version: 'explainer-pro/claims@1',
    records: [{ id: claimId, owner_section: capability, type: 'behavior', level: 'CONFIRMED', text: `${capability} is evidenced`, cite: 'src/index.js:1', quote: 'import', material: true, independently_verified: true, gated_at: new Date().toISOString() }],
  };
  fs.writeFileSync(path.join(artifactRoot, 'work', `${capability}.json`), `${JSON.stringify(section, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactRoot, 'work', `${capability}-claims.json`), `${JSON.stringify(claims, null, 2)}\n`);
  return { section: `work/${capability}.json`, claims: `work/${capability}-claims.json`, claimId };
}

function publish(repository, artifactRoot, fixture, certified = false) {
  const args = [script('explainer-course.mjs'), 'publish', '--repo-root', repository, '--artifact-root', artifactRoot, '--section', fixture.section, '--claims', fixture.claims];
  if (certified) args.push('--certified');
  return JSON.parse(childProcess.execFileSync(node, args, { encoding: 'utf8' }));
}

function publishBatch(repository, artifactRoot, fixtures, certified = false) {
  fs.writeFileSync(path.join(artifactRoot, 'work', 'batch.json'), JSON.stringify(fixtures.map(({ section, claims }) => ({ section, claims }))));
  return childProcess.spawnSync(node, [script('explainer-course.mjs'), 'publish', '--repo-root', repository, '--artifact-root', artifactRoot, '--batch', 'work/batch.json', ...(certified ? ['--certified'] : [])], { encoding: 'utf8' });
}

function addDiagram(artifactRoot, fixture, source, id = 'path') {
  const file = path.join(artifactRoot, fixture.section);
  const section = JSON.parse(fs.readFileSync(file));
  section.diagrams.push({ id, title: 'Follow the request', source, rendered_svg: null, alt: 'The caller asks the application, which reads storage and returns a result.', claim_ids: [fixture.claimId] });
  fs.writeFileSync(file, JSON.stringify(section));
}

function completeCourseFixture(repository, artifactRoot, beforePublish = () => {}) {
  const statePath = path.join(artifactRoot, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath));
  const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'explainer-pro.json')));
  const phases = { 'repo-map': 2, 'reading-plan': 2, architecture: 3, 'feature-map': 4, 'trace-feature': 4, 'business-logic': 4, 'explain-file': 4, 'explain-function': 4, sequence: 4, change: 4, 'dependency-graph': 5, 'data-model': 5, 'sync-async': 5, libraries: 6, conventions: 6, glossary: 6, quiz: 7 };
  const fixtures = policy.section_order.filter((capability) => capability !== 'codemap').map((capability) => writeCapabilityFixture(artifactRoot, capability, phases[capability], policy.capability_dependencies[capability], state.source_fingerprint.worktree_sha256));
  for (const capability of ['architecture', 'sequence', 'dependency-graph']) {
    const fixture = fixtures.find(({ section }) => section === `work/${capability}.json`);
    addDiagram(artifactRoot, fixture, capability === 'sequence' ? 'sequenceDiagram\nparticipant Caller\nparticipant App\nCaller->>App: request\nApp-->>Caller: result' : 'flowchart LR\nCaller --> App\nApp --> Storage');
  }
  state.phases['1'] = 'passed';
  beforePublish(state, fixtures);
  fs.writeFileSync(statePath, JSON.stringify(state));
  const result = publishBatch(repository, artifactRoot, fixtures, true);
  assert.equal(result.status, 0, result.stdout);
  return state;
}

test('FSB audience normalizes and survives validated course publication and rendering', () => {
  for (const audience of ['fsb', 'FSB']) {
    const repository = repositoryFixture();
    try {
      const { artifact_root: artifactRoot } = resolveRoot(repository);
      initialize(repository, artifactRoot, 'COURSE', audience);
      const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json')));
      assert.equal(state.audience, 'FSB');
      publish(repository, artifactRoot, writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], state.source_fingerprint.worktree_sha256));
      const generationId = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
      const generationRoot = path.join(artifactRoot, 'generations', generationId);
      const manifestPath = path.join(generationRoot, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath));
      assert.equal(manifest.audience, 'FSB');
      assert.equal(JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).audience, 'FSB');
      assert.match(fs.readFileSync(path.join(generationRoot, 'EXPLAINER.md'), 'utf8'), /^Audience: FSB$/m);
      assert.match(fs.readFileSync(path.join(generationRoot, 'course.html'), 'utf8'), /FSB audience/);
      for (const validator of ['validate-explainer-course.mjs', 'validate-explainer-pro-run.mjs']) {
        const result = childProcess.spawnSync(node, [script(validator), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stdout);
      }
      manifest.audience = 'UNKNOWN';
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
      const invalidManifest = childProcess.spawnSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
      assert.notEqual(invalidManifest.status, 0);
      assert.match(invalidManifest.stdout, /audience/);
    } finally { fs.rmSync(repository, { recursive: true, force: true }); }
  }
});

test('existing PM ENG and STAFF audiences remain accepted', () => {
  for (const audience of ['PM', 'ENG', 'STAFF']) {
    const repository = repositoryFixture();
    try {
      const { artifact_root: artifactRoot } = resolveRoot(repository);
      initialize(repository, artifactRoot, 'COURSE', audience);
      assert.equal(JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).audience, audience);
      const validation = childProcess.spawnSync(node, [script('validate-explainer-pro-run.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
      assert.equal(validation.status, 0, validation.stdout);
    } finally { fs.rmSync(repository, { recursive: true, force: true }); }
  }
});

test('invalid audience is rejected by intake and state validation', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    const invalid = childProcess.spawnSync(node, [script('explainer-course.mjs'), 'init', '--repo-root', repository, '--artifact-root', artifactRoot, '--audience', 'UNKNOWN'], { encoding: 'utf8' });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stdout, /audience must be one of/);
    const statePath = path.join(artifactRoot, 'state.json');
    assert.equal(fs.existsSync(statePath), false);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(statePath));
    state.audience = 'UNKNOWN';
    fs.writeFileSync(statePath, JSON.stringify(state));
    const invalidState = childProcess.spawnSync(node, [script('validate-explainer-pro-run.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.notEqual(invalidState.status, 0);
    assert.match(invalidState.stdout, /audience/);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('course publisher batches related prerequisites into one immutable checkpoint', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    const repoMap = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint);
    const reading = writeCapabilityFixture(artifactRoot, 'reading-plan', 2, ['repo-map'], fingerprint);
    const result = publishBatch(repository, artifactRoot, [reading, repoMap]);
    assert.equal(result.status, 0, result.stdout);
    const generations = fs.readdirSync(path.join(artifactRoot, 'generations'));
    assert.equal(generations.length, 1);
    const manifest = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'generations', generations[0], 'manifest.json')));
    assert.deepEqual(manifest.sections.map(({ id }) => id), ['repo-map', 'reading-plan']);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json')));
    assert.equal(state.capabilities['repo-map'], 'passed');
    assert.equal(state.capabilities['reading-plan'], 'passed');
    assert.deepEqual(state.invalidated_sections, []);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('batch refresh replaces changed dependencies and preserves only unchanged verified evidence', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    const map = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint);
    const architecture = writeCapabilityFixture(artifactRoot, 'architecture', 3, ['repo-map'], fingerprint);
    const feature = writeCapabilityFixture(artifactRoot, 'feature-map', 4, ['repo-map', 'architecture'], fingerprint);
    const trace = writeCapabilityFixture(artifactRoot, 'trace-feature', 4, ['feature-map'], fingerprint);
    for (const fixture of [map, architecture, feature, trace]) publish(repository, artifactRoot, fixture);
    const previous = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    const preservedMap = fs.readFileSync(path.join(artifactRoot, 'generations', previous, 'sections', 'repo-map.json'), 'utf8');
    const changedArchitecture = writeCapabilityFixture(artifactRoot, 'architecture', 3, ['repo-map'], fingerprint, 'two');
    const changedFeature = writeCapabilityFixture(artifactRoot, 'feature-map', 4, ['repo-map', 'architecture'], fingerprint, 'two');
    const result = publishBatch(repository, artifactRoot, [changedFeature, changedArchitecture]);
    assert.equal(result.status, 0, result.stdout);
    assert.deepEqual(JSON.parse(result.stdout).invalidated, ['trace-feature']);
    const current = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'generations', current, 'sections', 'repo-map.json'), 'utf8'), preservedMap);
    const claims = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'generations', current, 'claims.json'))).records;
    assert.ok(claims.some(({ id }) => id === map.claimId));
    assert.ok(claims.some(({ id }) => id === changedFeature.claimId));
    assert.ok(!claims.some(({ id }) => id === trace.claimId || id === feature.claimId));
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json')));
    assert.equal(state.capabilities['feature-map'], 'passed');
    assert.equal(state.capabilities['trace-feature'], 'stale');
    assert.ok(fs.existsSync(path.join(artifactRoot, 'generations', previous)));
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('failed batch leaves CURRENT and state unchanged and no partial generation', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    publish(repository, artifactRoot, writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint));
    const pointer = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
    const state = fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8');
    const architecture = writeCapabilityFixture(artifactRoot, 'architecture', 3, ['repo-map'], fingerprint);
    const missingTracePrerequisite = writeCapabilityFixture(artifactRoot, 'business-logic', 4, ['trace-feature'], fingerprint);
    const rejected = publishBatch(repository, artifactRoot, [architecture, missingTracePrerequisite]);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout, /missing prerequisite capability trace-feature/);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), pointer);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'), state);
    assert.equal(fs.readdirSync(path.join(artifactRoot, 'generations')).length, 1);
    const reading = writeCapabilityFixture(artifactRoot, 'reading-plan', 2, ['repo-map'], fingerprint);
    const sectionPath = path.join(artifactRoot, reading.section);
    const section = JSON.parse(fs.readFileSync(sectionPath));
    fs.writeFileSync(path.join(artifactRoot, 'work', 'unsafe.svg'), '<svg><script>unsafe()</script></svg>');
    section.diagrams.push({ id: 'unsafe', title: 'Unsafe', source: 'flowchart LR; A-->B', rendered_svg: 'work/unsafe.svg', alt: 'Unsafe fixture', claim_ids: [reading.claimId] });
    fs.writeFileSync(sectionPath, JSON.stringify(section));
    const stagedFailure = publishBatch(repository, artifactRoot, [architecture, reading]);
    assert.notEqual(stagedFailure.status, 0);
    assert.match(stagedFailure.stdout, /forbidden active content/);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), pointer);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'), state);
    assert.equal(fs.readdirSync(path.join(artifactRoot, 'generations')).length, 1);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('batch rejects duplicate or independently ungated members and stale source', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    const map = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint);
    const duplicate = publishBatch(repository, artifactRoot, [map, map]);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stdout, /duplicate capability/);
    const claims = JSON.parse(fs.readFileSync(path.join(artifactRoot, map.claims)));
    claims.records[0].independently_verified = false;
    fs.writeFileSync(path.join(artifactRoot, map.claims), JSON.stringify(claims));
    const ungated = publishBatch(repository, artifactRoot, [map]);
    assert.notEqual(ungated.status, 0);
    assert.match(ungated.stdout, /not independently verified/);
    fs.appendFileSync(path.join(repository, 'src', 'index.js'), 'export const drift = true;\n');
    const stale = publishBatch(repository, artifactRoot, [map]);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stdout, /source fingerprint changed/);
    assert.equal(fs.existsSync(path.join(artifactRoot, 'CURRENT')), false);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('course validation rejects source drift before accepting reused evidence', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    publish(repository, artifactRoot, writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint));
    fs.appendFileSync(path.join(repository, 'src', 'index.js'), 'export const drift = true;\n');
    const result = childProcess.spawnSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, 'changed source must not pass completion');
    assert.match(result.stdout, /source-fingerprint/);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('completion validates actual workflow identity rather than trusting passed state prose', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const statePath = path.join(artifactRoot, 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath));
    state.workflow_trace.status = 'passed';
    fs.writeFileSync(statePath, JSON.stringify(state));
    const complete = () => childProcess.spawnSync(node, [script('validate-explainer-pro-run.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot, '--require-complete'], { encoding: 'utf8' });
    let result = JSON.parse(complete().stdout);
    assert.ok(result.verification.some(({ code, status }) => code === 'workflow-trace' && status === 'failed'), 'missing trace must not be certified by state');
    childProcess.execFileSync(node, [script('record-workflow-event.mjs'), '--artifact-root', artifactRoot, '--workflow', 'explainer-pro', '--run-id', 'different-run', '--event', 'run-started', '--summary', 'Observed fixture start'], { encoding: 'utf8' });
    result = JSON.parse(complete().stdout);
    assert.ok(result.verification.some(({ code, status }) => code === 'workflow-trace' && status === 'failed'), 'mismatched run must not pass');
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('batch comprehension reuses confirmed taught claims without cloning their ownership', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    completeCourseFixture(repository, artifactRoot, (_state, fixtures) => {
      const quiz = fixtures.at(-1);
      const section = JSON.parse(fs.readFileSync(path.join(artifactRoot, quiz.section)));
      section.quiz = [{ question: 'What does the mapped entry point do?', options: ['The evidenced action', 'An unsupported action'], correct_index: 0, explanations: ['The mapped source confirms it.', 'The mapped source does not show this.'], claim_ids: [fixtures[0].claimId] }];
      fs.writeFileSync(path.join(artifactRoot, quiz.section), JSON.stringify(section));
    });
    const current = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    const claims = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'generations', current, 'claims.json'))).records;
    assert.equal(claims.filter(({ id }) => id === 'claim-repo-map-one').length, 1);
    assert.equal(claims.find(({ id }) => id === 'claim-repo-map-one').owner_section, 'repo-map');
    const validation = childProcess.spawnSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.equal(validation.status, 0, validation.stdout);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('recovered trace completes only with validator-backed disclosure and intact course evidence', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = completeCourseFixture(repository, artifactRoot, (candidate) => {
      candidate.workflow_trace.status = 'degraded';
      candidate.coverage.limitations.push('Workflow tracing is recovered-with-gaps; this does not certify source evidence or approvals.');
    });
    const row = (event, extra = {}) => ({ schema_version: 'pro-harness/workflow-event@1', event_id: crypto.randomUUID(), run_id: state.run_id, workflow: 'explainer-pro', event, status: 'passed', occurred_at: '2026-09-05T04:00:00.000Z', summary: 'Observed fixture event', artifacts: [], ...extra });
    const original = [row('phase-completed', { phase: 1 }), row('run-started')].map(JSON.stringify).join('\n') + '\n';
    fs.writeFileSync(path.join(artifactRoot, 'run-events.jsonl'), original);
    fs.writeFileSync(path.join(artifactRoot, 'checkpoint.md'), '# Trace reconciliation\nCourse gates must still pass independently.\n');
    const recovery = childProcess.spawnSync(node, [script('recover-workflow-trace.mjs'), '--artifact-root', artifactRoot, '--workflow', 'explainer-pro', '--run-id', state.run_id, '--checkpoint', 'checkpoint.md', '--approval', 'User approved trace-only continuation'], { encoding: 'utf8' });
    assert.equal(recovery.status, 0, recovery.stdout);
    const complete = () => childProcess.spawnSync(node, [script('validate-explainer-pro-run.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot, '--require-complete'], { encoding: 'utf8' });
    let result = complete();
    assert.equal(result.status, 0, result.stdout);
    let report = JSON.parse(result.stdout);
    assert.equal(report.workflow_trace.trace_status, 'recovered-with-gaps');
    assert.equal(report.workflow_trace.history.verification.sequence, 'fail');
    assert.equal(report.workflow_trace.verification.sequence, 'pass');
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'run-events.jsonl'), 'utf8'), original);
    const statePath = path.join(artifactRoot, 'state.json');
    const currentState = JSON.parse(fs.readFileSync(statePath));
    currentState.workflow_trace.status = 'passed';
    fs.writeFileSync(statePath, JSON.stringify(currentState));
    result = complete();
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /workflow-trace-state/);
    currentState.workflow_trace.status = 'degraded';
    currentState.coverage.limitations = [];
    fs.writeFileSync(statePath, JSON.stringify(currentState));
    result = complete();
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /workflow-trace-disclosure/);
    currentState.coverage.limitations = state.coverage.limitations;
    fs.writeFileSync(statePath, JSON.stringify(currentState));
    fs.appendFileSync(path.join(repository, 'src', 'index.js'), 'export const drift = true;\n');
    result = complete();
    assert.notEqual(result.status, 0);
    report = JSON.parse(result.stdout);
    assert.ok(report.verification.some(({ code, status }) => code === 'course-validation' && status === 'failed'));
    assert.equal(report.workflow_trace.trace_status, 'recovered-with-gaps', 'trace recovery must not bypass stale source');
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('batch rejects tampered retained evidence and leaves the current generation untouched', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    publish(repository, artifactRoot, writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint));
    const pointer = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
    fs.appendFileSync(path.join(artifactRoot, 'generations', pointer.trim(), 'claims.json'), '\n');
    const reading = writeCapabilityFixture(artifactRoot, 'reading-plan', 2, ['repo-map'], fingerprint);
    const result = publishBatch(repository, artifactRoot, [reading]);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /cannot reuse changed artifact claims.json/);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), pointer);
    assert.equal(fs.readdirSync(path.join(artifactRoot, 'generations')).length, 1);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('retained rendered diagram bytes must match their published digest before reuse', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    const map = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint);
    const section = JSON.parse(fs.readFileSync(path.join(artifactRoot, map.section)));
    fs.writeFileSync(path.join(artifactRoot, 'work', 'map.svg'), '<svg><text>Verified</text></svg>');
    section.diagrams.push({ id: 'map', title: 'Map', source: 'flowchart LR; A-->B', rendered_svg: 'work/map.svg', alt: 'Verified map', claim_ids: [map.claimId] });
    fs.writeFileSync(path.join(artifactRoot, map.section), JSON.stringify(section));
    publish(repository, artifactRoot, map);
    const pointer = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
    const diagram = path.join(artifactRoot, 'generations', pointer.trim(), 'diagrams', 'repo-map-map.svg');
    fs.writeFileSync(diagram, '<svg><text>Different meaning</text></svg>');
    const validation = childProcess.spawnSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.notEqual(validation.status, 0, 'a safe SVG is not necessarily the verified SVG');
    const reading = writeCapabilityFixture(artifactRoot, 'reading-plan', 2, ['repo-map'], fingerprint);
    const result = publishBatch(repository, artifactRoot, [reading]);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /cannot reuse changed artifact diagrams\/repo-map-map.svg/);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), pointer);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('stable claim identifiers do not hide changed quiz or diagram dependencies', () => {
  for (const dependent of ['quiz', 'glossary']) {
    const repository = repositoryFixture();
    try {
      const { artifact_root: artifactRoot } = resolveRoot(repository);
      initialize(repository, artifactRoot);
      const state = completeCourseFixture(repository, artifactRoot, (_state, fixtures) => {
        const fixture = fixtures.find(({ section }) => section === `work/${dependent}.json`);
        const section = JSON.parse(fs.readFileSync(path.join(artifactRoot, fixture.section)));
        if (dependent === 'quiz') section.quiz = [{ question: 'Is the rule enabled?', options: ['Enabled', 'Disabled'], correct_index: 0, explanations: ['The original rule enables it.', 'This was not the original rule.'], claim_ids: ['claim-business-logic-one'] }];
        else section.diagrams = [{ id: 'rule', title: 'Rule', source: 'flowchart LR; Rule-->Enabled', rendered_svg: null, alt: 'Rule enables outcome', claim_ids: ['claim-business-logic-one'] }];
        fs.writeFileSync(path.join(artifactRoot, fixture.section), JSON.stringify(section));
      });
      const replacement = writeCapabilityFixture(artifactRoot, 'business-logic', 4, ['trace-feature'], state.source_fingerprint.worktree_sha256);
      const claimsPath = path.join(artifactRoot, replacement.claims);
      const claims = JSON.parse(fs.readFileSync(claimsPath));
      claims.records[0].text = 'Independent re-grounding found the rule is disabled.';
      fs.writeFileSync(claimsPath, JSON.stringify(claims));
      const pointer = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
      const certified = publishBatch(repository, artifactRoot, [replacement], true);
      assert.notEqual(certified.status, 0, 'must not certify an unchanged dependent answer against changed evidence');
      assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), pointer);
      const partial = publishBatch(repository, artifactRoot, [replacement]);
      assert.equal(partial.status, 0, partial.stdout);
      assert.ok(JSON.parse(partial.stdout).invalidated.includes(dependent));
      assert.ok(JSON.parse(partial.stdout).invalidated.includes('quiz'), 'dynamic dependency invalidation must propagate transitively');
      const current = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
      const manifest = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'generations', current, 'manifest.json')));
      assert.equal(manifest.sections.some(({ id }) => id === dependent), false);
      if (dependent === 'quiz') {
        const quizPath = path.join(artifactRoot, 'work', 'quiz.json');
        const quiz = JSON.parse(fs.readFileSync(quizPath));
        quiz.quiz[0].correct_index = 1;
        quiz.quiz[0].explanations = ['The re-grounded rule is no longer enabled.', 'The corrected claim confirms it is disabled.'];
        fs.writeFileSync(quizPath, JSON.stringify(quiz));
        const refreshed = publishBatch(repository, artifactRoot, [replacement, { section: 'work/quiz.json', claims: 'work/quiz-claims.json' }], true);
        assert.equal(refreshed.status, 0, 'a freshly grounded dependent supplied in the same batch may be certified');
        assert.deepEqual(JSON.parse(refreshed.stdout).invalidated, []);
      }
    } finally { fs.rmSync(repository, { recursive: true, force: true }); }
  }
});

test('Explainer root resolver is repository-local and rejects traversal and symlink escapes', () => {
  const repository = repositoryFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-explainer-outside-'));
  try {
    const probe = JSON.parse(childProcess.execFileSync(node, [script('resolve-explainer-root.mjs'), '--repo', repository, '--slug', 'course'], { encoding: 'utf8' }));
    assert.equal(probe.created, false);
    assert.equal(fs.existsSync(path.join(repository, '.agents')), false);
    const created = resolveRoot(repository, 'course');
    assert.equal(created.artifact_relative, '.agents/explanations/course');
    const traversal = childProcess.spawnSync(node, [script('resolve-explainer-root.mjs'), '--repo', repository, '--slug', '../escape', '--create'], { encoding: 'utf8' });
    assert.notEqual(traversal.status, 0);
    fs.rmSync(path.join(repository, '.agents'), { recursive: true, force: true });
    fs.symlinkSync(outside, path.join(repository, '.agents'));
    const symlink = childProcess.spawnSync(node, [script('resolve-explainer-root.mjs'), '--repo', repository, '--slug', 'course', '--create'], { encoding: 'utf8' });
    assert.notEqual(symlink.status, 0);
    assert.equal(fs.readdirSync(outside).length, 0);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('source fingerprint excludes the exact artifact root but detects source changes', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    const run = () => {
      childProcess.execFileSync(node, [script('explainer-source.mjs'), 'fingerprint', '--repo', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
      return JSON.parse(fs.readFileSync(path.join(artifactRoot, 'source-fingerprint.json'), 'utf8'));
    };
    const first = run();
    fs.writeFileSync(path.join(artifactRoot, 'ignored.txt'), 'new artifact\n');
    const second = run();
    assert.equal(second.worktree_sha256, first.worktree_sha256);
    fs.appendFileSync(path.join(repository, 'src', 'index.js'), 'export const changed = true;\n');
    const third = run();
    assert.notEqual(third.worktree_sha256, first.worktree_sha256);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('dependency helper emits local edges and a deterministic order without executing target code', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    childProcess.execFileSync(node, [script('explainer-source.mjs'), 'dependencies', '--repo', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    const graph = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'dependency-graph.json'), 'utf8'));
    assert.ok(graph.edges.some((edge) => edge.source === 'src/index.js' && edge.target === 'src/helper.js' && edge.kind === 'local'));
    assert.deepEqual(graph.cyclic_nodes, []);
    assert.ok(graph.topological_order.includes('src/index.js'));
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('course publisher creates immutable generations and invalidates transitive dependents', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
    const fingerprint = state.source_fingerprint.worktree_sha256;
    const repoMap = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint);
    const first = publish(repository, artifactRoot, repoMap);
    const architecture = writeCapabilityFixture(artifactRoot, 'architecture', 3, ['repo-map'], fingerprint);
    const second = publish(repository, artifactRoot, architecture);
    const featureMap = writeCapabilityFixture(artifactRoot, 'feature-map', 4, ['repo-map', 'architecture'], fingerprint);
    const third = publish(repository, artifactRoot, featureMap);
    const replacement = writeCapabilityFixture(artifactRoot, 'architecture', 3, ['repo-map'], fingerprint, 'two');
    const fourth = publish(repository, artifactRoot, replacement);
    assert.notEqual(first.summary, second.summary);
    assert.ok(fourth.invalidated.includes('feature-map'));
    const current = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    const manifest = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'generations', current, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest.sections.map(({ id }) => id), ['repo-map', 'architecture']);
    assert.ok(fs.existsSync(path.join(artifactRoot, 'generations', third.summary.match(/generation ([^ ]+)/)[1])));
    const validation = JSON.parse(childProcess.execFileSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' }));
    assert.equal(validation.status, 'success');
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('course publisher carries sanitized diagrams into each immutable generation', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
    const repoMap = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], state.source_fingerprint.worktree_sha256);
    const sectionPath = path.join(artifactRoot, repoMap.section);
    const section = JSON.parse(fs.readFileSync(sectionPath, 'utf8'));
    fs.writeFileSync(path.join(artifactRoot, 'work', 'repo-map.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="4"/></svg>\n');
    section.diagrams.push({ id: 'map', title: 'Repository map', source: 'flowchart LR; A-->B', rendered_svg: 'work/repo-map.svg', alt: 'Repository map test diagram', claim_ids: [repoMap.claimId] });
    fs.writeFileSync(sectionPath, `${JSON.stringify(section, null, 2)}\n`);
    publish(repository, artifactRoot, repoMap);
    const architecture = writeCapabilityFixture(artifactRoot, 'architecture', 3, ['repo-map'], state.source_fingerprint.worktree_sha256);
    publish(repository, artifactRoot, architecture);

    const generationId = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    const published = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'generations', generationId, 'sections', 'repo-map.json'), 'utf8'));
    assert.equal(published.diagrams[0].rendered_svg, `generations/${generationId}/diagrams/repo-map-map.svg`);
    assert.ok(fs.existsSync(path.join(artifactRoot, published.diagrams[0].rendered_svg)));
    const html = fs.readFileSync(path.join(artifactRoot, 'generations', generationId, 'course.html'), 'utf8');
    const encoded = html.match(/src="data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)"/);
    assert.ok(encoded, 'each SVG must be isolated in an offline vector image');
    assert.match(Buffer.from(encoded[1], 'base64').toString('utf8'), /<circle\b/);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('publisher renders source-only sequence diagrams locally instead of presenting source as the visual', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const fingerprint = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'))).source_fingerprint.worktree_sha256;
    const fixture = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], fingerprint);
    const source = 'sequenceDiagram\nparticipant CLI\nparticipant App\nparticipant DB\nparticipant UI\nCLI->>App: probe signed readiness\nCLI->>DB: provision synthetic inputs and run replay\nCLI->>App: bootstrap local session\nCLI->>UI: print /replay/{runId}\nUI->>App: POST /api/local-session\nUI->>App: GET status and cases\nApp->>DB: scoped terminal evidence queries\nUI->>App: GET exact case detail';
    addDiagram(artifactRoot, fixture, source);
    publish(repository, artifactRoot, fixture);
    const generation = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    const root = path.join(artifactRoot, 'generations', generation);
    const section = JSON.parse(fs.readFileSync(path.join(root, 'sections', 'repo-map.json')));
    assert.equal(section.diagrams[0].rendered_svg, `generations/${generation}/diagrams/repo-map-path.svg`);
    const svg = fs.readFileSync(path.join(root, 'diagrams', 'repo-map-path.svg'), 'utf8');
    assert.match(svg, /<svg\b/);
    for (const label of ['CLI', 'App', 'DB', 'UI', 'probe signed readiness', 'GET exact case detail']) assert.ok(svg.includes(label), label);
    const html = fs.readFileSync(path.join(root, 'course.html'), 'utf8');
    assert.ok(html.includes(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`));
    assert.doesNotMatch(html, /Unrendered diagram source\./);
    assert.match(html, /<details\b[\s\S]*?Diagram source/i);
    const validation = childProcess.spawnSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.equal(validation.status, 0, validation.stdout);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('unsupported diagrams remain partial and cannot certify or replace a previous certified course', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    completeCourseFixture(repository, artifactRoot);
    const previous = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
    const fixtures = [{ section: 'work/quiz.json', claims: 'work/quiz-claims.json', claimId: 'claim-quiz-one' }];
    addDiagram(artifactRoot, fixtures[0], 'not-a-supported-diagram\nA => B');
    const rejected = publishBatch(repository, artifactRoot, fixtures, true);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout, /unrendered|render.*required|could not render/i);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), previous);
    const partial = publishBatch(repository, artifactRoot, fixtures);
    assert.equal(partial.status, 0, partial.stdout);
    assert.ok(JSON.parse(partial.stdout).render_warnings.length > 0);
    const current = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
    const root = path.join(artifactRoot, 'generations', current);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
    assert.equal(manifest.status, 'partial');
    const html = fs.readFileSync(path.join(root, 'course.html'), 'utf8');
    assert.match(html, /not (?:been )?rendered|rendering pending|visual pending/i);
    // Even a forged status with recomputed manifest fields must fail independent validation.
    manifest.status = 'certified';
    fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest));
    const validation = childProcess.spawnSync(node, [script('validate-explainer-course.mjs'), '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.notEqual(validation.status, 0);
    assert.match(validation.stdout, /unrendered|render.*required/i);
    assert.equal(fs.readdirSync(path.join(artifactRoot, 'generations')).some((name) => name.startsWith('.staging-')), false);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('certified full courses cannot omit their architecture sequence and dependency visuals', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    completeCourseFixture(repository, artifactRoot);
    const before = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
    const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'explainer-pro.json')));
    const fixtures = policy.section_order.filter((capability) => capability !== 'codemap').map((capability) => ({ section: `work/${capability}.json`, claims: `work/${capability}-claims.json` }));
    for (const capability of ['architecture', 'sequence', 'dependency-graph']) {
      const file = path.join(artifactRoot, 'work', `${capability}.json`);
      const section = JSON.parse(fs.readFileSync(file));
      section.diagrams = [];
      fs.writeFileSync(file, JSON.stringify(section));
    }
    const result = publishBatch(repository, artifactRoot, fixtures, true);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /architecture.*diagram|architecture.*visual/i);
    assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), before);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('duplicate diagram identifiers are rejected before assets can overwrite each other', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json')));
    const fixture = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], state.source_fingerprint.worktree_sha256);
    addDiagram(artifactRoot, fixture, 'flowchart LR\nA --> B');
    addDiagram(artifactRoot, fixture, 'flowchart LR\nC --> D');
    const result = publishBatch(repository, artifactRoot, [fixture]);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /diagram identifiers must be unique/);
    assert.equal(fs.existsSync(path.join(artifactRoot, 'CURRENT')), false);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('course publisher rejects stale source', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
    const fixture = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], state.source_fingerprint.worktree_sha256);
    fs.appendFileSync(path.join(repository, 'src', 'index.js'), 'export const drift = true;\n');
    const stale = childProcess.spawnSync(node, [script('explainer-course.mjs'), 'publish', '--repo-root', repository, '--artifact-root', artifactRoot, '--section', fixture.section, '--claims', fixture.claims], { encoding: 'utf8' });
    assert.notEqual(stale.status, 0);
    assert.match(stale.stdout, /source fingerprint changed/);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('course publisher rejects unsafe SVG without leaving staging output', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
    const fixture = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], state.source_fingerprint.worktree_sha256);
    const sectionPath = path.join(artifactRoot, fixture.section);
    const section = JSON.parse(fs.readFileSync(sectionPath, 'utf8'));
    fs.writeFileSync(path.join(artifactRoot, 'work', 'unsafe.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>\n');
    section.diagrams.push({ id: 'unsafe', title: 'Unsafe', source: 'flowchart LR; A-->B', rendered_svg: 'work/unsafe.svg', alt: 'Unsafe test diagram', claim_ids: [fixture.claimId] });
    fs.writeFileSync(sectionPath, `${JSON.stringify(section, null, 2)}\n`);
    const rejected = childProcess.spawnSync(node, [script('explainer-course.mjs'), 'publish', '--repo-root', repository, '--artifact-root', artifactRoot, '--section', fixture.section, '--claims', fixture.claims], { encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout, /forbidden active content/);
    assert.deepEqual(fs.readdirSync(path.join(artifactRoot, 'generations')).filter((name) => name.startsWith('.staging-')), []);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('empty and malformed supplied SVGs cannot replace the current visual generation', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json')));
    const fixture = writeCapabilityFixture(artifactRoot, 'repo-map', 2, [], state.source_fingerprint.worktree_sha256);
    publish(repository, artifactRoot, fixture);
    const previous = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8');
    addDiagram(artifactRoot, fixture, 'flowchart LR\nA --> B');
    const section = JSON.parse(fs.readFileSync(path.join(artifactRoot, fixture.section)));
    section.diagrams[0].rendered_svg = 'work/supplied.svg';
    fs.writeFileSync(path.join(artifactRoot, fixture.section), JSON.stringify(section));
    for (const svg of ['<svg></svg>', '<svg><rect></svg>', '<svg><defs><path d="M0 0L10 10"/></defs></svg>']) {
      fs.writeFileSync(path.join(artifactRoot, 'work/supplied.svg'), svg);
      const rejected = publishBatch(repository, artifactRoot, [fixture]);
      assert.notEqual(rejected.status, 0);
      assert.match(rejected.stdout, /malformed|drawable|empty/);
      assert.equal(fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8'), previous);
    }
    assert.equal(fs.readdirSync(path.join(artifactRoot, 'generations')).some((name) => name.startsWith('.staging-')), false);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('safe change intake excludes secret and artifact files and redacts shaped tokens', () => {
  const repository = repositoryFixture();
  try {
    const base = git(repository, ['rev-parse', 'HEAD']).trim();
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    fs.appendFileSync(path.join(repository, 'src', 'index.js'), "export const token = 'sk-abcdefghijklmnopqrstuv';\n");
    fs.writeFileSync(path.join(repository, '.env.secret'), 'PASSWORD=do-not-read\n');
    fs.writeFileSync(path.join(artifactRoot, 'course-note.txt'), 'artifact\n');
    childProcess.execFileSync(node, [script('explainer-change-intake.mjs'), '--repo', repository, '--artifact-root', artifactRoot, '--base', base, '--working'], { encoding: 'utf8' });
    const intake = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'work', 'change-intake.json'), 'utf8'));
    const source = intake.files.find(({ path: file }) => file === 'src/index.js');
    assert.match(source.patch, /«redacted:token»/);
    assert.equal(source.patch.includes('sk-abcdefghijklmnopqrstuv'), false);
    assert.equal(intake.files.find(({ path: file }) => file === '.env.secret').excluded, 'secret-path');
    assert.equal(intake.files.some(({ path: file }) => file.startsWith('.agents/explanations/')), false);
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});

test('Explainer Pro transition hook accepts canonical initialized state', () => {
  const repository = repositoryFixture();
  try {
    const { artifact_root: artifactRoot } = resolveRoot(repository);
    initialize(repository, artifactRoot);
    const hook = JSON.parse(childProcess.execFileSync(node, [script('run-workflow-hook.mjs'), '--workflow', 'explainer-pro', '--event', 'before-phase-transition', '--repo-root', repository, '--artifact-root', artifactRoot], { encoding: 'utf8' }));
    assert.equal(hook.status, 'success');
  } finally { fs.rmSync(repository, { recursive: true, force: true }); }
});
