'use strict';

// Instruction wiring regressions, not proof of native UI or model interaction quality.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const phase = name => read(`commands/architecture-pro/phases/${name}.md`);
const contract = JSON.parse(read('commands/architecture-pro/contract.json'));

test('architecture makes visual co-design an active contract rather than a final approval request', () => {
  const command = read('commands/architecture-pro.md');
  const routing = read('commands/architecture-pro/routing.md');
  assert.match(command, /co-design/i);
  assert.match(routing, /## Collaborative architecture/);
  for (const concept of [/provisional.*(?:view|shape)/i, /recommendation/i, /strongest.*objection/i,
    /user.*alternative/i, /(?:answer|input).*changed/i, /not.*(?:quiz|exam)/i]) assert.match(routing, concept);
  assert.match(routing, /not.*(?:approval|consent).*|(?:approval|consent).*not/i);
});

test('existing native question method is available at collaborative checkpoints without new skills', () => {
  for (const number of [1, 2, 5, 7, 8, 9, 12]) {
    const entry = contract.phases.find(item => item.number === number);
    assert.ok(entry.optional_skills.includes('grill-with-docs'), `Phase ${number} question method`);
  }
  const routing = read('commands/architecture-pro/routing.md');
  assert.match(routing, /grill-with-docs/);
  assert.match(routing, /native.*(?:selector|question)/i);
  assert.match(routing, /free-text/i);
  assert.match(routing, /one.*(?:question|trade)/i);
  assert.match(routing, /(?:prior|settled).*(?:answer|decision)|(?:answer|decision).*(?:prior|settled)/i);
});

test('options involve the user before detailed comparison or frozen criteria, not after sunk design work', () => {
  const options = phase('07-options');
  assert.match(options, /provisional.*(?:shape|view)/i);
  assert.match(options, /before.*detailed comparison/i);
  assert.doesNotMatch(options, /^Freeze measurable/m);
  assert.match(options, /business.*(?:trade|consequence)|(?:trade|consequence).*business/i);
  assert.match(options, /weights totaling 100/);
  assert.match(options, /Wait for explicit approval.*before Phase 8/);
  const decision = phase('08-decision');
  assert.match(decision, /unchanged/);
  assert.match(decision, /sacrific|give up/);
  assert.match(decision, /amend.*constraint|constraint.*amend/i);
  assert.match(decision, /Require explicit sign-off/);
});

test('deep design is jointly refined before consolidation without a per-boundary approval quota', () => {
  const deep = phase('09-deep-design');
  assert.match(deep, /co-design.*dependency order/i);
  assert.match(deep, /(?:input|answer).*boundary.*contract.*consequence/i);
  assert.match(deep, /no.*per-(?:layer|boundary).*approval/i);
  assert.match(deep, /return legally to Phase 8/);
  assert.match(deep, /at most two recorded decision reopenings/);
  assert.match(deep, /no legal return.*ADR-only/i);
  assert.match(deep, /hold dependent certification/i);
  const routing = read('commands/architecture-pro/routing.md');
  assert.match(routing, /existing.*(?:packet|decision).*history/i);
  assert.match(routing, /affected.*(?:view|contract)/i);
  assert.match(routing, /(?:preference|agreement).*not.*evidence|evidence.*not.*(?:preference|agreement)/i);
  assert.match(routing, /User intent sets requirements/);
  assert.match(routing, /current behavior need verification/);
});

test('collaboration respects focused modes, missing answers and unchanged human authority', () => {
  const routing = read('commands/architecture-pro/routing.md');
  assert.match(routing, /AUDIT.*(?:redesign|design)/);
  assert.match(routing, /ADR-only.*(?:scope|decision)/);
  assert.match(routing, /--fast.*triage/);
  assert.match(routing, /--yolo.*(?:approval|human|user-owned)/);
  assert.match(routing, /(?:pending|unanswered).*dependent|dependent.*(?:pending|unanswered)/i);
  assert.match(routing, /(?:silence|default|preselected).*not.*approval/i);
  assert.match(routing, /no.*(?:new|extra).*(?:gate|schema)/i);
  assert.equal(contract.phase_count, 13);
  assert.deepEqual(contract.modes['adr-only'], [1, 2, 7, 8, 9, 10]);
  assert.match(read('commands/architecture-pro.md'), /Human approval is mandatory for architecture selection, material residual risk, and final sealing/);
});

test('walkthrough invites disagreement and scenario changes instead of treating them as misunderstanding', () => {
  const walkthrough = phase('12-walkthrough');
  const diagrams = read('skills/architecture-explanation-diagrams/SKILL.md');
  assert.doesNotMatch(walkthrough + diagrams, /Ask what was misunderstood/i);
  assert.match(walkthrough, /collaborative.*stress test/i);
  assert.match(walkthrough, /changed assumption|alternate scenario/i);
  assert.match(walkthrough, /unacceptable trade/i);
  assert.match(phase('13-architect-review'), /agreed decisions.*remaining risk/i);
});
