'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));

const expectedSkills = [
  'explainer-pro',
  'explainer-core',
  'explainer-orientation',
  'explainer-architecture',
  'explainer-feature-tracing',
  'explainer-system-views',
  'explainer-reference',
  'explainer-comprehension',
  'change-explanation',
];

test('Explainer Pro exposes one compact eight-phase command', () => {
  const command = read('commands/explainer-pro.md');
  const contract = json('commands/explainer-pro/contract.json');
  assert.equal(contract.command, 'explainer-pro');
  assert.equal(contract.identity, 'Pro-Level Repository Learning Guide');
  assert.equal(contract.phase_count, 8);
  assert.equal(contract.artifact_root, '$REPO_ROOT/.agents/explanations/<explanation-slug>');
  assert.deepEqual(contract.phases.map(({ number }) => number), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const phase of contract.phases) assert.ok(fs.existsSync(path.join(ROOT, 'commands', 'explainer-pro', phase.file)), phase.file);
  assert.equal(fs.existsSync(path.join(ROOT, 'commands', 'explainer')), false);
  assert.match(command, /--capability/);
  assert.match(command, /\.agents\/explanations\/<explanation-slug>/);
  assert.match(command, /Pro-Level Repository Learning/);
  assert.ok(command.trim().split(/\s+/).length <= 1600);
});

test('Explainer Pro uses nine consolidated flat skills and existing canonical agents', () => {
  const manifest = json('skills/resolution-manifest.json');
  const names = new Set(manifest.skills.map(({ name }) => name));
  for (const name of expectedSkills) {
    assert.ok(names.has(name), `missing ${name}`);
    assert.match(read(`skills/${name}/SKILL.md`), new RegExp(`^---\\nname: ${name}\\n`, 'm'));
  }
  assert.equal(expectedSkills.length, 9);
  const contract = json('commands/explainer-pro/contract.json');
  const agents = new Set(contract.phases.flatMap(({ agents: phaseAgents }) => phaseAgents));
  assert.deepEqual([...agents].sort(), ['data-model-architect', 'repository-explorer', 'system-architect']);
  for (const name of agents) assert.ok(fs.existsSync(path.join(ROOT, 'agents', 'definitions', `${name}.json`)));
});

test('Explainer Pro canonical surface is runtime neutral and repository owned', () => {
  const files = [
    'commands/explainer-pro.md',
    'commands/explainer-pro/routing.md',
    ...expectedSkills.map((name) => `skills/${name}/SKILL.md`),
  ];
  const text = files.map(read).join('\n');
  const legacy = new RegExp(`God[- ]level|\\.agent_docs|~\\/Explanations|~\\/\\.(?:claude|cursor)|${['g', 'stack'].join('')}|${['super', 'powers'].join('')}|${['Context', '7'].join('')}|${['Updated', 'Personal', 'Harness'].join('-')}`, 'i');
  assert.doesNotMatch(text, legacy);
  assert.match(text, /artifact_root/);
  assert.match(text, /\.agents\/explanations/);
});

test('Explainer Pro reuses existing capabilities and adds no provider', () => {
  const contract = json('commands/explainer-pro/contract.json');
  const registry = json('mcps/registry.json');
  const registered = new Set();
  for (const entry of registry.contracts) {
    const capability = json(`mcps/${entry.path}`);
    Object.keys(capability.capabilities).forEach((name) => registered.add(name));
  }
  for (const name of contract.phases.flatMap(({ capabilities }) => capabilities)) assert.ok(registered.has(name), name);
  assert.deepEqual(contract.phases[5].capabilities, ['firecrawl.search', 'firecrawl.scrape']);
});

test('Explainer Pro preserves outcomes without importing Python or external prompt material', () => {
  const reconciliation = json('commands/explainer-pro/reconciliation.json');
  assert.equal(reconciliation.status, 'reconciled-with-approved-normalizations');
  assert.equal(reconciliation.phase_map.length, 8);
  assert.ok(reconciliation.preserved_outcomes.length >= 8);
  for (const name of expectedSkills) {
    const root = path.join(ROOT, 'skills', name);
    const entries = fs.readdirSync(root, { recursive: true });
    assert.equal(entries.some((entry) => String(entry).endsWith('.py')), false);
  }
  assert.equal(fs.existsSync(path.join(ROOT, 'reference', 'explain-diff-html.md')), false);
  for (const helper of ['resolve-explainer-root.mjs', 'explainer-source.mjs', 'explainer-change-intake.mjs', 'explainer-course.mjs']) assert.ok(fs.existsSync(path.join(ROOT, 'scripts', helper)));
});

test('Explainer Pro batches work after the opening choice without duplicate validation', () => {
  const command = read('commands/explainer-pro.md');
  const routing = read('commands/explainer-pro/routing.md');
  const entry = read('skills/explainer-pro/SKILL.md');
  assert.match(command, /begin authorized local inspection in the same turn/);
  assert.match(command, /wait for the user's choice/);
  assert.match(entry, /opening roadmap.*entry choice/);
  assert.match(command, /completion hook once/);
  assert.match(entry, /completion hook once/);
  assert.match(routing, /publish --batch/);
  assert.match(routing, /Only the coordinator publishes/);
  assert.match(routing, /independently gated staged section/);
  assert.match(routing, /separate fresh verification invocation/);
  assert.match(routing, /no duplicate manual validators/);
});

test('Explainer Pro reuses only unchanged verified evidence and retains source checks at final delivery', () => {
  const grounding = read('skills/explainer-core/references/grounding-contract.md');
  const phase = read('commands/explainer-pro/phases/07-verify.md');
  const comprehension = read('skills/explainer-comprehension/SKILL.md');
  assert.match(grounding, /generation digests validate/);
  assert.match(grounding, /Keep its original `gated_at`/);
  assert.match(grounding, /30-percent non-material sampling and failure expansion/);
  assert.match(phase, /new, changed, materially dependent, or unverified claims/);
  assert.match(comprehension, /fresh source-reading verifier/);
  assert.doesNotMatch(comprehension, /fresh source pass over all material claims/);
});
