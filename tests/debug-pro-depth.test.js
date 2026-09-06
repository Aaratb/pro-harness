'use strict';

// Instruction/activation regressions, not a model-quality or latency benchmark.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const contract = JSON.parse(read('commands/debug-pro/contract.json'));
const phase = number => read('commands/debug-pro/' + contract.phases.find(p => p.number === number).file);

test('debug activates existing challenge and repair-review methods at their actual phases', () => {
  const routes = { 7: ['architecture-diagnostics'], 10: ['architecture-diagnostics'], 12: ['pre-merge-review', 'ai-product-engineering'], 6: ['ai-product-engineering'] };
  for (const [number, names] of Object.entries(routes)) {
    const entry = contract.phases.find(p => p.number === Number(number));
    for (const name of names) {
      assert.ok(entry.optional_skills.includes(name), `phase ${number}: ${name}`);
      assert.ok(phase(Number(number)).includes(name), `phase ${number} explains ${name}`);
      assert.ok(fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')));
    }
  }
  assert.ok(contract.phases.find(p => p.number === 10).agents.includes('system-diagnostics-analyst'));
});

test('debug dispatch supplies current methods under caller-owned governance without schema expansion', () => {
  const routing = read('commands/debug-pro/routing.md');
  for (const term of ['canonical definition', 'fresh general agent', 'host-enforced', 'instruction-only', 'lane_contract', 'evidence_manifest', 'DEBUG_REPORT.md']) assert.ok(routing.includes(term), term);
  assert.match(routing, /Do not import.*(?:governance|state machine)/);
  assert.match(routing, /static.*return.*orchestrator/i);
  assert.match(routing, /Do not add.*(?:schema|packet)/);
});

test('debug starts useful work after entry choice without exhaustive phase workloads', () => {
  assert.match(phase(1), /opening roadmap and entry choice/);
  assert.match(phase(1), /same response|same turn/);
  assert.match(read('commands/debug-pro.md'), /not thirteen mandatory workloads/);
  assert.deepEqual(contract.modes['observe-only'], [1, 2, 3, 4, 5, 13]);
  assert.match(phase(2), /user.*state|state.*user/i);
});

test('systematic debugging carries substantive causal methods, not a three-step placeholder', () => {
  const skill = read('skills/systematic-debugging/SKILL.md');
  for (const term of ['invariant', 'unaffected', 'counterevidence', 'prediction', 'mock', 'mitigation']) assert.ok(skill.includes(term), term);
  assert.match(skill, /caller.*(?:authority|gates)|(?:authority|gates).*caller/);
  assert.match(skill, /diagnosis-only/);
  assert.match(skill, /schema|artifact/);
});

test('debug causal challenge cannot relabel an author as an independent reviewer', () => {
  const text = phase(10) + read('skills/debug-core/references/causal-experiments.md');
  assert.match(text, /counterevidence/);
  assert.match(text, /prediction/);
  assert.match(text, /self-critique/);
  assert.match(text, /actual.*(?:identity|runtime)|(?:identity|runtime).*actual/i);
  assert.match(phase(12), /independent.*code review/);
});

test('debug repair proof inspects durable outcomes and does not weaken the original oracle', () => {
  const text = read('skills/debug-core/references/repair-and-handoff.md');
  for (const term of ['durable', 'mock', 'DEBUG_REPORT.md', 'PARTIALLY_RESOLVED']) assert.ok(text.includes(term), term);
  assert.match(text, /without weakening|unchanged.*(?:oracle|assertion)/);
  assert.match(text, /changes the expected behavior/);
  assert.match(text, /same command\/assertion/);
  assert.match(text, /original un-minimized reproduction/);
  assert.match(text, /historical records/);
  assert.match(phase(12), /probabilistic/);
});

test('debug reuses qualifying pre-correction evidence without waiving fresh final proof', () => {
  const core = read('skills/debug-core/SKILL.md');
  assert.match(core, /Reuse qualifying evidence across phases/);
  assert.match(core, /unchanged source, fixture, assertion and pre-correction chronology/);
  assert.match(core, /fresh original reproduction remain mandatory/);
  assert.match(phase(11), /reuse a qualifying existing permanent regression/);
  assert.match(read('commands/debug-pro.md'), /Reuse a qualifying existing permanent regression test or write one after eligibility/);
  assert.match(phase(13), /validator acceptance.*not the truth/);
});

test('debug retains the existing packet, outputs, phase count and compact entry budget', () => {
  assert.equal(contract.phase_count, 13);
  assert.equal(contract.loading, 'global-once-current-phase-only');
  assert.deepEqual(fs.readdirSync(path.join(root, 'schemas/debug-pro')), ['resolution.schema.json']);
  assert.equal(JSON.parse(read('schemas/debug-pro/resolution.schema.json')).allOf[0].$ref, '../review-pro/debug-resolution-input.schema.json#/$defs/nested');
  assert.ok(read('commands/debug-pro.md').split(/\s+/).length <= 1400);
  assert.match(read('commands/debug-pro.md'), /No automatic commit, pull request, deployment/);
});
