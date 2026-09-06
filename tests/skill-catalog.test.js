'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(HARNESS_ROOT, relativePath), 'utf8'));
}

test('canonical skill catalog and Feature Pro routing pass deterministic validation', () => {
  const output = childProcess.execFileSync(process.execPath, [path.join(HARNESS_ROOT, 'scripts', 'validate-skill-catalog.mjs')], { encoding: 'utf8' });
  assert.match(output, /skill catalog valid:/);
});

test('Feature Pro command bundle passes phase, routing, and token-budget validation', () => {
  const output = childProcess.execFileSync(process.execPath, [path.join(HARNESS_ROOT, 'scripts', 'validate-feature-pro-command.mjs')], { encoding: 'utf8' });
  assert.match(output, /Feature Pro command valid: 20 phases/);
});

test('skill folders exactly cover the resolution manifest', () => {
  const manifest = readJson('skills/resolution-manifest.json');
  const expected = manifest.skills.map(({ name }) => name).sort();
  const actual = fs.readdirSync(path.join(HARNESS_ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'feature-pro')
    .filter((entry) => fs.existsSync(path.join(HARNESS_ROOT, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(actual, expected);
});

test('canonical skills contain no platform-specific OpenAI metadata', () => {
  const metadata = [];
  for (const entry of fs.readdirSync(path.join(HARNESS_ROOT, 'skills'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(HARNESS_ROOT, 'skills', entry.name, 'agents', 'openai.yaml');
    if (fs.existsSync(candidate)) metadata.push(candidate);
  }
  assert.deepEqual(metadata, []);
});

test('Codex adapter generates optional UI metadata outside the canonical tree', () => {
  const os = require('node:os');
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-codex-metadata-'));
  try {
    const generator = path.join(HARNESS_ROOT, 'adapters', 'codex', 'generate-skill-metadata.mjs');
    const output = childProcess.execFileSync(process.execPath, [generator, '--output-root', outputRoot], { encoding: 'utf8' });
    const expectedCount = fs.readdirSync(path.join(HARNESS_ROOT, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(HARNESS_ROOT, 'skills', entry.name, 'SKILL.md'))).length;
    assert.match(output, new RegExp(`generated Codex UI metadata for ${expectedCount} skills`));
    const featureMetadata = fs.readFileSync(path.join(outputRoot, 'feature-pro', 'agents', 'openai.yaml'), 'utf8');
    assert.match(featureMetadata, /display_name: "Feature Pro"/);
    assert.match(featureMetadata, /\$feature-pro/);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test('Codex adapter refuses to write metadata into the canonical skill tree', () => {
  const generator = path.join(HARNESS_ROOT, 'adapters', 'codex', 'generate-skill-metadata.mjs');
  const result = childProcess.spawnSync(process.execPath, [generator, '--output-root', path.join(HARNESS_ROOT, 'skills')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to write Codex adapter metadata into the canonical skill tree/);
});

test('Firecrawl is an authenticated MCP capability and not a skill folder', () => {
  const contract = readJson('mcps/firecrawl/capability.json');
  assert.equal(contract.authentication.required, true);
  assert.equal(contract.authentication.may_print_secret, false);
  assert.equal(contract.data_policy.artifact_root_required, true);
  assert.equal(fs.existsSync(path.join(HARNESS_ROOT, 'skills', 'firecrawl')), false);
});

test('Feature Pro contains only named canonical agent roles', () => {
  const phaseRoot = path.join(HARNESS_ROOT, 'commands', 'feature-pro', 'phases');
  const command = [
    fs.readFileSync(path.join(HARNESS_ROOT, 'commands', 'feature-pro.md'), 'utf8'),
    fs.readFileSync(path.join(HARNESS_ROOT, 'commands', 'feature-pro', 'routing.md'), 'utf8'),
    fs.readFileSync(path.join(HARNESS_ROOT, 'commands', 'feature-pro', 'governance.md'), 'utf8'),
    ...fs.readdirSync(phaseRoot).filter((name) => name.endsWith('.md')).map((name) => fs.readFileSync(path.join(phaseRoot, name), 'utf8')),
  ].join('\n');
  const forbidden = [
    /a unit-testing pass/i,
    /an API contract \+ auth test pass/i,
    /a mutation-testing pass/i,
    /a visual(?:-testing| \+ responsive regression) pass/i,
    /a performance benchmarking pass/i,
    /a release engineer/i,
    /a devops automator/i,
    /an SRE/i,
    /repository-exploration-pass/i,
    /infra-helper/i,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(command, pattern);
});
