'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Roadmap provides one public command with resolvable core methods and existing shared controls', async () => {
  assert.ok(fs.existsSync(path.join(root, 'commands/roadmap-pro.md')), 'Roadmap command must exist');
  const { validateRoadmapCommand } = await import('../scripts/validate-roadmap-pro-command.mjs');
  const result = validateRoadmapCommand();
  assert.equal(result.status, 'success'); assert.equal(result.phases, 7);
  assert.equal(result.methods, 6); assert.equal(result.canonical_agents, 2);
});

test('Roadmap route validation rejects duplicated, mismatched or unreachable modes', async () => {
  const { validateRoadmapRouteMap } = await import('../scripts/validate-roadmap-pro-command.mjs');
  const original = JSON.parse(read('commands/roadmap-pro/contract.json'));
  validateRoadmapRouteMap(original);
  const bad = edit => { const value = structuredClone(original); edit(value); assert.throws(() => validateRoadmapRouteMap(value)); };
  bad(value => value.capability_routes[0].selector = 'unknown');
  bad(value => value.capability_routes[1] = { ...value.capability_routes[0] });
  bad(value => value.capability_routes[0].agent = 'roadmap-analyst');
  bad(value => value.capability_routes[2].phase = 5);
  bad(value => value.phases[1].required_skills = []);
  bad(value => value.phases[3].agents = []);
});

test('Roadmap imports analytical resources without an approval store or private source templates', () => {
  const methods = ['backlog-structuring', 'priority-advisory', 'human-review', 'product-note', 'execution-planning', 'independent-challenge'];
  for (const suffix of methods) {
    const directory = path.join(root, 'skills', `roadmap-${suffix}`);
    assert.deepEqual(fs.readdirSync(directory).sort(), ['SKILL.md', 'references']);
    assert.equal(fs.readdirSync(path.join(directory, 'references')).length, 1);
  }
  assert.equal(fs.existsSync(path.join(root, 'scripts/lib/roadmap-state.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'scripts/lib/roadmap-packet.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'schemas/roadmap-pro')), false);
  assert.equal(fs.existsSync(path.join(root, 'reference/roadmap-pro/source-formats.json')), false);
});
