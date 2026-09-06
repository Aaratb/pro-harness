'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const loop = () => read('skills/ralph-loop/SKILL.md');
const phase = () => read('commands/feature-pro/phases/08-build.md');
const requireText = (text, patterns) => {
  for (const pattern of patterns) assert.ok(pattern.test(text), `missing contract: ${pattern}`);
};

test('Ralph is one reusable dependency of Phase 8, not a new command or agent', () => {
  const manifest = json('skills/resolution-manifest.json');
  const entries = manifest.skills.filter(({ name }) => name === 'ralph-loop');
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].dependencies, ['task-wave-execution', 'test-driven-development', 'verification-before-completion']);
  assert.deepEqual(entries[0].capabilities, []);
  const contract = json('commands/feature-pro/contract.json');
  assert.equal(contract.phases.length, 20);
  assert.deepEqual(contract.phases.filter((p) => p.required_skills.includes('ralph-loop')).map((p) => p.number), [8]);
  assert.deepEqual(contract.phases.find((p) => p.number === 8).agents, ['frontend-developer', 'backend-developer', 'database-engineer', 'platform-engineer']);
  assert.equal(fs.existsSync(path.join(ROOT, 'commands/ralph-loop.md')), false);
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'skills/ralph-loop')), ['SKILL.md']);
  requireText(phase(), [/`ralph-loop`/, /Load `skills\/ralph-loop\/SKILL\.md`/, /Runtime verification and compression remain Phases 9 and 10/]);
});

test('global inline defaults explicitly allow fresh Phase 8 workers without expanding other phases', () => {
  for (const file of ['commands/feature-pro.md', 'commands/feature-pro/governance.md', 'commands/feature-pro/routing.md']) {
    requireText(read(file), [/Phase 8.*`ralph-loop`/, /Phases 3, 5/]);
  }
  requireText(loop(), [/new worker context for each task attempt/, /Do not fork the full conversation/, /missing fresh-worker capability/, /explicit user waiver/, /never describe inline continuation as fresh/]);
});

test('bounded attempts survive retries, compaction, rebuild and concurrent reservations', () => {
  requireText(loop(), [/two attempts per task/, /total ceiling of twice the approved task count/, /Reserve and record an attempt before dispatch/, /failed, crashed, and interrupted attempts count/, /Do not reset counts on resume, compaction, `rebuild`, or task renaming/, /Exhaustion pauses with remaining work/, /Only explicit user approval can increase a finite budget/]);
});

test('existing task waves own scheduling and shared gates wait for a stable worktree', () => {
  requireText(loop(), [/`task-wave-execution` remains the sole scheduler/, /dependency-ready tasks with disjoint write scopes/, /one task per worker/, /never two attempts for the same task concurrently/, /after all writers in the wave stop/, /dependent work cannot start before prerequisite checks pass/]);
});

test('fresh attempts reuse existing artifacts and record only supported state and trace surfaces', () => {
  requireText(loop(), [/caller-supplied `artifact_root`/, /`tasks.md`/, /`work\/ledger.md`/, /`work\/`/, /`skill_runs` and `agent_runs`/, /`agent-dispatched`/, /`agent-completed`/, /`retry-attempted`/, /`gate-evaluated`/, /Do not create a second plan, state schema, trace format, or output root/]);
  requireText(phase(), [/coordinator inspects actual diffs and referenced proof/, /ledger records work/]);
});

test('coordinator checks real proof; worker claims or successful exit cannot complete a task', () => {
  requireText(loop(), [/observed RED/, /characterization tests must pass before/, /Docs\/config-only tasks use proportionate checks/, /inspect the actual diff/, /commands, exit codes, relevant output/, /current source identity/, /Neither worker success text nor a zero exit code/, /required check is failing, missing, stale, or blocked/, /do not repair unrelated baseline failures/i]);
});

test('failure and authority stops preserve work without automatic publishing or a hidden daemon', () => {
  requireText(loop(), [/at most one further attempt/, /fresh context and new failure evidence/, /environment or authority failures stop immediately/, /Respect user pause/, /Do not dispatch more work while paused/, /No automatic staging, commits, pushes, PRs, deployments/, /No background loop, shell runner, stop hook, or provider-specific CLI/, /Preserve unrelated edits/, /not a host-enforced sandbox/]);
});

test('Ralph preserves Phase 8 quality and later gates and has an auditable normalization', () => {
  requireText(phase(), [/Reuse-first gate/, /Tests before refactors/, /No production code without a failing test first/, /Polish checklist/, /AI boundaries when active/, /Line-budget enforcement/, /Seam checkpoint/, /Exit gate to Phase 9/]);
  requireText(loop(), [/not the completion of Feature Pro/, /seam checkpoint/, /review, QA, audit, or release gates/, /On resume, reconcile the ledger with current files/, /invalidate stale proof/]);
  const reconciliation = json('commands/feature-pro/reconciliation.json');
  const normalization = reconciliation.approved_normalizations.find(({ id }) => id === 'phase-eight-bounded-ralph-loop');
  assert.equal(normalization?.classification, 'approved');
  assert.ok(normalization.evidence.includes('skills/ralph-loop/SKILL.md'));
  assert.ok(normalization.evidence.includes('tests/feature-pro-ralph-loop.test.js'));
});
