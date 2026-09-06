'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('Debug Pro preserves thirteen ordered stages with a compact progressive command', () => {
  const contract = json('commands/debug-pro/contract.json');
  const main = read('commands/debug-pro.md');
  assert.equal(contract.phase_count, 13);
  assert.equal(contract.loading, 'global-once-current-phase-only');
  assert.deepEqual(contract.phases.map(({ number }) => number), Array.from({ length: 13 }, (_, i) => i + 1));
  assert.ok(main.split(/\s+/).length <= 1400);
  assert.match(main, /--phase <1-13>/);
  assert.match(main, /--capability <name>/);
  assert.equal(contract.artifact_root, '$REPO_ROOT/.agents/debug/<debug-slug>');
});

test('Debug reuses the catalog and resolution schema without new agents, providers or historical machinery', () => {
  const names = json('skills/resolution-manifest.json').skills.map(({ name }) => name);
  assert.deepEqual(names.filter((name) => name.startsWith('debug-')).sort(), ['debug-core', 'debug-pro']);
  assert.ok(!fs.readdirSync(path.join(ROOT, 'agents/definitions')).some((name) => name.startsWith('debug-')));
  assert.deepEqual(Object.keys(json('mcps/providers.json').providers).sort(), ['exa', 'firecrawl', 'mermaid', 'playwright', 'vercel']);
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'schemas/debug-pro')), ['resolution.schema.json']);
  assert.equal(json('schemas/debug-pro/resolution.schema.json').allOf[0].$ref, '../review-pro/debug-resolution-input.schema.json#/$defs/nested');
  assert.ok(names.includes('systematic-debugging') && names.includes('verification-before-completion'));
});

test('Debug has shared tracing and completion gates and no legacy runtime taxonomy', () => {
  const contract = json('commands/debug-pro/contract.json');
  const files = ['commands/debug-pro.md', 'commands/debug-pro/routing.md', 'skills/debug-core/SKILL.md', 'skills/debug-pro/SKILL.md',
    ...contract.phases.map(({ file }) => 'commands/debug-pro/' + file),
    ...fs.readdirSync(path.join(ROOT, 'skills/debug-core/references')).map((file) => 'skills/debug-core/references/' + file)];
  const bundle = files.map(read).join('\n');
  assert.doesNotMatch(bundle, /\.agent_docs|God-level|~\/\.(?:claude|codex|cursor)\//i);
  assert.doesNotMatch(bundle, /\b(?:gstack|superpowers)\b|debug-pro\/(?:state|evidence-ledger|rca)@/i);
  assert.ok(json('schemas/workflow-event/workflow-event.schema.json').properties.workflow.enum.includes('debug-pro'));
  assert.ok(json('hooks/registry.json').hooks.some((hook) => hook.workflow === 'debug-pro' && hook.event === 'before-run-completion'));
  for (const required of ['DEBUG_REPORT.md', 'run-events.jsonl', 'resolution.json', 'UNRESOLVED', 'SPEC_DECISION_REQUIRED', 'ARCHITECTURE_DECISION_REQUIRED', 'NEW_CAPABILITY_REQUIRED']) assert.ok(bundle.includes(required), required);
});
