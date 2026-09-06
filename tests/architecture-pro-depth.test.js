'use strict';

// Instruction/activation regressions, not a measurement of model judgment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const phase = name => read(`commands/architecture-pro/phases/${name}.md`);
const contract = JSON.parse(read('commands/architecture-pro/contract.json'));

test('architecture decision methods and interactive discovery have real current-phase routes', () => {
  for (const number of [7, 9]) {
    const entry = contract.phases.find(p => p.number === number);
    assert.ok(entry.required_skills.includes('plan-engineering-review'));
    assert.match(read(`commands/architecture-pro/${entry.file}`), /plan-engineering-review/);
  }
  for (const number of [1, 7, 8]) {
    const entry = contract.phases.find(p => p.number === number);
    assert.ok(entry.optional_skills.includes('grill-with-docs'));
    assert.match(read(`commands/architecture-pro/${entry.file}`), /grill-with-docs/);
  }
  for (const entry of contract.phases) {
    for (const skill of [...entry.required_skills, ...entry.optional_skills]) {
      assert.ok(fs.existsSync(path.join(root, 'skills', skill, 'SKILL.md')), skill);
    }
  }
});

test('architecture dispatch delivers current skills and reports actual permission-control limits', () => {
  const routing = read('commands/architecture-pro/routing.md');
  for (const text of ['canonical definition and relevant skills', 'fresh general agent', 'same or stricter',
    'state.lane_runs', 'Prompt instructions alone', 'static-analysis-read-only', 'skill paths and digests']) {
    assert.ok(routing.includes(text), text);
  }
  assert.match(routing, /all design option sets/);
  assert.match(routing, /host-enforced versus instruction-only/);
  assert.match(routing, /not by itself a new workflow gate/);
  assert.match(routing, /requires host-enforced isolation.*unavailable/);
  assert.match(routing, /critique.*response.*synthesis/i);
  assert.match(routing, /changed.*(?:recommendation|design)|(?:recommendation|design).*changed/i);
});

test('architecture options connect business scenarios to visible architecture before selection', () => {
  assert.match(phase('01-intake'), /business goal/);
  assert.match(phase('02-context'), /greenfield/i);
  assert.match(phase('02-context'), /missing code map.*not.*block/i);
  const options = phase('07-options');
  assert.match(options, /stimulus.*environment.*response.*measure/i);
  assert.match(options, /component.*sequence/i);
  assert.match(options, /before.*approval/i);
  assert.match(phase('08-decision'), /sensitivity/);
});

test('deep design joins specialist views through invariants, contracts and build slices', () => {
  const deep = phase('09-deep-design');
  for (const text of ['cross-lane', 'invariant', 'authoritative', 'success', 'failure']) assert.ok(deep.includes(text), text);
  assert.match(deep, /proposal.*not.*(?:observed|measured)/i);
  assert.match(phase('11-handoff'), /boundary.*contract.*slice.*verification/i);
  assert.match(phase('11-handoff'), /Feature Pro/);
});

test('walkthrough reuses earlier views and never fabricates alternatives or current code', () => {
  const walkthrough = phase('12-walkthrough');
  const diagrams = read('skills/architecture-explanation-diagrams/SKILL.md');
  assert.doesNotMatch(walkthrough, /at least two rejected alternatives/i);
  assert.match(walkthrough, /reuse.*(?:view|diagram)|(?:view|diagram).*reuse/i);
  assert.match(diagrams, /proposed.*(?:observed|existing)|(?:observed|existing).*proposed/i);
  assert.match(diagrams, /same.*(?:component|identifier)|(?:component|identifier).*same/i);
});

test('architecture delivers rendered views at decision checkpoints including ADR-only', () => {
  for (const number of [2, 7, 9, 12]) {
    const entry = contract.phases.find(p => p.number === number);
    assert.ok(entry.required_skills.includes('architecture-explanation-diagrams'), `Phase ${number} diagram method`);
    const instructions = read(`commands/architecture-pro/${entry.file}`);
    assert.match(instructions, /architecture-explanation-diagrams/);
    assert.match(instructions, /rendered/i);
  }
  assert.deepEqual(contract.modes['adr-only'], [1, 2, 7, 8, 9, 10]);
  assert.match(phase('10-design-certification'), /ADR-only.*(?:visual|view)/i);
  assert.match(phase('12-walkthrough'), /EXPLAIN\.html/);
  assert.match(phase('13-architect-review'), /visual.*(?:incomplete|inspection)|(?:incomplete|inspection).*visual/i);
});

test('architecture change notation distinguishes nodes and edges without relying on colour', () => {
  const diagrams = read('skills/architecture-explanation-diagrams/SKILL.md');
  for (const label of ['EXISTING', 'NEW', 'CHANGED', 'PROPOSED REMOVAL']) assert.ok(diagrams.includes(label), label);
  assert.match(diagrams, /nodes.*(?:edges|relationships)|(?:edges|relationships).*nodes/i);
  assert.match(diagrams, /unchanged components.*(?:changed|new).*relationship/i);
  assert.match(diagrams, /legend/i);
  assert.match(diagrams, /not.*colou?r.*alone|colou?r-independent/i);
  assert.match(diagrams, /inference.*separate|separate.*inference/i);
  assert.match(diagrams, /before.*after|current.*target/i);
  assert.doesNotMatch(diagrams, /Local Mermaid source is sufficient|visually or textually distinct/i);
});

test('architecture uses the existing local companion path without pretending syntax proves visual quality', () => {
  const diagrams = read('skills/architecture-explanation-diagrams/SKILL.md');
  const guide = read('docs/architecture-visuals.md');
  const routing = read('commands/architecture-pro/routing.md');
  assert.match(diagrams, /docs\/architecture-visuals\.md/);
  for (const text of ['generate-artifact-companion.mjs', 'validate-artifact-companion.mjs', '--render-diagrams', '--profile architecture', 'artifact_digests']) assert.ok(guide.includes(text), text);
  assert.match(guide, /no network/i);
  assert.match(guide, /unsupported.*(?:fail|error)|(?:fail|error).*unsupported/i);
  assert.match(guide, /inspect.*(?:rendered|visual)|(?:rendered|visual).*inspect/i);
  assert.match(guide, /visual.*incomplete|incomplete.*visual/i);
  assert.match(routing, /local rendering.*(?:authority|permission)|(?:authority|permission).*local rendering/i);
  assert.match(routing, /external.*consent|consent.*external/i);
});

test('architecture review challenges the design rather than requesting a user memory test', () => {
  const readiness = read('skills/architecture-review-readiness/SKILL.md');
  assert.match(readiness, /architect.*teach-back|teach-back.*architect/i);
  assert.match(readiness, /not.*(?:quiz|exam)/i);
  assert.match(readiness, /counterexample|falsif/i);
  assert.match(readiness, /owner/);
});

test('scoped ADR and proposed recovery do not imply whole-system operational certification', () => {
  const deep = phase('09-deep-design');
  assert.match(deep, /affected operation and its dependencies/);
  assert.match(deep, /does not remove the mandatory security\/conformance baseline/);
  assert.match(phase('10-design-certification'), /For ADR-only, sufficiency/);
  assert.match(phase('10-design-certification'), /no Feature Pro handoff by default/);
  const recovery = read('skills/architecture-data-recovery/SKILL.md');
  assert.match(recovery, /certification of an operational recovery claim/);
  assert.match(recovery, /preserve all measurements required/);
});
