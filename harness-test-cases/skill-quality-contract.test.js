const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

const expected = {
    'product-manager': ['product-discovery', 'plan-product-review'],
    'product-owner': ['create-prd', 'plan-product-review'],
    'prototype-designer': ['design-options', 'plan-design-review'],
    'frontend-developer': ['design-system'],
    'ux-researcher': ['plan-design-review'],
    'system-architect': ['plan-engineering-review'],
    'end-to-end-tester': ['e2e-testing', 'browser-qa'],
};

test('core specialist roles actually bind their relevant existing skills', () => {
  for (const [name, skills] of Object.entries(expected)) {
    const definition = JSON.parse(read(`agents/definitions/${name}.json`));
    for (const skill of skills) assert.ok(definition.skills.includes(skill), `${name} -> ${skill}`);
  }
});

test('all runtime adapter generators carry the canonical specialist bindings', async () => {
  const { generateRuntimeAdapters } = await import('../scripts/lib/runtime-adapters.mjs');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-quality-adapters-'));
  try {
    generateRuntimeAdapters({ harnessRoot: root, outputRoot: path.join(temporary, 'generated'), canonicalRoot: root });
    for (const runtime of ['claude', 'codex', 'cursor']) {
      for (const [agent, skills] of Object.entries(expected)) {
        const extension = runtime === 'codex' ? 'toml' : 'md';
        const generated = fs.readFileSync(path.join(temporary, 'generated', runtime, 'agents', `${agent}.${extension}`), 'utf8');
        for (const skill of skills) assert.ok(generated.includes(skill), `${runtime}: ${agent} -> ${skill}`);
        assert.ok(generated.includes('artifact_root'));
        assert.ok(generated.includes('without widening scope'));
      }
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('quality probes are bounded fixtures, not keyword-based claims of model quality', () => {
  const cases = JSON.parse(read('evals/skill-quality/cases.json')).cases;
  assert.deepEqual(cases.map(c => c.id), ['product', 'design', 'engineering', 'qa']);
  for (const entry of cases) {
    assert.equal(entry.rubric.length, 5);
    assert.ok(entry.task.length < 2000);
    for (const name of entry.skills) assert.ok(fs.existsSync(path.join(root,'skills',name,'SKILL.md')));
  }
});

test('design direction is contextual rather than a fixed palette or typeface quota', () => {
  const phase = read('commands/feature-pro/phases/04-design.md');
  assert.match(phase, /token plan before any component code/);
  assert.match(phase, /existing brand/);
  assert.doesNotMatch(phase, /4–6 named colors|2\+ typefaces|one signature element/);
});

test('missing named adapters can use a fresh general agent without widening authority', () => {
  const routing = read('commands/feature-pro/routing.md');
  assert.match(routing, /fresh general agent/);
  assert.match(routing, /same or stricter/);
  assert.match(routing, /canonical definition and relevant skills/);
  assert.match(routing, /user waiver/);
});
