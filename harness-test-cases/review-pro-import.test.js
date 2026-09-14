'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));

test('Review Pro exposes one compact ten-phase command', () => {
  const command = read('commands/review-pro.md');
  const contract = json('commands/review-pro/contract.json');
  assert.equal(contract.phase_count, 10);
  assert.deepEqual(contract.phases.map(({ number }) => number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(contract.modes.fast, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  // Raised 1600 -> 1650 on 2026-09-11, same reason as debug-pro: artifact scope is new behavior.
  assert.ok(command.split(/\s+/).length <= 1650);
  assert.equal(fs.existsSync(path.join(ROOT, 'commands', 'review-pro', 'wrappers')), false);
  assert.match(command, /--phase <1-10>/);
  assert.match(command, /--capability <name>/);
});

test('Review Pro uses five consolidated skills and reuses the existing catalog', () => {
  const manifest = json('skills/resolution-manifest.json');
  const names = manifest.skills.map(({ name }) => name);
  const added = ['review-pro', 'review-core', 'review-evidence-integrity', 'review-production-challenge', 'review-handoff'];
  for (const name of added) {
    assert.ok(names.includes(name));
    assert.ok(fs.existsSync(path.join(ROOT, 'skills', name, 'SKILL.md')));
  }
  for (const reused of ['pre-merge-review', 'review-pull-request', 'security-review', 'production-readiness', 'observability-by-design', 'verification-before-completion']) assert.ok(names.includes(reused));
});

test('Review Pro is repository-owned, runtime neutral, and free of legacy taxonomy', () => {
  const files = [
    'commands/review-pro.md', 'commands/review-pro/routing.md', 'skills/review-core/SKILL.md',
    ...fs.readdirSync(path.join(ROOT, 'commands', 'review-pro', 'phases')).map((name) => `commands/review-pro/phases/${name}`),
  ];
  const text = files.map(read).join('\n');
  assert.match(text, /\.agents\/reviews\/<review-slug>/);
  assert.doesNotMatch(text, /\.agent_docs|REVIEW_PRO_WORKSPACE|God-level/i);
  assert.doesNotMatch(text, new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i'));
  assert.doesNotMatch(text, /~\/\.claude|~\/\.codex|~\/\.cursor|Claude-style|Cursor-style/i);
  assert.doesNotMatch(text, /`(?:architect|explorer|general-code-reviewer|general-system-architect|legal-reviewer|performance-benchmarker)`/);
});

test('Review Pro routes canonical read-only agents and consolidated security', () => {
  const policy = json('config/review-pro.json');
  assert.equal(policy.lanes.some(({ agent }) => agent === 'performance-benchmarker'), false);
  assert.ok(policy.lanes.every(({ agent }) => fs.existsSync(path.join(ROOT, 'agents', 'definitions', `${agent}.json`))));
  assert.ok(policy.lanes.every(({ agent, profile }) => json(`agents/definitions/${agent}.json`).capability_profile === profile));
  assert.deepEqual([...new Set(policy.security_routes.map(({ agent }) => agent))], ['security-reviewer']);
  assert.deepEqual([...new Set(policy.security_routes.map(({ skill }) => skill))], ['security-review']);
});

test('Review Pro preserves source outcomes while strengthening the Debug boundary', () => {
  const reconciliation = json('commands/review-pro/reconciliation.json');
  assert.equal(reconciliation.preserved_outcomes.length, 13);
  assert.equal(reconciliation.phase_map.length, 10);
  assert.ok(reconciliation.normalizations.includes('strengthened handoff integrity and structured command routing'));
  const handoff = json('schemas/review-pro/debug-handoff.schema.json');
  assert.equal(handoff.properties.schema_version.const, 'review-pro/debug-handoff@2');
  assert.equal(handoff.properties.route.properties.command.const, 'debug-pro');
  assert.equal(fs.existsSync(path.join(ROOT, 'commands', 'debug-pro.md')), true);
});

test('Review Pro reuses existing MCP contracts without adding a provider', () => {
  const registry = json('mcps/registry.json');
  const providers = json('mcps/providers.json');
  assert.deepEqual(Object.keys(providers.providers).sort(), ['exa', 'firecrawl', 'mermaid', 'playwright', 'vercel']);
  for (const name of ['firecrawl', 'browser', 'source-control', 'observability']) {
    const entry = registry.contracts.find((candidate) => candidate.name === name);
    assert.ok(entry.workflows['review-pro']?.length > 0, name);
  }
});

test('Review Pro starts authorized inspection after the opening roadmap and choice', () => {
  const command = read('commands/review-pro.md');
  const roadmap = read('commands/review-pro/phases/01-roadmap.md');
  const adapter = read('skills/review-pro/SKILL.md');
  assert.match(command, /begin already-authorized read-only inspection/i);
  assert.match(command, /ambiguous target|missing authority/i);
  assert.match(roadmap, /same turn/i);
  assert.match(command, /wait for the user's choice/);
  assert.match(roadmap, /opening roadmap and entry choice/);
  assert.match(adapter, /opening roadmap.*entry choice/);
});

test('Review Pro fast mode has one human report and preserves machine evidence', () => {
  const policy = json('config/review-pro.json');
  assert.deepEqual(policy.required_outputs.fast, ['CODE_REVIEW.md', 'findings.json', 'production-risks.json']);
  const full = ['CODE_REVIEW.md', 'SCORECARD.md', 'PRODUCTION_READINESS.md', 'PM_REVIEW.md', 'findings.json', 'production-risks.json'];
  assert.deepEqual(policy.required_outputs.deep, full);
  assert.deepEqual(policy.required_outputs.reverify, full);
  const report = read('commands/review-pro/phases/10-report.md');
  assert.match(report, /fast.*CODE_REVIEW\.md/i);
  assert.match(report, /evidence ledgers.*state|state.*evidence ledgers/i);
});

test('Review Pro reuses bounded context and invokes completion validation once', () => {
  const core = read('skills/review-core/SKILL.md');
  const routing = read('commands/review-pro/routing.md');
  assert.match(core, /same-source evidence/i);
  assert.match(core, /independent verifier.*reopen/i);
  assert.match(routing, /routine intake.*inline/i);
  for (const relative of ['commands/review-pro.md', 'commands/review-pro/phases/10-report.md']) {
    const text = read(relative);
    assert.match(text, /before-run-completion/);
    assert.match(text, /Do not separately rerun/i);
  }
});
