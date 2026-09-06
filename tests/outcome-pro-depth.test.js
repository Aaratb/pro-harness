'use strict';

// Instruction/activation regression checks, not proof of model judgment or speed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const contract = JSON.parse(read('commands/outcome-pro/contract.json'));
const phase = number => read('commands/outcome-pro/' + contract.phases.find(p => p.number === number).file);
const methods = () => read('skills/outcome-pro/references/analytical-methods.md');

test('outcome supplies current focus methods and records actual independent execution without new schemas', () => {
  const routing = read('commands/outcome-pro/routing.md');
  for (const term of ['current canonical', 'runtime identity', 'host-enforced', 'instruction-only', 'proof note']) assert.ok(routing.includes(term), term);
  assert.match(routing, /snapshot/i);
  assert.match(routing, /no.*(?:new|add).*schema|do not add.*schema/i);
  assert.match(routing, /author rationale, confidence, desired verdict/);
  assert.match(routing, /independent challenge not performed/);
  assert.match(routing, /missing.*filtering.*not.*gate/i);
});

test('outcome starts useful work and reuses unchanged checked evidence without waiving gaps', () => {
  assert.match(read('commands/outcome-pro.md'), /same (?:response|turn)/);
  const evidence = phase(2);
  assert.match(evidence, /reuse.*checked.*(?:evidence|calculations)/i);
  assert.match(evidence, /source.*definition.*cutoff|definition.*source.*cutoff/i);
  assert.match(evidence, /changed.*(?:claims|checks)|affected.*(?:claims|checks)/i);
  assert.match(evidence, /(?:required|missing).*insufficient/i);
  assert.match(evidence, /decision.*(?:change|reverse)|(?:change|reverse).*decision/i);
});

test('outcome connects intent to observed value and tests rival explanations without inventing causality', () => {
  assert.match(methods(), /mechanism/i);
  assert.match(methods(), /missing link|unsupported link/i);
  assert.match(methods(), /rival|competing explanation/i);
  assert.match(methods(), /distinguish|discriminat/i);
  assert.match(phase(1), /mechanism|value chain/);
  assert.match(phase(3), /rival|competing explanation/);
  const challenge = read('skills/outcome-independent-challenge/SKILL.md');
  assert.match(challenge, /rival|competing explanation/);
  assert.match(challenge, /prediction|predict/);
});

test('outcome activates existing AI expertise only for relevant assessment, not implementation or release', () => {
  const assessment = contract.phases.find(p => p.number === 3);
  assert.ok(assessment.optional_skills.includes('ai-product-engineering'));
  assert.match(phase(3), /ai-product-engineering/);
  const skill = read('skills/outcome-analysis/SKILL.md');
  assert.match(skill, /ai-product-engineering/);
  assert.match(skill, /assessment-only/i);
  assert.match(skill, /(?:do not|never).*(?:release|build|implementation)/i);
  for (const term of ['offline', 'human', 'task', 'version', 'retrieval', 'retry', 'cost']) assert.ok(methods().toLowerCase().includes(term), term);
  assert.match(methods(), /per (?:successfully )?(?:completed|successful).*task/i);
  assert.match(methods(), /abstain|abstention/i);
  assert.match(methods(), /contaminat/i);
});

test('outcome prioritizes discriminating evidence and knows when further collection is not useful', () => {
  const text = methods();
  assert.match(text, /value of information|decision sensitivity/i);
  assert.match(text, /delay/);
  assert.match(text, /(?:stop|do not collect|no further collection)/i);
  assert.match(text, /(?:invent|fabricat).*(?:probabilit|precision|value)/i);
  assert.match(text, /insufficien/i);
  assert.match(phase(4), /decision sensitivity|decision-sensitivity/);
});

test('outcome compares genuine alternatives without fabricated quotas or sunk-cost pressure', () => {
  for (const file of ['commands/outcome-pro/phases/04-recommendation.md', 'skills/outcome-analysis/SKILL.md', 'skills/outcome-pro/references/analytical-methods.md']) {
    const text = read(file);
    assert.match(text, /(?:never|do not) (?:invent|fabricate).*alternativ|(?:no|not a|without.*) (?:fixed )?(?:option )?quota/i, file);
  }
  assert.match(methods(), /sunk/i);
  assert.match(methods(), /avoidable|marginal/i);
  assert.match(methods(), /existing (?:capability|service|workflow)/i);
  assert.match(phase(4), /two credible alternatives/);
});

test('outcome keeps four phases, one read-only agent and the existing bounded report surface', () => {
  assert.equal(contract.phase_count, 4);
  assert.equal(contract.loading, 'global-once-current-phase-only');
  assert.deepEqual(contract.modes.default, [1, 2, 3, 4]);
  assert.deepEqual(fs.readdirSync(path.join(root, 'schemas/outcome-pro')), ['report.schema.json']);
  assert.equal(fs.readdirSync(path.join(root, 'agents/definitions')).filter(n => n.startsWith('outcome-')).length, 1);
  const agent = JSON.parse(read('agents/definitions/outcome-analyst.json'));
  assert.equal(agent.capability_profile, 'evidence-analysis-read-only');
  assert.equal(agent.artifact_policy.repository_writes, 'deny');
  const main = read('commands/outcome-pro.md');
  assert.ok(main.trim().split(/\s+/).length <= 1300);
  assert.match(main, /causal_claim: false/);
  assert.match(main, /Suspected defects go to Review first, never directly to Debug/);
  assert.match(main, /no state\/resume engine/);
});
