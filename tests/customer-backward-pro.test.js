'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const contract = () => JSON.parse(read('commands/customer-backward-pro/contract.json'));
const validator = () => import(pathToFileURL(path.join(ROOT, 'scripts/validate-customer-backward-pro-command.mjs')));

test('Customer command validates its routes, source links and progressive command budget', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-customer-backward-pro-command.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).phases, 8);
});

test('Customer route map accepts sixteen distinct methods and rejects conflicting selector or agent', async () => {
  const { validateCustomerRouteMap } = await validator();
  assert.doesNotThrow(() => validateCustomerRouteMap(contract()));
  for (const mutate of [
    (c) => c.capability_routes.push({ ...c.capability_routes[0] }),
    (c) => { c.capability_routes[0].agent = 'product-manager'; },
    (c) => { c.capability_routes[0].skill = 'customer-independent-challenge'; },
    (c) => { c.capability_routes[0].phase = 9; },
    (c) => { c.capability_routes[0].selector = 'all'; },
    (c) => { c.capability_routes.pop(); },
  ]) {
    const changed = contract();
    mutate(changed);
    assert.throws(() => validateCustomerRouteMap(changed));
  }
});

test('each selected method is reachable without loading unrelated phase skills', () => {
  const c = contract();
  for (const route of c.capability_routes) {
    const phase = c.phases.find(({ number }) => number === route.phase);
    assert.ok([...phase.required_skills, ...phase.optional_skills].includes(route.skill), route.selector);
    assert.ok(phase.agents.includes(route.agent), route.selector);
    assert.ok(read(`commands/customer-backward-pro/${phase.file}`).includes(`\`${route.skill}\``), route.selector);
  }
  assert.equal(fs.existsSync(path.join(ROOT, 'commands/customer-backward-pro-framing.md')), false);
});

test('Customer roles retain distinct existing permission profiles and exact approved mode ownership', () => {
  const profiles = JSON.parse(read('agents/capability-profiles.json')).profiles;
  for (const [name, profile] of [['customer-researcher', 'static-analysis-read-only'], ['customer-evidence-analyst', 'evidence-analysis-read-only']]) {
    const definition = JSON.parse(read(`agents/definitions/${name}.json`));
    assert.equal(definition.capability_profile, profile);
    assert.equal(definition.artifact_policy.repository_writes, 'deny');
    assert.equal(profiles[profile].external_access, 'deny');
    assert.ok(!profiles[profile].capabilities.includes('artifact.write'));
    assert.ok(definition.required_inputs.includes('research_mode'));
    assert.ok(definition.required_inputs.includes('artifact_root'));
    assert.deepEqual([...definition.skills].sort(), contract().capability_routes.filter((r) => r.agent === name).map((r) => r.skill).sort());
  }
});

test('Customer adds only existing public acquisition routes, not provider or worker network authority', () => {
  const registry = JSON.parse(read('mcps/registry.json'));
  const owners = registry.contracts.filter((entry) => entry.workflows['customer-backward-pro']);
  assert.deepEqual(owners.map(({ name }) => name).sort(), ['exa', 'firecrawl']);
  for (const entry of owners) assert.deepEqual(entry.workflows['customer-backward-pro'], [2]);
  assert.ok(JSON.parse(read('schemas/workflow-event/workflow-event.schema.json')).properties.workflow.enum.includes('customer-backward-pro'));
  assert.equal(fs.existsSync(path.join(ROOT, 'hooks/customer-backward-pro')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'schemas/customer-backward-pro/state.schema.json')), false);
});

test('Customer selected phases use the shared append-only trace with real lifecycle validation', () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'customer-trace-')));
  const args = ['--artifact-root', root, '--workflow', 'customer-backward-pro', '--run-id', 'synthetic-study'];
  const record = (event, status, phase) => spawnSync(process.execPath, [
    path.join(ROOT, 'scripts/record-workflow-event.mjs'), ...args,
    '--event', event, '--status', status, '--summary', 'Synthetic research lifecycle',
    ...(phase === undefined ? [] : ['--phase', String(phase)]),
  ], { encoding: 'utf8' });
  try {
    assert.notEqual(record('phase-completed', 'passed', 2).status, 0, 'completion before start must fail');
    for (const [event, status, phase] of [
      ['run-started', 'in-progress'], ['phase-started', 'in-progress', 2], ['phase-completed', 'passed', 2],
      ['phase-started', 'in-progress', 5], ['phase-completed', 'passed', 5],
      // Research can revisit a completed phase when evidence changes.
      ['phase-started', 'in-progress', 2], ['phase-completed', 'passed', 2], ['run-completed', 'passed'],
    ]) {
      const result = record(event, status, phase);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const before = fs.readFileSync(path.join(root, 'run-events.jsonl'));
    const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/validate-workflow-trace.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'success');
    assert.notEqual(record('phase-started', 'in-progress', 6).status, 0, 'terminal run cannot silently resume');
    assert.deepEqual(fs.readFileSync(path.join(root, 'run-events.jsonl')), before, 'failed writes must not damage accepted history');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
