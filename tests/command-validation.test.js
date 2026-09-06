'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '..', 'scripts', 'lib', 'command-validation.mjs')).href;
const pathsModuleUrl = pathToFileURL(path.resolve(__dirname, '..', 'scripts', 'lib', 'repository-paths.mjs')).href;

function createFixture() {
  const harnessRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-'));
  fs.mkdirSync(path.join(harnessRoot, 'agents', 'definitions'), { recursive: true });
  fs.mkdirSync(path.join(harnessRoot, 'commands', 'demo', 'phases'), { recursive: true });
  fs.mkdirSync(path.join(harnessRoot, 'mcps'), { recursive: true });
  fs.writeFileSync(path.join(harnessRoot, 'agents', 'definitions', 'demo-agent.json'), '{}\n');
  fs.writeFileSync(path.join(harnessRoot, 'commands', 'demo', 'phases', '01-start.md'), '# Phase 1: Start\nphase body\n');
  fs.writeFileSync(path.join(harnessRoot, 'mcps', 'demo.json'), JSON.stringify({ capabilities: { 'demo.read': {} } }));
  const read = (relativePath) => fs.readFileSync(path.join(harnessRoot, relativePath), 'utf8');
  const readJson = (relativePath) => JSON.parse(read(relativePath));

  return {
    harnessRoot,
    read,
    readJson,
    skillManifest: { skills: [{ name: 'demo-skill' }] },
    mcpRegistry: { contracts: [{ name: 'demo', path: 'demo.json' }] },
  };
}

function demoContract(overrides = {}) {
  return {
    phases: [{
      number: 1,
      name: 'Start',
      file: 'phases/01-start.md',
      required_skills: ['demo-skill'],
      optional_skills: [],
      agents: ['demo-agent'],
      capabilities: ['demo.read'],
    }],
    ...overrides,
  };
}

function mechanicOptions(fixture, catalogs, overrides = {}) {
  return {
    contract: demoContract(),
    phaseCount: 1,
    commandRoot: path.join(fixture.harnessRoot, 'commands', 'demo'),
    phaseBasePath: 'commands/demo',
    read: fixture.read,
    mainText: '# Demo\nphases/01-start.md\n',
    globalTexts: ['one two'],
    mainWordBudget: 10,
    mainLineBudget: 5,
    activeWordBudget: 10,
    phaseHeading: (phase) => `# Phase ${phase.number}: ${phase.name}\n`,
    catalogs,
    phaseIndex: { text: 'phases/01-start.md', entry: (phase) => phase.file },
    ...overrides,
  };
}

test('shared command catalogs resolve skills, agents, and MCP capabilities', async (t) => {
  const fixture = createFixture();
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs } = await import(moduleUrl);

  const catalogs = buildCommandCatalogs(fixture);

  assert.deepEqual([...catalogs.skills], ['demo-skill']);
  assert.deepEqual([...catalogs.agents], ['demo-agent']);
  assert.deepEqual([...catalogs.capabilities], ['demo.read']);
  assert.equal(catalogs.mcpContracts[0].registryEntry.name, 'demo');

  assert.throws(
    () => buildCommandCatalogs({
      ...fixture,
      mcpRegistry: { contracts: [{ name: 'escape', path: '../outside.json' }] },
    }),
    /escape: invalid MCP contract path: dot, parent, or empty path components are forbidden/,
  );
});

test('shared command mechanics preserve budgets, phase resolution, and stateful RegExp safety', async (t) => {
  const fixture = createFixture();
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs, validateCommandMechanics } = await import(moduleUrl);
  const catalogs = buildCommandCatalogs(fixture);

  const metrics = validateCommandMechanics(mechanicOptions(fixture, catalogs));
  assert.deepEqual(metrics.expectedNumbers, [1]);
  assert.equal(metrics.mainWords, 3);
  assert.equal(metrics.mainLines, 3);
  assert.equal(metrics.globalWords, 2);
  assert.equal(metrics.contextBudgetScope, 'command-shell-only');

  const emptyMetrics = validateCommandMechanics(mechanicOptions(fixture, catalogs, {
    mainText: '',
    globalTexts: [],
    mainWordBudget: 0,
    phaseIndex: undefined,
  }));
  assert.equal(emptyMetrics.mainWords, 0);
  assert.equal(emptyMetrics.globalWords, 0);

  const statefulPattern = /forbidden/g;
  statefulPattern.lastIndex = 9;
  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs, {
      forbidden: { text: 'contains forbidden terminology', label: 'Demo bundle', patterns: [statefulPattern] },
    })),
    /Demo bundle contains forbidden text \/forbidden\/g/,
  );
  assert.equal(statefulPattern.lastIndex, 0);
});

test('loaded-context measurement includes explicit skill, reference and agent inputs without duplicate inflation', async t => {
  const fixture = createFixture();
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  const { measureLoadedContext } = await import(moduleUrl);
  const files = ['commands/demo/phases/01-start.md', 'agents/definitions/demo-agent.json', 'mcps/demo.json'];
  const measured = measureLoadedContext({ harnessRoot: fixture.harnessRoot, files: [...files, files[0]] });
  assert.equal(measured.files.length, 3);
  assert.equal(measured.words, files.reduce((total, file) => total + fixture.read(file).trim().split(/\s+/).length, 0));
  assert.equal(measured.bytes, files.reduce((total, file) => total + Buffer.byteLength(fixture.read(file)), 0));
  assert.equal(measured.scope, 'explicit-harness-files-only');
  assert.equal(measured.model_tokens, null, 'word counts must not pretend to be actual model token usage');
  assert.throws(() => measureLoadedContext({ harnessRoot: fixture.harnessRoot, files: ['../outside'] }));
  assert.throws(() => measureLoadedContext({ harnessRoot: fixture.harnessRoot, files: ['missing.md'] }));
  fs.symlinkSync('demo.json', path.join(fixture.harnessRoot, 'mcps', 'alias.json'));
  assert.throws(() => measureLoadedContext({ harnessRoot: fixture.harnessRoot, files: ['mcps/alias.json'] }));
});

test('shared command mechanics report deterministic sequence, budget, and dependency failures', async (t) => {
  const fixture = createFixture();
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs, validateCommandMechanics } = await import(moduleUrl);
  const catalogs = buildCommandCatalogs(fixture);

  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs, { mainWordBudget: 2 })),
    /main command exceeds 2-word budget: 3/,
  );
  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs, {
      contract: demoContract({ phases: [{ ...demoContract().phases[0], number: 2 }] }),
    })),
    /phases must be the integers 1 through 1 in order/,
  );
  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs, {
      contract: demoContract({ phases: [{ ...demoContract().phases[0], required_skills: ['missing-skill'] }] }),
    })),
    /Phase 1: unresolved skill missing-skill/,
  );
  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs, {
      contract: demoContract({ phases: [{ ...demoContract().phases[0], file: '../outside.md' }] }),
    })),
    /Phase 1: invalid phase path: dot, parent, or empty path components are forbidden/,
  );
  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs, {
      contract: demoContract({ phases: [{ ...demoContract().phases[0], file: 'other/01-start.md' }] }),
    })),
    /Phase 1: invalid phase path: path must stay beneath phases\//,
  );
});

test('shared command catalogs reject MCP contract symlink escapes', async (t) => {
  const fixture = createFixture();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-outside-'));
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs } = await import(moduleUrl);
  const outsideContract = path.join(outsideRoot, 'outside.json');
  fs.writeFileSync(outsideContract, JSON.stringify({ capabilities: { 'outside.read': {} } }));
  fs.rmSync(path.join(fixture.harnessRoot, 'mcps', 'demo.json'));
  fs.symlinkSync(outsideContract, path.join(fixture.harnessRoot, 'mcps', 'demo.json'));

  assert.throws(
    () => buildCommandCatalogs(fixture),
    /symlinked path is forbidden: mcps\/demo\.json/,
  );
});

test('shared command catalogs reject a symlinked agent-definition directory', async (t) => {
  const fixture = createFixture();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-agents-'));
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs } = await import(moduleUrl);
  fs.writeFileSync(path.join(outsideRoot, 'external-agent.json'), '{}\n');
  fs.rmSync(path.join(fixture.harnessRoot, 'agents', 'definitions'), { recursive: true });
  fs.symlinkSync(outsideRoot, path.join(fixture.harnessRoot, 'agents', 'definitions'));

  assert.throws(
    () => buildCommandCatalogs(fixture),
    /symlinked path is forbidden: agents\/definitions/,
  );
});

test('shared command catalogs reject a symlinked agent-definition file', async (t) => {
  const fixture = createFixture();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-agent-file-'));
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs } = await import(moduleUrl);
  const outsideDefinition = path.join(outsideRoot, 'external-agent.json');
  fs.writeFileSync(outsideDefinition, '{}\n');
  fs.symlinkSync(outsideDefinition, path.join(fixture.harnessRoot, 'agents', 'definitions', 'external-agent.json'));

  assert.throws(
    () => buildCommandCatalogs(fixture),
    /unsafe agent definition: external-agent\.json/,
  );
});

test('shared command mechanics reject phase file symlink escapes', async (t) => {
  const fixture = createFixture();
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-outside-'));
  t.after(() => fs.rmSync(fixture.harnessRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }));
  const { buildCommandCatalogs, validateCommandMechanics } = await import(moduleUrl);
  const catalogs = buildCommandCatalogs(fixture);
  const outsidePhase = path.join(outsideRoot, 'outside.md');
  fs.writeFileSync(outsidePhase, '# Phase 1: Start\nexternal body\n');
  fs.rmSync(path.join(fixture.harnessRoot, 'commands', 'demo', 'phases', '01-start.md'));
  fs.symlinkSync(outsidePhase, path.join(fixture.harnessRoot, 'commands', 'demo', 'phases', '01-start.md'));

  assert.throws(
    () => validateCommandMechanics(mechanicOptions(fixture, catalogs)),
    /Phase 1: unsafe phase file: symlinked path is forbidden: phases\/01-start\.md/,
  );
});

test('read-only containment rejects a cached directory replaced by a symlink', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-cache-'));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-validation-cache-outside-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }));
  const { createExistingContainedPathResolver } = await import(pathsModuleUrl);
  const safeDirectory = path.join(root, 'safe');
  fs.mkdirSync(safeDirectory);
  fs.writeFileSync(path.join(safeDirectory, 'first.txt'), 'first\n');
  fs.writeFileSync(path.join(outsideRoot, 'second.txt'), 'second\n');
  const resolvePath = createExistingContainedPathResolver(root);

  assert.equal(resolvePath('safe/first.txt', { expectedType: 'file' }), path.join(fs.realpathSync(root), 'safe', 'first.txt'));
  fs.renameSync(safeDirectory, path.join(root, 'safe-original'));
  fs.symlinkSync(outsideRoot, safeDirectory);

  assert.throws(
    () => resolvePath('safe/second.txt', { expectedType: 'file' }),
    /directory changed during validation: safe/,
  );
});
