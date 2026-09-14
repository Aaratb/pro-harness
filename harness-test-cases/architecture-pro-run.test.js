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
const MAGIC_PAGES_TRACE = process.env.PRO_HARNESS_MAGIC_PAGES_TRACE || path.join(ROOT, 'harness-test-cases/fixtures/architecture-pro-magic-pages-run-events.jsonl');
const MAGIC_PAGES_RUN_ID = 'architecture-pro-20260913-magic-pages';
const MAGIC_PAGES_TRACE_SHA = 'b0f9b763063c7aec20d0b5861668e54b8eb413bc870e312bf2679d36206cdcc6';
const PLUGIN_EXCLUDE = new Set([
  'scripts/install.mjs',
  'scripts/generate-runtime-adapters.mjs',
  'scripts/lib/runtime-adapters.mjs',
]);

const script = (name) => path.join(ROOT, 'scripts', name);
const digestFile = (file) => `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function git(repository, args) {
  return childProcess.execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8' });
}

function repositoryFixture() {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-init-'));
  git(repository, ['init', '-q']);
  git(repository, ['config', 'user.name', 'Architecture Pro Test']);
  git(repository, ['config', 'user.email', 'architecture-pro-test@example.invalid']);
  git(repository, ['config', 'commit.gpgsign', 'false']);
  fs.writeFileSync(path.join(repository, 'README.md'), '# fixture\n');
  git(repository, ['add', 'README.md']);
  git(repository, ['commit', '--no-verify', '-q', '-m', 'fixture']);
  return repository;
}

function run(args, options = {}) {
  return childProcess.spawnSync(node, [script('architecture-run.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function initialize(repository, slug, mode, extra = [], options = {}) {
  const result = run(['initialize', '--repo', repository, '--slug', slug, '--mode', mode, ...extra], options);
  let payload;
  try { payload = JSON.parse(result.stdout); } catch { payload = { status: 'error', summary: result.stdout || result.stderr }; }
  return { ...result, payload };
}

function requireSuccess(result) {
  assert.equal(result.status, 0, result.payload.summary || result.stderr);
  assert.equal(result.payload.status, 'success');
  return result.payload;
}

const MODE_PATHS = {
  DESIGN: [1, 2, 7, 8, 9, 10, 11, 12, 13],
  AUDIT: [1, 2, 3, 4, 5, 6, 11, 12, 13],
  MIXED: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  ADR_ONLY: [1, 2, 7, 8, 9, 10],
};

function assertFreshState(repository, payload, mode) {
  const artifactRelative = payload.artifact_relative;
  const artifactRoot = payload.artifact_root;
  const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
  const active = new Set(MODE_PATHS[mode]);
  assert.equal(state.schema_version, 'architecture-pro/state@1');
  assert.equal(state.run_id, payload.run_id);
  assert.equal(state.mode, mode);
  assert.equal(state.architecture_slug, payload.architecture_slug);
  assert.equal(state.artifact_root, artifactRelative);
  assert.equal(state.current_phase, 1);
  assert.equal(state.command, 'architecture-pro');
  assert.equal(state.decision_reopens, 0);
  assert.deepEqual(state.transition_log, []);
  assert.deepEqual(state.consent_receipts, []);
  assert.deepEqual(state.lane_runs, {});
  assert.deepEqual(state.security_focus_runs, {});
  assert.deepEqual(state.artifact_digests, {});
  assert.equal(state.handoff_digest, null);
  assert.equal(state.audit_certification, 'pending');
  assert.equal(state.design_certification, 'pending');
  assert.equal(state.outcome_axes.evidence_confidence, 'INSUFFICIENT');
  assert.equal(state.outcome_axes.target_attainment, 'UNVERIFIED');
  for (const number of Array.from({ length: 13 }, (_, index) => index + 1)) {
    const expected = number === 1 ? 'in_progress' : active.has(number) ? 'pending' : 'skipped';
    assert.equal(state.phases[String(number)], expected, `phase ${number}`);
    assert.notEqual(state.phases[String(number)], 'passed');
    assert.notEqual(state.phases[String(number)], 'waived');
  }
  for (const field of ['command_digest', 'governance_skill_digest', 'routing_digest', 'contract_digest']) {
    assert.match(state.loaded_contract[field], /^sha256:[a-f0-9]{64}$/);
  }
  assert.equal(state.loaded_contract.command_digest, digestFile(path.join(ROOT, 'commands', 'architecture-pro.md')));
  assert.equal(state.loaded_contract.governance_skill_digest, digestFile(path.join(ROOT, 'skills', 'architecture-pro-governance', 'SKILL.md')));
  assert.equal(state.loaded_contract.routing_digest, digestFile(path.join(ROOT, 'commands', 'architecture-pro', 'routing.md')));
  assert.equal(state.loaded_contract.contract_digest, digestFile(path.join(ROOT, 'commands', 'architecture-pro', 'contract.json')));
  assert.match(state.harness_provenance_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(state.input_fingerprint.source_fingerprint_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(state.input_fingerprint.repositories[0].repo_id, 'primary');
  assert.match(state.input_fingerprint.repositories[0].head, /^[0-9a-f]{40}$/);

  const trace = JSON.parse(childProcess.execFileSync(node, [
    script('validate-workflow-trace.mjs'), '--artifact-root', artifactRoot, '--workflow', 'architecture-pro', '--run-id', state.run_id,
  ], { encoding: 'utf8' }));
  assert.equal(trace.status, 'success');
  assert.equal(trace.summary.includes('2 event'), true);

  const events = fs.readFileSync(path.join(artifactRoot, 'run-events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(events[0].event, 'run-started');
  assert.equal(events[1].event, 'phase-started');
  assert.equal(events[1].phase, 1);
  assert.equal(events[0].run_id, state.run_id);
  assert.equal(state.workflow_trace.last_event_id, events[1].event_id);

  const packet = JSON.parse(childProcess.execFileSync(node, [
    script('validate-architecture-pro-run.mjs'), '--repo-root', repository, '--artifact-root', artifactRelative,
  ], { encoding: 'utf8' }));
  assert.equal(packet.status, 'success');

  const hook = JSON.parse(childProcess.execFileSync(node, [
    script('run-workflow-hook.mjs'), '--workflow', 'architecture-pro', '--event', 'before-phase-transition',
    '--repo-root', repository, '--artifact-root', artifactRelative,
  ], { encoding: 'utf8' }));
  assert.equal(hook.status, 'success');
  return state;
}

test('Architecture Pro initializes a schema-valid run for every mode', () => {
  for (const mode of ['DESIGN', 'AUDIT', 'MIXED', 'ADR_ONLY']) {
    const repository = repositoryFixture();
    try {
      const result = initialize(repository, `sample-${mode.toLowerCase().replace('_', '-')}`, mode);
      const payload = requireSuccess(result);
      assert.match(payload.run_id, /^architecture-[0-9a-f-]{36}$/);
      assert.deepEqual(payload.artifacts, ['state.json', 'run-events.jsonl']);
      assertFreshState(repository, payload, mode);
    } finally {
      fs.rmSync(repository, { recursive: true, force: true });
    }
  }
});

test('Architecture Pro initialize refuses existing state, foreign traces, and repeated invocation', () => {
  const repository = repositoryFixture();
  try {
    const first = requireSuccess(initialize(repository, 'occupied', 'DESIGN'));
    const repeat = initialize(repository, 'occupied', 'DESIGN');
    assert.notEqual(repeat.status, 0);
    assert.match(repeat.payload.summary, /state\.json/);

    const foreign = repositoryFixture();
    try {
      const artifactRelative = '.agents/architecture/foreign-trace';
      const artifactRoot = path.join(foreign, artifactRelative);
      fs.mkdirSync(artifactRoot, { recursive: true });
      const event = {
        schema_version: 'pro-harness/workflow-event@1',
        event_id: crypto.randomUUID(),
        run_id: 'architecture-existing-run',
        workflow: 'architecture-pro',
        event: 'run-started',
        status: 'in-progress',
        occurred_at: new Date().toISOString(),
        summary: 'Prior Architecture Pro run.',
        artifacts: [],
      };
      fs.writeFileSync(path.join(artifactRoot, 'run-events.jsonl'), `${JSON.stringify(event)}\n`, { mode: 0o600 });
      const refused = initialize(foreign, 'foreign-trace', 'MIXED');
      assert.notEqual(refused.status, 0);
      assert.match(refused.payload.summary, /run-events\.jsonl/);
      assert.match(refused.payload.summary, /architecture-existing-run/);
      assert.equal(fs.existsSync(path.join(artifactRoot, 'state.json')), false);
      assert.equal(JSON.parse(fs.readFileSync(path.join(artifactRoot, 'run-events.jsonl'), 'utf8').trim()).run_id, 'architecture-existing-run');
    } finally {
      fs.rmSync(foreign, { recursive: true, force: true });
    }

    const second = initialize(repository, 'occupied', 'AUDIT');
    assert.notEqual(second.status, 0);
    const state = JSON.parse(fs.readFileSync(path.join(first.artifact_root, 'state.json'), 'utf8'));
    assert.equal(state.run_id, first.run_id);
    assert.equal(state.mode, 'DESIGN');
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Architecture Pro initialize refuses invalid slugs, traversal, and symlink escapes', () => {
  const repository = repositoryFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-outside-'));
  try {
    const invalid = initialize(repository, 'Magic Pages', 'DESIGN');
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.payload.summary, /slug/);

    const traversal = initialize(repository, '../escape', 'DESIGN');
    assert.notEqual(traversal.status, 0);
    assert.equal(fs.existsSync(path.join(repository, '..', 'escape')), false);

    fs.symlinkSync(outside, path.join(repository, '.agents'));
    const escaped = initialize(repository, 'sample-system', 'DESIGN');
    assert.notEqual(escaped.status, 0);
    assert.equal(fs.readdirSync(outside).length, 0);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('Architecture Pro concurrent initialize admits one winner', async () => {
  const repository = repositoryFixture();
  try {
    const args = [script('architecture-run.mjs'), 'initialize', '--repo', repository, '--slug', 'race-slug', '--mode', 'DESIGN'];
    const [left, right] = await Promise.all([
      new Promise((resolve) => {
        const child = childProcess.spawn(node, args, { encoding: 'utf8' });
        let stdout = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.on('close', (status) => resolve({ status, stdout }));
      }),
      new Promise((resolve) => {
        const child = childProcess.spawn(node, args, { encoding: 'utf8' });
        let stdout = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.on('close', (status) => resolve({ status, stdout }));
      }),
    ]);
    const results = [left, right].map((entry) => ({ ...entry, payload: JSON.parse(entry.stdout) }));
    const successes = results.filter(({ status, payload }) => status === 0 && payload.status === 'success');
    const failures = results.filter(({ status }) => status !== 0);
    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    const artifactRoot = successes[0].payload.artifact_root;
    const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
    const events = fs.readFileSync(path.join(artifactRoot, 'run-events.jsonl'), 'utf8').trim().split('\n');
    assert.equal(state.run_id, successes[0].payload.run_id);
    assert.equal(events.length, 2);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Architecture Pro injected write failure cannot leave valid-looking partial state', () => {
  const repository = repositoryFixture();
  try {
    const failed = initialize(repository, 'partial-run', 'DESIGN', [], { env: { ...process.env, PRO_HARNESS_TEST_FAIL_AFTER: 'trace' } });
    assert.notEqual(failed.status, 0);
    const artifactRoot = path.join(repository, '.agents', 'architecture', 'partial-run');
    assert.equal(fs.existsSync(path.join(artifactRoot, 'state.json')), false);
    const packet = childProcess.spawnSync(node, [
      script('validate-architecture-pro-run.mjs'), '--repo-root', repository, '--artifact-root', '.agents/architecture/partial-run',
    ], { encoding: 'utf8' });
    assert.notEqual(packet.status, 0);
    const retry = initialize(repository, 'partial-run', 'DESIGN');
    assert.notEqual(retry.status, 0);
    assert.match(retry.payload.summary, /run-events\.jsonl/);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Older artifacts do not mark phases complete, and Phase 10 stays unreachable from intake', () => {
  const repository = repositoryFixture();
  try {
    const payload = requireSuccess(initialize(repository, 'with-evidence', 'DESIGN'));
    fs.writeFileSync(path.join(payload.artifact_root, 'phase-9-deep-design.md'), '# prior packet\n');
    fs.writeFileSync(path.join(payload.artifact_root, 'phase-9-approval.md'), 'approved earlier\n');
    const state = assertFreshState(repository, payload, 'DESIGN');
    assert.equal(state.phases['9'], 'pending');
    assert.equal(state.phases['10'], 'pending');
    assert.equal(state.artifact_digests['phase-9-deep-design.md'], undefined);

    state.transition_log.push({ from: 1, to: 10, reason: 'skip ahead' });
    fs.writeFileSync(path.join(payload.artifact_root, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    const illegal = childProcess.spawnSync(node, [
      script('validate-architecture-pro-run.mjs'), '--repo-root', repository, '--artifact-root', payload.artifact_relative,
    ], { encoding: 'utf8' });
    assert.notEqual(illegal.status, 0);
    assert.match(illegal.stdout, /transition-illegal/);
    const hook = childProcess.spawnSync(node, [
      script('run-workflow-hook.mjs'), '--workflow', 'architecture-pro', '--event', 'before-phase-transition',
      '--repo-root', repository, '--artifact-root', payload.artifact_relative,
    ], { encoding: 'utf8' });
    assert.notEqual(hook.status, 0);
    assert.match(hook.stdout, /blocked before-phase-transition/);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Existing example Architecture Pro packets remain valid without the initializer', () => {
  const repository = repositoryFixture();
  try {
    const artifactRelative = '.agents/architecture/sample-system';
    const artifactRoot = path.join(repository, artifactRelative);
    fs.mkdirSync(artifactRoot, { recursive: true });
    const example = JSON.parse(fs.readFileSync(path.join(ROOT, 'commands', 'architecture-pro', 'state.example.json'), 'utf8'));
    fs.writeFileSync(path.join(artifactRoot, 'state.json'), `${JSON.stringify(example, null, 2)}\n`);
    const valid = JSON.parse(childProcess.execFileSync(node, [
      script('validate-architecture-pro-run.mjs'), '--repo-root', repository, '--artifact-root', artifactRelative,
    ], { encoding: 'utf8' }));
    assert.equal(valid.status, 'success');
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Architecture Pro initializer ships in copy installs and plugin-style distributions', () => {
  assert.equal(PLUGIN_EXCLUDE.has('scripts/architecture-run.mjs'), false);
  assert.equal(PLUGIN_EXCLUDE.has('scripts/architecture-source.mjs'), false);
  assert.ok(fs.existsSync(script('architecture-run.mjs')));
  assert.ok(fs.existsSync(script('architecture-source.mjs')));

  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-install-'));
  const target = path.join(home, 'harness');
  try {
    const installed = childProcess.spawnSync(node, [
      script('install.mjs'), '--home', home, '--target', target, '--mode', 'copy', '--runtimes', 'claude,codex',
    ], { encoding: 'utf8' });
    assert.equal(installed.status, 0, installed.stderr);
    assert.ok(fs.existsSync(path.join(target, 'scripts', 'architecture-run.mjs')));
    assert.ok(fs.existsSync(path.join(target, 'scripts', 'architecture-source.mjs')));
    assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'architecture-pro.md')));
    assert.ok(fs.existsSync(path.join(home, '.codex', 'skills', 'architecture-pro', 'SKILL.md')));
    assert.match(fs.readFileSync(path.join(ROOT, 'commands', 'architecture-pro.md'), 'utf8'), /architecture-run\.mjs initialize/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Magic Pages occupied root is refused, a new slug initializes, and the real trace is unchanged', (t) => {
  if (!fs.existsSync(MAGIC_PAGES_TRACE)) {
    t.skip('optional Magic Pages regression fixture not present');
    return;
  }
  const before = sha256(MAGIC_PAGES_TRACE);
  assert.equal(before, MAGIC_PAGES_TRACE_SHA);
  const repository = repositoryFixture();
  try {
    const occupiedRelative = '.agents/architecture/magic-pages';
    const occupiedRoot = path.join(repository, occupiedRelative);
    fs.mkdirSync(occupiedRoot, { recursive: true });
    fs.copyFileSync(MAGIC_PAGES_TRACE, path.join(occupiedRoot, 'run-events.jsonl'));
    fs.writeFileSync(path.join(occupiedRoot, 'phase-9-approval.md'), 'approval evidence\n');
    fs.writeFileSync(path.join(occupiedRoot, 'phase-9-binding-status.md'), 'blocked before Phase 10\n');
    assert.equal(sha256(path.join(occupiedRoot, 'run-events.jsonl')), MAGIC_PAGES_TRACE_SHA);

    const refused = initialize(repository, 'magic-pages', 'MIXED');
    assert.notEqual(refused.status, 0);
    assert.match(refused.payload.summary, /magic-pages|run-events\.jsonl|architecture-pro-20260913-magic-pages/);
    assert.equal(fs.existsSync(path.join(occupiedRoot, 'state.json')), false);
    assert.equal(sha256(path.join(occupiedRoot, 'run-events.jsonl')), MAGIC_PAGES_TRACE_SHA);
    const copied = fs.readFileSync(path.join(occupiedRoot, 'run-events.jsonl'));
    const original = fs.readFileSync(MAGIC_PAGES_TRACE);
    assert.equal(Buffer.compare(copied, original), 0);

    const fresh = requireSuccess(initialize(repository, 'magic-pages-rebind', 'MIXED'));
    const state = assertFreshState(repository, fresh, 'MIXED');
    fs.copyFileSync(path.join(occupiedRoot, 'phase-9-approval.md'), path.join(fresh.artifact_root, 'phase-9-approval.md'));
    const reverified = JSON.parse(childProcess.execFileSync(node, [
      script('validate-architecture-pro-run.mjs'), '--repo-root', repository, '--artifact-root', fresh.artifact_relative,
    ], { encoding: 'utf8' }));
    assert.equal(reverified.status, 'success');
    const reread = JSON.parse(fs.readFileSync(path.join(fresh.artifact_root, 'state.json'), 'utf8'));
    assert.equal(reread.phases['8'], 'pending');
    assert.equal(reread.phases['9'], 'pending');
    assert.equal(reread.phases['10'], 'pending');
    assert.equal(reread.current_phase, 1);
    assert.equal(reread.design_certification, 'pending');
    assert.equal(Object.keys(reread.artifact_digests).length, 0);
    assert.equal(state.run_id !== MAGIC_PAGES_RUN_ID, true);

    reread.transition_log.push({ from: 1, to: 10, reason: 'use prior approval' });
    fs.writeFileSync(path.join(fresh.artifact_root, 'state.json'), `${JSON.stringify(reread, null, 2)}\n`);
    const blocked = childProcess.spawnSync(node, [
      script('run-workflow-hook.mjs'), '--workflow', 'architecture-pro', '--event', 'before-phase-transition',
      '--repo-root', repository, '--artifact-root', fresh.artifact_relative,
    ], { encoding: 'utf8' });
    assert.notEqual(blocked.status, 0);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
    assert.equal(sha256(MAGIC_PAGES_TRACE), MAGIC_PAGES_TRACE_SHA);
    assert.equal(fs.existsSync(path.join(path.dirname(MAGIC_PAGES_TRACE), 'state.json')), false);
  }
});
