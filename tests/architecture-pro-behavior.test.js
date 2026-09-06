'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
const digestValue = (value) => `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
const digestFile = (file) => `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;

test('Architecture Pro preserves all twelve deterministic behavior scenarios', () => {
  const output = JSON.parse(childProcess.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'run-architecture-pro-evals.mjs')], { encoding: 'utf8' }));
  assert.equal(output.status, 'success');
  assert.equal(output.results.length, 12);
  assert.ok(output.results.every(({ status }) => status === 'passed'));
});

test('Architecture Pro resolver owns repository-local output and rejects unsafe slugs and symlink escapes', () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-root-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-outside-'));
  try {
    childProcess.execFileSync('git', ['init', '-q', repository]);
    const resolver = path.join(ROOT, 'scripts', 'resolve-architecture-root.mjs');
    const unresolved = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', repository, '--slug', 'sample-system'], { encoding: 'utf8' }));
    assert.equal(unresolved.created, false);
    assert.equal(fs.existsSync(path.join(repository, '.agents')), false, 'resolution without --create must not create artifact directories');
    const resolved = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', repository, '--slug', 'sample-system', '--create'], { encoding: 'utf8' }));
    assert.equal(resolved.artifact_relative, '.agents/architecture/sample-system');
    assert.equal(resolved.artifact_root, path.join(fs.realpathSync(repository), '.agents', 'architecture', 'sample-system'));

    const traversal = childProcess.spawnSync(process.execPath, [resolver, '--repo', repository, '--slug', '../escape'], { encoding: 'utf8' });
    assert.notEqual(traversal.status, 0);
    assert.equal(fs.existsSync(path.join(repository, '..', 'escape')), false);

    fs.rmSync(path.join(repository, '.agents'), { recursive: true, force: true });
    fs.symlinkSync(outside, path.join(repository, '.agents'));
    const symlink = childProcess.spawnSync(process.execPath, [resolver, '--repo', repository, '--slug', 'sample-system'], { encoding: 'utf8' });
    assert.notEqual(symlink.status, 0);
    assert.equal(fs.readdirSync(outside).length, 0);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('Architecture Pro resolver uses the shared repository-artifact core and resolves the nearest Git worktree', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-worktree-'));
  const repository = path.join(temporaryRoot, 'source');
  const worktree = path.join(temporaryRoot, 'worktree');
  const nestedPath = path.join(worktree, 'src', 'system');
  try {
    fs.mkdirSync(repository, { recursive: true });
    childProcess.execFileSync('git', ['init', '-q', repository]);
    childProcess.execFileSync('git', ['-C', repository, 'config', 'user.name', 'Architecture Pro Test']);
    childProcess.execFileSync('git', ['-C', repository, 'config', 'user.email', 'architecture-pro-test@example.invalid']);
    fs.writeFileSync(path.join(repository, 'README.md'), '# fixture\n');
    childProcess.execFileSync('git', ['-C', repository, 'add', 'README.md']);
    childProcess.execFileSync('git', ['-C', repository, 'commit', '-q', '-m', 'fixture']);
    childProcess.execFileSync('git', ['-C', repository, 'worktree', 'add', '-q', '-b', 'architecture-pro-test', worktree]);
    fs.mkdirSync(nestedPath, { recursive: true });

    const resolver = path.join(ROOT, 'scripts', 'resolve-architecture-root.mjs');
    const resolved = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', nestedPath, '--slug', 'sample-system'], { encoding: 'utf8' }));
    assert.equal(resolved.repository_root, fs.realpathSync(worktree));
    assert.equal(resolved.artifact_root, path.join(fs.realpathSync(worktree), '.agents', 'architecture', 'sample-system'));
    assert.match(read('scripts/resolve-architecture-root.mjs'), /\.\/lib\/repository-artifacts\.mjs/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('Architecture Pro run validator accepts resumable state and rejects illegal transitions', () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-run-'));
  try {
    childProcess.execFileSync('git', ['init', '-q', repository]);
    const artifactRelative = '.agents/architecture/sample-system';
    const artifactRoot = path.join(repository, artifactRelative);
    fs.mkdirSync(artifactRoot, { recursive: true });
    const state = json('commands/architecture-pro/state.example.json');
    fs.writeFileSync(path.join(artifactRoot, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    const validator = path.join(ROOT, 'scripts', 'validate-architecture-pro-run.mjs');
    const valid = JSON.parse(childProcess.execFileSync(process.execPath, [validator, '--repo-root', repository, '--artifact-root', artifactRelative], { encoding: 'utf8' }));
    assert.equal(valid.status, 'success');

    state.transition_log.push({ from: 2, to: 9, reason: 'illegal jump' });
    fs.writeFileSync(path.join(artifactRoot, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    const invalid = childProcess.spawnSync(process.execPath, [validator, '--repo-root', repository, '--artifact-root', artifactRelative], { encoding: 'utf8' });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stdout, /transition-illegal/);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Architecture Pro hook registry blocks invalid phase transitions', () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-hook-'));
  try {
    childProcess.execFileSync('git', ['init', '-q', repository]);
    const artifactRelative = '.agents/architecture/sample-system';
    const artifactRoot = path.join(repository, artifactRelative);
    fs.mkdirSync(artifactRoot, { recursive: true });
    const state = json('commands/architecture-pro/state.example.json');
    state.transition_log.push({ from: 1, to: 9, reason: 'invalid' });
    fs.writeFileSync(path.join(artifactRoot, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    const hook = path.join(ROOT, 'scripts', 'run-workflow-hook.mjs');
    const result = childProcess.spawnSync(process.execPath, [hook, '--workflow', 'architecture-pro', '--event', 'before-phase-transition', '--repo-root', repository, '--artifact-root', artifactRelative], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /blocked before-phase-transition/);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Architecture Pro completion hook accepts a certified digest-bound design packet', () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-architecture-complete-'));
  try {
    childProcess.execFileSync('git', ['init', '-q', repository]);
    const artifactRelative = '.agents/architecture/sample-system';
    const artifactRoot = path.join(repository, artifactRelative);
    fs.mkdirSync(artifactRoot, { recursive: true });
    fs.writeFileSync(path.join(artifactRoot, 'design.md'), '# Certified design\n');

    const sourceFingerprint = { schema_version: 'architecture-pro/source-fingerprint@1', repositories: [{ repo_id: 'primary' }] };
    const provenance = { schema_version: 'architecture-pro/harness-provenance@1', command_digest: `sha256:${'1'.repeat(64)}` };
    const evidenceUnsigned = { schema_version: 'architecture-pro/evidence-manifest@1', run_id: 'architecture-run-1', source_fingerprint_digest: digestValue(sourceFingerprint), records: [] };
    const evidence = { ...evidenceUnsigned, manifest_digest: digestValue(evidenceUnsigned) };
    fs.writeFileSync(path.join(artifactRoot, 'evidence-manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);

    const handoff = {
      schema_version: 'architecture-pro/handoff@1', feature_slug: 'sample-system', mode: 'design', source_run_id: 'architecture-run-1',
      source_fingerprint: sourceFingerprint, source_fingerprint_digest: digestValue(sourceFingerprint),
      harness_provenance: provenance, harness_provenance_digest: digestValue(provenance), certification_status: 'DESIGN_CERTIFIED',
      outcome_axes: { health_grade: 'A', evidence_confidence: 'HIGH', target_attainment: 'PASS' },
      decision_ids: ['decision-1'], artifact_digests: { 'design.md': digestFile(path.join(artifactRoot, 'design.md')) },
      boundaries: [{ boundary_id: 'boundary-1' }], contract_ids: ['contract-1'], fitness_functions: [{ id: 'fitness-1' }],
      slices: [{ slice_id: 'slice-1' }], risks: [], required_approvals: [], rollback_conditions: [],
    };
    fs.writeFileSync(path.join(artifactRoot, 'handoff.json'), `${JSON.stringify(handoff, null, 2)}\n`);

    const state = json('commands/architecture-pro/state.example.json');
    state.run_id = 'architecture-run-1';
    state.mode = 'DESIGN';
    state.current_phase = 13;
    for (const key of Object.keys(state.phases)) state.phases[key] = [1, 2, 7, 8, 9, 10, 11, 12, 13].includes(Number(key)) ? 'passed' : 'skipped';
    state.input_fingerprint.source_fingerprint_digest = digestValue(sourceFingerprint);
    state.harness_provenance_digest = digestValue(provenance);
    state.loaded_contract = {
      command_digest: `sha256:${'2'.repeat(64)}`, governance_skill_digest: `sha256:${'3'.repeat(64)}`,
      routing_digest: `sha256:${'4'.repeat(64)}`, contract_digest: `sha256:${'5'.repeat(64)}`, loaded_at: new Date().toISOString(),
    };
    state.design_certification = 'DESIGN_CERTIFIED';
    state.artifact_digests = { 'design.md': digestFile(path.join(artifactRoot, 'design.md')) };
    state.handoff_digest = digestValue(handoff);
    state.workflow_trace.status = 'passed';
    fs.writeFileSync(path.join(artifactRoot, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);

    const baseEvent = { schema_version: 'pro-harness/workflow-event@1', run_id: state.run_id, workflow: 'architecture-pro', status: 'passed', occurred_at: new Date().toISOString(), artifacts: [] };
    const events = [
      { ...baseEvent, event_id: crypto.randomUUID(), event: 'run-started', summary: 'Architecture run started' },
      { ...baseEvent, event_id: crypto.randomUUID(), event: 'phase-started', phase: 13, summary: 'Final review started' },
      { ...baseEvent, event_id: crypto.randomUUID(), event: 'phase-completed', phase: 13, summary: 'Final review passed' },
      { ...baseEvent, event_id: crypto.randomUUID(), event: 'run-completed', summary: 'Architecture run completed' },
    ];
    fs.writeFileSync(path.join(artifactRoot, 'run-events.jsonl'), `${events.map(JSON.stringify).join('\n')}\n`, { mode: 0o600 });

    const hook = path.join(ROOT, 'scripts', 'run-workflow-hook.mjs');
    const output = JSON.parse(childProcess.execFileSync(process.execPath, [hook, '--workflow', 'architecture-pro', '--event', 'before-run-completion', '--repo-root', repository, '--artifact-root', artifactRelative], { encoding: 'utf8' }));
    assert.equal(output.status, 'success');
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('Architecture Pro routes one security agent through five bounded focus contracts', () => {
  const policy = json('config/architecture-pro.json');
  assert.equal(policy.security_routes.length, 5);
  assert.deepEqual([...new Set(policy.security_routes.map(({ agent }) => agent))], ['security-reviewer']);
  assert.ok(policy.security_routes.every(({ profile }) => profile === 'static-analysis-read-only'));
  assert.match(read('commands/architecture-pro/phases/02-context.md'), /always produces a minimal asset, actor, trust-boundary, authority, abuse-case, and data-transfer map/i);
});
