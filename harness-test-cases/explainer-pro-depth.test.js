'use strict';

// Instruction and activation checks, not a learning-quality or latency benchmark.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const skill = name => read(`skills/${name}/SKILL.md`);
const contract = JSON.parse(read('commands/explainer-pro/contract.json'));

test('explainer delivers current methods under its own read-only governance', () => {
  const routing = read('commands/explainer-pro/routing.md');
  for (const text of ['canonical definition', 'fresh general agent', 'lane_contract', 'evidence_manifest', 'narrative_notes', 'runtime identity', 'instruction-only', 'host-enforced']) assert.ok(routing.includes(text), text);
  assert.match(routing, /Do not import.*(?:governance|workflow)/);
  assert.match(routing, /static.*return.*coordinator/i);
  assert.match(routing, /Do not add.*(?:schema|claim|section)/);
});

test('explainer adapts teaching to audience without changing evidence standards', () => {
  const quality = read('skills/explainer-core/references/explanation-quality.md');
  for (const text of ['PM', 'ENG', 'STAFF', 'same evidence', 'running example', 'hypothetical']) assert.ok(quality.includes(text), text);
  assert.match(quality, /misconception/);
  assert.match(quality, /prediction/);
  assert.match(quality, /not.*(?:approval|block)/);
  assert.match(skill('explainer-orientation'), /question.*(?:file|path)|(?:file|path).*question/);
});

test('FSB audience receives relevant cross-discipline depth without a separate workflow', () => {
  const quality = read('skills/explainer-core/references/explanation-quality.md');
  const fsb = quality.split('\n').find(line => /^\| FSB \|/.test(line));
  assert.ok(fsb, 'the canonical audience guidance must include FSB');
  for (const discipline of [/product/i, /design/i, /engineering/i, /architecture/i, /data/i, /security/i, /QA|testing/i, /operations|operability/i, /performance/i, /AI/]) assert.match(fsb, discipline);
  assert.match(fsb, /relevant|applicable/i, 'broad coverage must stay grounded in relevant repository surfaces');
  assert.match(quality, /(?:not|without|no).*uniform.*depth|depth.*(?:importance|materiality)/i);
  assert.match(read('commands/explainer-pro.md'), /--audience[^\n]*fsb/i);
  assert.equal(contract.phase_count, 8);
});

test('explainer tracing teaches state and consequences rather than narrating syntax', () => {
  const trace = skill('explainer-feature-tracing');
  for (const text of ['before', 'invariant']) assert.ok(trace.includes(text), text);
  assert.match(trace, /after|resulting (?:value|state)/);
  assert.match(trace, /authority|enforcement owner/);
  assert.match(trace, /(?:return|response).*(?:effect|commit)|(?:effect|commit).*(?:return|response)/);
  assert.match(trace, /hypothetical|illustrative/);
  assert.match(skill('explainer-architecture'), /declared.*(?:implemented|observed)|(?:implemented|observed).*declared/);
});

test('explainer does not equate async syntax with deferred work or confirmed source with runtime proof', () => {
  const archetypes = read('skills/explainer-core/references/repository-archetypes.md');
  assert.doesNotMatch(archetypes, /`async` always means work that does not finish/);
  assert.match(archetypes, /await|caller waits/);
  const timing = read('skills/explainer-system-views/references/execution-timing.md');
  assert.match(timing, /acceptance|accepted/);
  assert.match(timing, /durab|persist|commit/);
  const grounding = read('skills/explainer-core/references/grounding-contract.md');
  assert.match(grounding, /CONFIRMED.*(?:source-grounded|source grounding)/);
  assert.match(grounding, /not.*(?:runtime|execution|executed)/);
});

test('explainer reference and change explanations follow actual reuse and before-after meaning', () => {
  const reference = skill('explainer-reference');
  assert.match(reference, /wrapper|shared function/);
  assert.match(reference, /installed.*(?:unused|usage)|unused.*installed|declaration.*usage/);
  const change = skill('change-explanation');
  for (const text of ['before', 'after', 'unchanged', 'caller', 'inferred']) assert.ok(change.includes(text), text);
  assert.match(change, /mock|assertion/);
});

test('explainer comprehension diagnoses misconceptions without mandatory chat examinations', () => {
  const comprehension = read('skills/explainer-comprehension/references/comprehension-contract.md');
  assert.match(comprehension, /misconception/);
  assert.match(comprehension, /boundary|condition/);
  assert.match(comprehension, /not.*(?:approval|block)|(?:approval|block).*not/);
  assert.match(comprehension, /free-text|teach-back/);
  assert.match(comprehension, /already taught/);
  assert.match(skill('explainer-comprehension'), /reuse|Reuse/);
});

test('explainer verification checks what citations establish and the coherence of the taught model', () => {
  const grounding = read('skills/explainer-core/references/grounding-contract.md');
  for (const text of ['counterexample', 'claim text', 'diagram', 'gated_at']) assert.ok(grounding.includes(text), text);
  assert.match(grounding, /existence.*(?:not|insufficient)|(?:not|insufficient).*existence/);
  const verify = read('commands/explainer-pro/phases/07-verify.md');
  assert.match(verify, /contradict|coheren|conflict/);
  assert.match(verify, /new, changed, materially dependent, or unverified claims/);
});

test('explainer preserves modes, capability roster, source safety and publication envelope', () => {
  assert.equal(contract.phase_count, 8);
  assert.equal(contract.loading, 'global-once-current-phase-only');
  assert.deepEqual(contract.modes.change, [1, 2, 4, 7]);
  assert.deepEqual([...new Set(contract.phases.flatMap(p => p.agents))].sort(), ['data-model-architect', 'repository-explorer', 'system-architect']);
  const main = read('commands/explainer-pro.md');
  assert.ok(main.trim().split(/\s+/).length <= 1600);
  assert.match(main, /without executing, grading, fixing, or modifying the target source/);
  assert.match(main, /completion hook once/);
  assert.match(read('commands/explainer-pro/routing.md'), /Only the coordinator publishes/);
});
