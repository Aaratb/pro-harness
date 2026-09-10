'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
test('architecture is explained and approved before detailed planning, with an explicit Architecture Pro detour', () => {
  const plan = read('commands/feature-pro/phases/07-tech-spec.md');
  assert.match(plan, /Architecture checkpoint.*before detailed specs/);
  assert.match(plan, /recommend.*architecture-pro.*--design/i);
  assert.match(plan, /explicit consent/);
  assert.match(plan, /backend-only.*Phase 4.*skipped/i);
  assert.match(plan, /component.*interface.*test.*slice/i);
  assert.match(plan, /end-to-end slices/);
  assert.match(plan, /missing approval.*pending/i);
  assert.match(read('commands/feature-pro/phases/04-design.md'), /architecture-driving/);
  const checkpoint = JSON.parse(read('commands/feature-pro/state.example.json')).architecture_handoff_intake.checkpoint;
  assert.equal(checkpoint.approved, false);
  assert.equal(checkpoint.status, 'pending');
});
test('product, design and planning retain independent challenge without making intake a swarm', () => {
  for (const phase of ['03-prd', '04-design', '05-solution-approval', '07-tech-spec']) {
    assert.match(read(`commands/feature-pro/phases/${phase}.md`), /Mandatory independent challenge/);
  }
  assert.match(read('commands/feature-pro/routing.md'), /fresh challenger/);
  assert.match(read('commands/feature-pro/routing.md'), /explicit user waiver/);
  const design = read('commands/feature-pro/phases/04-design.md');
  for (const criterion of ['typography', 'hierarchy', 'composition', 'distinctiveness']) assert.ok(design.includes(criterion));
  assert.match(design, /actual.*render|render.*actual/);
  assert.match(design, /taste.*subjective|subjective.*taste/);
  assert.match(read('commands/feature-pro/phases/02-requirements.md'), /default: no agents/);
});
test('greenfield setup and impact mapping never require a generated codemap', () => {
  for (const p of ['01-repo-setup', '07-tech-spec']) {
    assert.match(read(`commands/feature-pro/phases/${p}.md`), /missing codemap never blocks/i);
  }
  assert.match(read('commands/feature-pro/phases/01-repo-setup.md'), /empty repository.*not-applicable/i);
  assert.match(read('skills/workspace-codemap-context/SKILL.md'), /absence is not a blocker/i);
});
test('after the roadmap choice clear intake progresses and questions precede unnecessary investigation', () => {
  const main = read('commands/feature-pro.md');
  const governance = read('commands/feature-pro/governance.md');
  const framing = read('commands/feature-pro/phases/02-requirements.md');
  assert.match(main, /wait for the user's choice/);
  assert.match(main, /no per-phase pauses/);
  assert.doesNotMatch(governance, /Must not auto-advance between phases|Wait\. Do not proceed/);
  assert.match(governance, /checkpoints mode/i);
  assert.match(framing, /default: no agents/i);
  assert.match(framing, /before.*unnecessary.*tool.*agent/i);
  assert.match(framing, /one integrated pass/i);
  assert.match(framing, /new behavior.*does not require.*source citation/i);
});
test('local reuse satisfies the decision without compulsory package research', () => {
  const skill = read('skills/library-first-engineering/SKILL.md');
  assert.match(skill, /# Reuse-First Engineering/);
  assert.match(skill, /services, functions, components, utilities, generated clients/);
  assert.match(skill, /local reuse closes the gate/i);
  assert.match(skill, /No external documentation or comparison matrix/i);
  for (const p of ['07-tech-spec', '09-build']) assert.match(read(`commands/feature-pro/phases/${p}.md`), /local reuse closes the gate/i);
});
test('lightweight changes retain explicit approvals and recorded reconciliation', () => {
  const governance = read('commands/feature-pro/governance.md');
  assert.match(governance, /business requirement and measurable goal approved/);
  assert.match(governance, /selected product solution approved/);
  assert.match(governance, /module-map\.md.*approved by user/);
  assert.match(governance, /only when useful, requested, or required/);
  const reconciliation = JSON.parse(read('commands/feature-pro/reconciliation.json'));
  assert.ok(reconciliation.approved_normalizations.some((entry) => entry.id === 'pilot-feedback-proportionate-execution'));
});
