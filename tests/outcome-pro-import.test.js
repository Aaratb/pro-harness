'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));

function texts() {
  const contract = json('commands/outcome-pro/contract.json');
  return [...contract.global_context, ...contract.phases.map(({ file }) => 'commands/outcome-pro/' + file),
    ...['outcome-pro', 'outcome-analysis', 'outcome-evidence-audit', 'outcome-independent-challenge'].map((name) => `skills/${name}/SKILL.md`),
    ...fs.readdirSync(path.join(ROOT, 'skills/outcome-pro/references')).map((file) => 'skills/outcome-pro/references/' + file),
    ...fs.readdirSync(path.join(ROOT, 'skills/outcome-analysis/references')).map((file) => 'skills/outcome-analysis/references/' + file)].map(read).join('\n');
}

test('Outcome Pro has four progressive phases and a compact public command', () => {
  const contract = json('commands/outcome-pro/contract.json');
  assert.equal(contract.phase_count, 4);
  assert.equal(contract.loading, 'global-once-current-phase-only');
  assert.deepEqual(contract.phases.map(({ number, name }) => [number, name]), [[1, 'Intent'], [2, 'Evidence'], [3, 'Assessment'], [4, 'Recommendation']]);
  assert.equal(contract.artifact_root, '$REPO_ROOT/.agents/outcomes/<run-id>');
  assert.ok(read('commands/outcome-pro.md').trim().split(/\s+/).length <= 1300);
  assert.match(read('commands/outcome-pro.md'), /only the selected phase/);
  assert.match(read('commands/outcome-pro.md'), /missing or duplicate/);
  assert.match(read('skills/outcome-pro/SKILL.md'), /installed skill.*location/);
});

test('Outcome reuses one runtime-neutral agent with separate fresh analytical assignments', () => {
  const agent = json('agents/definitions/outcome-analyst.json');
  assert.equal(agent.capability_profile, 'evidence-analysis-read-only');
  assert.ok(agent.required_inputs.includes('analysis_focus'));
  assert.ok(agent.required_inputs.includes('artifact_root'));
  assert.equal(agent.artifact_policy.repository_writes, 'deny');
  assert.equal(agent.artifact_policy.invent_paths, false);
  assert.deepEqual(agent.skills, ['outcome-analysis', 'outcome-evidence-audit', 'outcome-independent-challenge']);
  assert.equal(fs.readdirSync(path.join(ROOT, 'agents/definitions')).filter((name) => name.startsWith('outcome-')).length, 1);
  const bundle = texts();
  assert.match(bundle, /analysis_focus.*evidence.*analysis.*challenge/);
  assert.match(bundle, /independent challenge not performed/);
  assert.match(bundle, /author rationale, confidence, desired verdict/);
  assert.match(bundle, /coordinator alone/i);
  assert.doesNotMatch(bundle, /fork_turns|openai\.yaml|~\/\.(?:claude|codex|cursor)|\.agent_docs|god-level|\b(?:gstack|superpowers)\b/i);
});

test('Outcome preserves question-fit validation, consequence and evidence gates', () => {
  const bundle = texts();
  for (const term of ['descriptive', 'experiment', 'comparative', 'causal_claim: false', 'INSUFFICIENT_EVIDENCE', 'evidence_gap',
    'two credible alternatives', 'opportunity cost', 'falsifier', 'Simpson', 'right-censor', 'counterfactual', 'Zero denominator',
    'primary outcome', 'source-to-claim', 'sample-ratio mismatch', 'percentiles cannot be averaged', 'proposed', 'Review first']) {
    assert.ok(bundle.toLowerCase().includes(term.toLowerCase()), term);
  }
  assert.match(bundle, /only.*ok: true|ok: true.*only/);
  assert.match(bundle, /never.*directly to Debug/i);
  assert.match(bundle, /no owner repository.*chat/i);
  assert.match(bundle, /no state\/resume engine/i);
});

test('Outcome consolidates domain depth and uses existing safety and workflow helpers', () => {
  const bundle = texts();
  const domainReferences = fs.readdirSync(path.join(ROOT, 'skills/outcome-analysis/references'));
  assert.deepEqual(domainReferences.sort(), ['aggregate-query-design.md', 'customer-evidence.md', 'measurement-design.md']);
  assert.match(bundle, /skills\/ab-test-analysis\/SKILL\.md/);
  assert.match(bundle, /skills\/release-deployment\/SKILL\.md/);
  for (const helper of ['resolve-outcome-root.mjs', 'validate-outcome-report.mjs', 'verify-outcome-calculations.mjs', 'record-workflow-event.mjs', 'readFileNoFollow', 'review-safety.mjs']) assert.ok(bundle.includes(helper), helper);
  assert.doesNotMatch(bundle, /app-product:|app-shared:|Flow Ship|flow-ship/);
  const checker = read('scripts/validate-outcome-pro-command.mjs');
  assert.match(checker, /validateCommandMechanics/);
  assert.match(checker, /buildCommandCatalogs/);
});

test('Outcome exposes only four flat skills, registered by canonical names', () => {
  const names = json('skills/resolution-manifest.json').skills.map(({ name }) => name);
  assert.deepEqual(names.filter((name) => name.startsWith('outcome-')).sort(), ['outcome-analysis', 'outcome-evidence-audit', 'outcome-independent-challenge', 'outcome-pro']);
  for (const name of names.filter((name) => name.startsWith('outcome-'))) {
    assert.ok(fs.existsSync(path.join(ROOT, 'skills', name, 'SKILL.md')));
    assert.equal(fs.existsSync(path.join(ROOT, 'skills', name, 'agents')), false);
  }
});
