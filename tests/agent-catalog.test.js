'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(HARNESS_ROOT, relativePath), 'utf8'));
}

test('canonical agent catalog passes deterministic validation', () => {
  const output = childProcess.execFileSync(
    process.execPath,
    [path.join(HARNESS_ROOT, 'scripts', 'validate-agent-catalog.mjs')],
    { encoding: 'utf8' },
  );

  assert.match(output, /agent catalog valid:/);
});

test('approved manifest covers imported and newly named canonical roles without duplicate sources', () => {
  const manifest = readJson('agents/rename-manifest.json');
  const sources = new Set(manifest.mappings.map(({ source }) => source));
  const createdSources = new Set(manifest.created.map(({ source }) => source));
  const targets = new Set([...manifest.mappings, ...manifest.created].map(({ target }) => target));

  assert.equal(manifest.mappings.length, 66);
  assert.equal(sources.size, 66);
  assert.equal(manifest.created.length, 11);
  assert.equal(createdSources.size, 11);
  assert.equal(targets.size, 61);
});

test('Claude tool names live in adapters and not canonical definitions', () => {
  const adapters = readJson('agents/adapters/capabilities.json');
  const definitionsRoot = path.join(HARNESS_ROOT, 'agents', 'definitions');
  const definitionText = fs.readdirSync(definitionsRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => fs.readFileSync(path.join(definitionsRoot, name), 'utf8'))
    .join('\n');

  assert.deepEqual(adapters.capabilities['workspace.search'].claude, ['Grep', 'Glob']);
  assert.deepEqual(adapters.capabilities['terminal.execute'].claude, ['Bash']);
  assert.deepEqual(adapters.capabilities['filesystem.read'].claude, ['Read']);
  assert.doesNotMatch(definitionText, /"(?:Read|Grep|Glob|Bash|Write|Edit|CallMcpTool)"/);
});

test('every canonical agent requires and confines a caller-supplied artifact root', () => {
  const definitionsRoot = path.join(HARNESS_ROOT, 'agents', 'definitions');

  for (const name of fs.readdirSync(definitionsRoot).filter((file) => file.endsWith('.json'))) {
    const definition = readJson(path.join('agents', 'definitions', name));
    assert.ok(definition.required_inputs.includes('artifact_root'), name);
    assert.equal(definition.artifact_policy.root_input, 'artifact_root', name);
    assert.equal(definition.artifact_policy.invent_paths, false, name);
    assert.equal(definition.artifact_policy.path_escape, 'forbid', name);
  }
});

test('every agent skill dependency resolves to a canonical skill', () => {
  const definitionsRoot = path.join(HARNESS_ROOT, 'agents', 'definitions');
  const skillNames = new Set(fs.readdirSync(path.join(HARNESS_ROOT, 'skills'))
    .filter((name) => fs.existsSync(path.join(HARNESS_ROOT, 'skills', name, 'SKILL.md'))));

  for (const name of fs.readdirSync(definitionsRoot).filter((file) => file.endsWith('.json'))) {
    const definition = readJson(path.join('agents', 'definitions', name));
    for (const skill of definition.skills) assert.ok(skillNames.has(skill), `${name}: ${skill}`);
  }
});

test('specialist overlays are evidence-gated and cannot widen capabilities', () => {
  const overlaysRoot = path.join(HARNESS_ROOT, 'agents', 'overlays', 'definitions');
  const overlays = fs.readdirSync(overlaysRoot).filter((name) => name.endsWith('.json'));
  assert.equal(overlays.length, 8);
  for (const fileName of overlays) {
    const overlay = readJson(path.join('agents', 'overlays', 'definitions', fileName));
    assert.equal(overlay.capability_widening, false, fileName);
    assert.ok(overlay.detect.files_any.length + overlay.detect.dependencies_any.length + (overlay.detect.terms_any?.length ?? 0) > 0, fileName);
  }
});

test('AI overlay activates from bounded task context without affecting non-AI work', () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-ai-overlay-'));
  try {
    fs.writeFileSync(path.join(repository, 'package.json'), JSON.stringify({ dependencies: {} }));
    const resolver = path.join(HARNESS_ROOT, 'scripts', 'resolve-agent-overlays.mjs');
    const ai = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', repository, '--agent', 'implementation-planner', '--context', 'Build an LLM feature with tool calling'], { encoding: 'utf8' }));
    assert.deepEqual(ai.overlays.map(({ name }) => name), ['ai-product']);
    assert.deepEqual(ai.overlays[0].evidence.terms, ['LLM', 'tool calling']);

    const ordinary = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', repository, '--agent', 'implementation-planner', '--context', 'Add a deterministic CSV export'], { encoding: 'utf8' }));
    assert.deepEqual(ordinary.overlays, []);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('overlay resolver selects only evidence-backed overlays compatible with the agent', () => {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-overlays-'));
  try {
    fs.writeFileSync(path.join(repository, 'package.json'), JSON.stringify({ dependencies: { nuxt: '^4.0.0', mongoose: '^9.0.0' } }));
    const resolver = path.join(HARNESS_ROOT, 'scripts', 'resolve-agent-overlays.mjs');

    const frontend = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', repository, '--agent', 'frontend-developer'], { encoding: 'utf8' }));
    assert.deepEqual(frontend.overlays.map(({ name }) => name), ['vue-nuxt-frontend']);

    const database = JSON.parse(childProcess.execFileSync(process.execPath, [resolver, '--repo', repository, '--agent', 'database-engineer'], { encoding: 'utf8' }));
    assert.deepEqual(database.overlays.map(({ name }) => name), ['mongodb-database']);
  } finally {
    fs.rmSync(repository, { recursive: true, force: true });
  }
});

test('every canonical agent is routed by at least one command and legacy names stay absent', () => {
  const command = ['feature-pro', 'architecture-pro', 'outcome-pro', 'customer-backward-pro', 'roadmap-pro'].flatMap((name) => {
    const commandRoot = path.join(HARNESS_ROOT, 'commands', name);
    return [
      fs.readFileSync(path.join(HARNESS_ROOT, 'commands', `${name}.md`), 'utf8'),
      ...fs.readdirSync(commandRoot, { recursive: true })
        .filter((entry) => entry.endsWith('.md'))
        .map((entry) => fs.readFileSync(path.join(commandRoot, entry), 'utf8')),
    ];
  }).join('\n');
  const manifest = readJson('agents/rename-manifest.json');
  const definitionsRoot = path.join(HARNESS_ROOT, 'agents', 'definitions');

  for (const fileName of fs.readdirSync(definitionsRoot).filter((name) => name.endsWith('.json'))) {
    const canonicalName = fileName.slice(0, -'.json'.length);
    assert.ok(command.includes(`\`${canonicalName}\``), `missing canonical command route: ${canonicalName}`);
  }

  for (const { source, target } of manifest.mappings) {
    if (source !== target) {
      assert.ok(!command.includes(`\`${source}\``), `legacy agent route remains: ${source} -> ${target}`);
    }
  }
});

test('Roadmap methods reuse two read-only permission classes with exact canonical routing', () => {
  const contract = readJson('commands/roadmap-pro/contract.json');
  const expected = [
    ['backlog', 'roadmap-backlog-structuring', 'roadmap-curator', 2],
    ['priorities', 'roadmap-priority-advisory', 'roadmap-analyst', 3],
    ['challenge', 'roadmap-independent-challenge', 'roadmap-analyst', 4],
    ['human-review', 'roadmap-human-review', 'roadmap-curator', 5],
    ['product-notes', 'roadmap-product-note', 'roadmap-curator', 6],
    ['execution', 'roadmap-execution-planning', 'roadmap-analyst', 7],
  ];
  assert.deepEqual(contract.capability_routes.map(({ selector, skill, agent, phase }) => [selector, skill, agent, phase]), expected);
  const profiles = readJson('agents/capability-profiles.json').profiles;
  for (const [name, profile] of [['roadmap-curator', 'static-analysis-read-only'], ['roadmap-analyst', 'evidence-analysis-read-only']]) {
    const definition = readJson(`agents/definitions/${name}.json`);
    assert.equal(definition.capability_profile, profile);
    assert.equal(definition.mode, 'advisory');
    assert.ok(definition.required_inputs.includes('roadmap_mode'));
    assert.ok(definition.required_inputs.includes('artifact_root'));
    assert.deepEqual([...definition.skills].sort(), expected.filter(row => row[2] === name).map(row => row[1]).sort());
    assert.equal(definition.artifact_policy.repository_writes, 'deny');
    assert.equal(profiles[profile].external_access, 'deny');
    assert.ok(!profiles[profile].capabilities.includes('artifact.write'));
    assert.ok(!profiles[profile].capabilities.includes('repository.write'));
  }
});
