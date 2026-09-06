'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const json = (name) => JSON.parse(read(name));
const phase = (name) => read(`commands/architecture-pro/phases/${name}.md`);

test('Architecture Pro shows the roadmap first, then honors an explicit entry choice without repeat approval', () => {
  const command = read('commands/architecture-pro.md');
  const entry = read('skills/architecture-pro/SKILL.md');
  assert.match(command, /wait for the user's choice/);
  assert.match(command, /explicit phase\/capability selection/);
  assert.match(command, /without asking again/);
  assert.match(entry, /opening roadmap.*entry choice/);
  assert.match(command, /Ask only for unresolved mode/);
  assert.match(command, /Phase <N>\/13: <Name>/);
  assert.match(command, /Human approval is mandatory for architecture selection, material residual risk, and final sealing/);
});

test('Architecture intake and as-built checkpoints ask only for unresolved material inputs', () => {
  const intake = phase('01-intake');
  const context = phase('02-context');
  const gates = json('commands/architecture-pro/contract.json').global_gates.join('\n');
  assert.doesNotMatch(intake, /Pause for approval of intake and budgets before Phase 2/);
  assert.doesNotMatch(context, /Do not let this packet constrain findings or options until corrections are incorporated/);
  assert.doesNotMatch(gates, /requires user correction of the as-built map/);
  assert.match(intake, /material.*(?:unknown|missing)|(?:unknown|missing).*material/i);
  assert.match(context, /Do not treat silence as approval/i);
  assert.match(intake, /triage.*prohibit certification/);
  assert.match(intake, /selected current-phase dependencies/);
  assert.match(intake, /installation.*catalog.*not.*prompt context/i);
});

test('Architecture options preserve independent challenge without a three-option quota', () => {
  const options = phase('07-options');
  const routing = read('commands/architecture-pro/routing.md');
  const review = phase('13-architect-review');
  const readiness = read('skills/architecture-review-readiness/SKILL.md');
  assert.doesNotMatch(`${options}\n${routing}\n${review}\n${readiness}`, /at least three viable|Include[^\n]*three viable options|produce three viable shapes|blocked if three/i);
  for (const lens of ['simplicity-first', 'scale-first', 'evolvability-first']) assert.ok(routing.includes(lens));
  assert.match(options, /fewer than three/i);
  assert.match(options, /constraint.*evidence|evidence.*constraint/i);
  assert.match(options, /fresh.*independent.*challeng/i);
  assert.match(options, /option_scope/);
  assert.match(options, /If no option is viable, stop blocked/);
  assert.match(routing, /distinct.*(?:author|instance)|(?:author|instance).*distinct/i);
  assert.match(routing, /Preserve.*dissent/i);
  assert.match(options, /weights totaling 100/);
  assert.match(options, /Wait for explicit approval.*before Phase 8/);
  assert.match(phase('08-decision'), /Require explicit sign-off/);
  assert.match(phase('13-architect-review'), /Final sealing requires explicit author approval/);
});

test('Architecture deep methods load on material triggers rather than every local ADR', () => {
  const contract = json('commands/architecture-pro/contract.json');
  const deep = contract.phases.find(({ number }) => number === 9);
  for (const name of ['architecture-distributed-consistency', 'architecture-concurrency-and-overload', 'architecture-data-recovery', 'architecture-capacity-and-tuning']) {
    assert.ok(!deep.required_skills.includes(name), `${name} should be evidence-triggered`);
    assert.ok(deep.optional_skills.includes(name), `${name} must remain available`);
    assert.ok(phase('09-deep-design').includes(name), `${name} needs a current-phase trigger`);
  }
  assert.match(phase('09-deep-design'), /Every material specialist lane participates/);
  assert.match(phase('09-deep-design'), /immaterial.*evidence|evidence.*immaterial/i);
  assert.match(phase('10-design-certification'), /no unresolved mandatory blocker/);
  assert.deepEqual(contract.modes['adr-only'], [1, 2, 7, 8, 9, 10]);
});

test('Narrowed option references resolve existing lane state and real dispatch evidence', () => {
  const routing = read('commands/architecture-pro/routing.md');
  const decisionPhase = phase('08-decision');
  assert.ok(routing.includes('state.lane_runs'), 'report references must resolve through existing lane state');
  assert.ok(routing.includes('state.artifact_digests'), 'actual report bytes must be digest-bound');
  assert.ok(routing.includes('runtime dispatch identity'), 'challenger identity must come from a real dispatch');
  assert.ok(routing.includes('not fields to add to the lane-report packet'), 'metadata must not violate the report schema');
  assert.ok(decisionPhase.includes('Missing dispatch evidence blocks narrowed selection'), 'missing independent dispatch cannot be self-certified');
});

test('Architecture completion uses one lifecycle entry point without duplicate nested validators', () => {
  const command = read('commands/architecture-pro.md');
  assert.doesNotMatch(command, /Before completion run the Architecture Pro command validator, run-packet validator/);
  assert.match(command, /single validation entry point/);
  assert.match(command, /Do not separately repeat/);
  assert.match(command, /Only a digest-bound `DESIGN_CERTIFIED` handoff/);
  assert.match(command, /satisfies only the trace portion of a gate/);
  assert.match(command, /Schema, privacy, identity, and authority failures remain blocking/);
});

const decision = (count) => ({
  id: 'decision-1', status: 'PROPOSED', problem: 'Choose a local cache boundary', constraints: ['No network dependency'],
  options: Array.from({ length: count }, (_, index) => ({ id: `option-${index + 1}`, summary: 'A viable scoped option', tradeoffs: [] })),
  selected_option: null, tradeoffs: [], dissent: [], approvals: [], reopen_history: [],
});
const narrowedScope = () => ({
  rationale: 'Only local implementations satisfy the supplied runtime constraint.',
  rejected_alternatives: [{ summary: 'Remote cache', constraint: 'No network dependency', evidence_ids: ['evidence-1'] }],
  independent_review: { lane_report_id: 'lane-report-1', challenger_instance_id: 'challenger-1' },
});

test('Decision schema permits justified one- or two-option sets but rejects unsupported narrowing', async () => {
  const { validateJsonSchema } = await import('../scripts/lib/json-schema.mjs');
  const validate = (value) => validateJsonSchema(value, path.join(root, 'schemas/architecture-pro/decision.schema.json'));
  assert.deepEqual(validate(decision(3)), [], 'existing three-option packets remain valid');
  for (const count of [1, 2]) {
    assert.ok(validate(decision(count)).length, 'narrowing requires evidence and an independent review reference');
    const value = { ...decision(count), option_scope: narrowedScope() };
    assert.deepEqual(validate(value), [], `${count} evidenced viable options are valid`);
    value.option_scope.rejected_alternatives[0].evidence_ids = [];
    assert.ok(validate(value).length, 'unsupported exclusion must fail');
    value.option_scope = narrowedScope();
    delete value.option_scope.independent_review;
    assert.ok(validate(value).length, 'missing challenger must fail');
    value.option_scope = narrowedScope();
    value.option_scope.independent_review.challenger_instance_id = '';
    assert.ok(validate(value).length, 'empty challenger identity must fail');
  }
  assert.ok(validate({ ...decision(0), option_scope: narrowedScope() }).length, 'zero viable options must remain blocked');
});
