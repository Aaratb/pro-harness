'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');
function read(relativePath) { return fs.readFileSync(path.join(HARNESS_ROOT, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function digestValue(value) { return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`; }
function digestFile(filePath) { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`; }

test('MCP catalog passes deterministic validation', () => {
  const output = childProcess.execFileSync(process.execPath, [path.join(HARNESS_ROOT, 'scripts', 'validate-mcp-catalog.mjs')], { encoding: 'utf8' });
  const expectedCount = readJson('mcps/registry.json').contracts.length;
  const reportedCount = output.match(/MCP catalog valid: (\d+) contracts/);
  assert.ok(reportedCount, 'validator reports its validated contract count');
  assert.equal(Number(reportedCount[1]), expectedCount);
});

test('design and build resolve the existing browser for representative rendered evidence', () => {
  const registry = readJson('mcps/registry.json');
  const browser = registry.contracts.find(entry => entry.name === 'browser');
  const capabilities = readJson(`mcps/${browser.path}`).capabilities;
  const phases = readJson('commands/feature-pro/contract.json').phases;
  for (const number of [4, 9, 10, 14]) {
    assert.ok(browser.workflows['feature-pro'].includes(number), `browser route for Phase ${number}`);
    const phase = phases.find(entry => entry.number === number);
    for (const capability of ['browser.navigate', 'browser.inspect', 'browser.capture']) {
      assert.ok(phase.capabilities.includes(capability), `Phase ${number} -> ${capability}`);
      assert.ok(Object.hasOwn(capabilities, capability), `reuse existing ${capability}`);
    }
  }
});

test('Feature Pro reconciliation snapshot and behavior map pass deterministic validation', () => {
  const verifier = path.join(HARNESS_ROOT, 'scripts', 'verify-feature-pro-reconciliation.mjs');
  const output = childProcess.execFileSync(process.execPath, [verifier], { encoding: 'utf8' });
  assert.match(output, /Feature Pro reconciliation valid: 21 phases, 29 behavior domains/);
});

test('workspace-codemap-pro uses canonical agents, repository outputs, and diagram capability', () => {
  const command = read('commands/workspace-codemap-pro.md');
  assert.match(command, /^name: workspace-codemap-pro$/m);
  assert.equal(fs.existsSync(path.join(HARNESS_ROOT, 'commands', 'workspace-codemap.md')), false);
  assert.ok(fs.existsSync(path.join(HARNESS_ROOT, 'skills', 'workspace-codemap-context', 'SKILL.md')));
  assert.match(command, /`diagram\.render`/);
  assert.match(command, /<repo>\/\.codemaps\//);
  assert.match(command, /explicit owner repository/);
  assert.doesNotMatch(command, /<workspace>\/\.codemaps\//);
  assert.match(command, /`repository-explorer`/);
  assert.doesNotMatch(command, /mcp__/);
  assert.doesNotMatch(command, /\.agent_docs|\.aw_docs|HCA|Echo|TeamOfOne/i);
});

test('artifact companion generator and validator keep output inside the supplied root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-companion-'));
  try {
    fs.writeFileSync(path.join(root, 'spec.md'), '# Feature Spec\n\n## Decision\n\nUse the [bounded path](https://example.com).\n\n## Proof\n\n- focused test\n');
    fs.writeFileSync(path.join(root, 'state.json'), '{}\n');
    const generator = path.join(HARNESS_ROOT, 'scripts', 'generate-artifact-companion.mjs');
    const validator = path.join(HARNESS_ROOT, 'scripts', 'validate-artifact-companion.mjs');
    const generated = JSON.parse(childProcess.execFileSync(process.execPath, [generator, '--artifact-root', root, '--source', 'spec.md', '--state', 'state.json'], { encoding: 'utf8' }));
    assert.equal(generated.status, 'success');
    const validated = JSON.parse(childProcess.execFileSync(process.execPath, [validator, '--artifact-root', root, '--source', 'spec.md', '--html', 'spec.html'], { encoding: 'utf8' }));
    assert.equal(validated.status, 'success');
    const state = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'));
    assert.equal(state.artifact_companions[0].html_path, 'spec.html');
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'spec.html'), 'utf8'), /HCA|Echo|TeamOfOne|\.aw_docs/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('artifact companion generator rejects output traversal', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-companion-traversal-'));
  try {
    fs.writeFileSync(path.join(root, 'spec.md'), '# Spec\n');
    const generator = path.join(HARNESS_ROOT, 'scripts', 'generate-artifact-companion.mjs');
    const result = childProcess.spawnSync(process.execPath, [generator, '--artifact-root', root, '--source', 'spec.md', '--out', '../escape.html'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(path.join(root, '..', 'escape.html')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('architecture handoff validator accepts a digest-bound packet and rejects artifact tampering', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-handoff-'));
  try {
    const runRoot = path.join(root, '.agents', 'architecture', 'sample');
    fs.mkdirSync(runRoot, { recursive: true });
    fs.writeFileSync(path.join(runRoot, 'design.md'), '# Design\n');
    const sourceFingerprint = { schema_version: 'architecture-pro/source-fingerprint@1', repositories: [{ repo_id: 'sample' }] };
    const harnessProvenance = { schema_version: 'architecture-pro/harness-provenance@1', command_digest: `sha256:${'1'.repeat(64)}` };
    const handoff = {
      schema_version: 'architecture-pro/handoff@1',
      feature_slug: 'sample',
      mode: 'design',
      source_run_id: 'run-1',
      source_fingerprint: sourceFingerprint,
      source_fingerprint_digest: digestValue(sourceFingerprint),
      harness_provenance: harnessProvenance,
      harness_provenance_digest: digestValue(harnessProvenance),
      certification_status: 'DESIGN_CERTIFIED',
      outcome_axes: { health_grade: 'A', evidence_confidence: 'HIGH', target_attainment: 'PASS' },
      decision_ids: ['decision-1'],
      artifact_digests: { 'design.md': digestFile(path.join(runRoot, 'design.md')) },
      boundaries: [{ boundary_id: 'boundary-1' }],
      contract_ids: ['contract-1'],
      fitness_functions: [{ id: 'fitness-1' }],
      slices: [{ slice_id: 'slice-1' }],
      risks: [], required_approvals: [], rollback_conditions: []
    };
    fs.writeFileSync(path.join(runRoot, 'handoff.json'), `${JSON.stringify(handoff, null, 2)}\n`);
    fs.writeFileSync(path.join(runRoot, 'state.json'), `${JSON.stringify({ run_id: 'run-1', feature_slug: 'sample', input_fingerprint: { source_fingerprint_digest: handoff.source_fingerprint_digest }, harness_provenance_digest: handoff.harness_provenance_digest, handoff_digest: digestValue(handoff) }, null, 2)}\n`);
    const validator = path.join(HARNESS_ROOT, 'scripts', 'validate-architecture-handoff.mjs');
    const valid = JSON.parse(childProcess.execFileSync(process.execPath, [validator, '--repo-root', root, '--handoff', '.agents/architecture/sample/handoff.json', '--require-design'], { encoding: 'utf8' }));
    assert.equal(valid.status, 'success');
    fs.writeFileSync(path.join(runRoot, 'design.md'), '# Tampered\n');
    const invalid = childProcess.spawnSync(process.execPath, [validator, '--repo-root', root, '--handoff', '.agents/architecture/sample/handoff.json', '--require-design'], { encoding: 'utf8' });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stdout, /artifact-digest-mismatch/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Feature Pro exposes no duplicate grill command or retired artifact terminology', () => {
  const phaseRoot = path.join(HARNESS_ROOT, 'commands', 'feature-pro', 'phases');
  const command = [
    read('commands/feature-pro.md'),
    read('commands/feature-pro/routing.md'),
    read('commands/feature-pro/governance.md'),
    ...fs.readdirSync(phaseRoot).filter((name) => name.endsWith('.md')).map((name) => fs.readFileSync(path.join(phaseRoot, name), 'utf8')),
  ].join('\n');
  assert.doesNotMatch(command, /\/grill-with-docs|\/grill-me/);
  assert.doesNotMatch(command, /HCA|Echo Direct|TeamOfOne|html_companion_artifacts|Devtools Remote Docs/i);
  assert.match(command, /generate-artifact-companion\.mjs/);
  assert.match(command, /validate-architecture-handoff\.mjs/);
});

test('architecture handoff schema keeps the certified packet contract', () => {
  const schema = readJson('schemas/architecture-handoff/handoff.schema.json');
  assert.match(schema.$schema, /2020-12/);
  assert.equal(schema.properties.schema_version.const, 'architecture-pro/handoff@1');
  assert.ok(schema.required.includes('artifact_digests'));
  assert.ok(schema.required.includes('source_fingerprint_digest'));
});
