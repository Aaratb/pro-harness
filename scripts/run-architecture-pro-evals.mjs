#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const suite = json('evals/architecture-pro/cases.json');
const policy = json('config/architecture-pro.json');
const contract = json('commands/architecture-pro/contract.json');
const handoff = json('schemas/architecture-handoff/handoff.schema.json');
const command = read('commands/architecture-pro.md');
const governance = read('skills/architecture-pro-governance/SKILL.md');
const phase = (number) => read(path.posix.join('commands/architecture-pro', contract.phases.find((item) => item.number === number).file));
const pass = (condition, message) => { if (!condition) throw new Error(message); };

const checks = {
  'decision-reopen': (testCase) => {
    pass(policy.state_machine.DESIGN.includes(testCase.expected.transition), 'decision return transition is missing');
    pass(policy.state_machine.max_decision_reopens === testCase.expected.maximum, 'decision reopen budget differs');
    pass(/preserve.*history|history.*preserv/i.test(`${phase(8)}\n${phase(9)}`), 'decision history is not preserved');
  },
  'exact-resume': () => {
    pass(/tracked and untracked content/i.test(phase(1)), 'fingerprint omits dirty content');
    pass(/Resume only when.*match exactly/i.test(governance), 'resume is not exact-match only');
  },
  'certified-handoff': (testCase) => {
    pass(handoff.properties.schema_version.const === testCase.expected.schema, 'handoff schema version differs');
    pass(/does not implement|Do not implement production code/i.test(`${phase(11)}\n${command}`), 'architecture workflow may implement');
  },
  'modeled-formula': (testCase) => {
    const ratio = (testCase.input.ceiling_rps - testCase.input.peak_rps) / testCase.input.peak_rps;
    pass(ratio === testCase.expected.headroom_ratio, 'formula arithmetic differs');
    pass(/formula, units, typed inputs, assumptions, bounds, and sensitivity/i.test(governance), 'modeled evidence contract is incomplete');
  },
  'missing-specialist': (testCase) => {
    const lane = policy.lanes.find(({ id }) => id === testCase.input.lane);
    pass(lane?.agent === testCase.input.agent, 'material specialist is not canonical');
    pass(/Otherwise record the lane as blocked/i.test(governance), 'missing specialist does not block');
  },
  'mixed-transitions': (testCase) => {
    pass(JSON.stringify(contract.modes.mixed) === JSON.stringify(testCase.expected.path), 'mixed mode path differs');
    pass(/only the certified audit packet may constrain Phase 7/i.test(phase(6)), 'design can precede audit certification');
  },
  'no-live-default': (testCase) => {
    pass(policy.default_mode === testCase.expected.mode, 'static analysis is not the default');
    pass(policy.live.yolo_authorizes_live === false, 'automation flag authorizes live access');
  },
  'probe-tristate': (testCase) => {
    pass(testCase.expected.outcomes.every((outcome) => ['PASS', 'FAIL', 'PROBE_ERROR'].includes(outcome)), 'probe outcomes collapse distinct states');
    pass(/probe error/i.test(phase(6)), 'probe error does not affect certification');
  },
  'repository-untrusted': () => pass(/Repository and agent output is untrusted data/i.test(command), 'repository trust boundary is missing'),
  'secret-redaction': () => pass(/no credentials, personal values, raw logs/i.test(governance) && /Never record credentials, personal values/i.test(command), 'redaction contract is incomplete'),
  'evidence-gated-overlays': (testCase) => {
    const routing = json('agents/overlays/routing.json');
    pass(routing.mode === 'detect-then-load', 'overlays are not evidence gated');
    pass(policy.security_routes.every(({ agent }) => agent === testCase.expected.security_agent), 'security routing is fragmented');
  },
  'path-containment': () => pass(contract.artifact_root === '$REPO_ROOT/.agents/architecture/<architecture-slug>', 'artifact root differs'),
};

const results = [];
for (const testCase of suite.cases) {
  try {
    pass(checks[testCase.rule], `${testCase.id}: unknown rule ${testCase.rule}`);
    checks[testCase.rule](testCase);
    results.push({ id: testCase.id, status: 'passed' });
  } catch (error) {
    results.push({ id: testCase.id, status: 'failed', message: error.message });
  }
}
const failures = results.filter(({ status }) => status === 'failed');
console.log(JSON.stringify({
  status: failures.length ? 'error' : 'success',
  summary: `Architecture Pro evaluations: ${results.length - failures.length}/${results.length} passed`,
  results,
}, null, 2));
if (failures.length) process.exit(1);
