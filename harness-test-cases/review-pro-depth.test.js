'use strict';

// These check instruction/activation contracts, not the quality of a model's review.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const phase = p => read(`commands/review-pro/phases/${p}.md`);
const contract = JSON.parse(read('commands/review-pro/contract.json'));

test('review reuses existing discipline methods through explicit current-phase routes', () => {
  const required = { 5: ['review-production-challenge'] };
  const optional = {
    5: ['architecture-data-model-evolution', 'architecture-query-performance'],
    6: ['architecture-security-review', 'architecture-system-performance', 'architecture-capacity-and-tuning', 'ai-product-engineering'],
    7: ['ai-product-engineering'],
  };
  for (const [key, expected] of [['required_skills', required], ['optional_skills', optional]]) {
    for (const [number, skills] of Object.entries(expected)) {
      const entry = contract.phases.find(p => p.number === Number(number));
      const instructions = read(`commands/review-pro/${entry.file}`);
      for (const skill of skills) {
        assert.ok(entry[key].includes(skill), `phase ${number}: ${skill}`);
        assert.ok(instructions.includes(skill), `phase ${number} must explain when to use ${skill}`);
        assert.ok(fs.existsSync(path.join(root, 'skills', skill, 'SKILL.md')));
      }
    }
  }
});

test('review dispatch delivers current methods without importing foreign workflow governance', () => {
  const routing = read('commands/review-pro/routing.md');
  for (const text of ['canonical definition and relevant skills', 'fresh general agent', 'host-enforced',
    'instruction-only', 'lane_contract', 'evidence_manifest', 'CODE_REVIEW.md']) assert.ok(routing.includes(text), text);
  assert.match(routing, /Do not import.*governance/);
  assert.match(routing, /static.*return.*orchestrator/i);
  assert.match(routing, /Do not add.*(?:state|schema)/);
});

test('review scope follows changed product behavior and missing code maps do not block', () => {
  assert.match(phase('03-scope'), /before.*after/i);
  assert.match(phase('03-scope'), /product.*(?:outcome|promise)|(?:outcome|promise).*product/i);
  assert.match(phase('04-grounding'), /missing code map.*not.*block/i);
  assert.match(phase('05-review'), /user.*state|state.*user/i);
  assert.match(phase('05-review'), /pre-existing/);
});

test('review verification actively seeks counterevidence and never invents fresh reviewers', () => {
  const verification = phase('08-verification');
  for (const text of ['counterevidence', 'runtime', 'CONFIRMED', 'REPRODUCED', 'Debug Pro']) assert.ok(verification.includes(text), text);
  assert.match(verification, /distinct.*(?:author|candidate)|(?:author|candidate).*distinct/i);
  assert.match(verification, /changed.*(?:verdict|disposition)|(?:verdict|disposition).*changed/i);
  assert.match(verification, /no candidates/i);
});

test('review tests inspect assertion semantics before treating execution as proof', () => {
  const evidence = phase('07-evidence');
  for (const text of ['side effects', 'assertion', 'mock', 'durable', 'skipped', 'AI']) assert.ok(evidence.includes(text), text);
  assert.match(evidence, /not.*(?:author|change).*tests/i);
  assert.match(evidence, /quality.*evaluation|evaluation.*quality/i);
});

test('review findings explain release consequences without becoming a repair or redesign workflow', () => {
  const synthesis = phase('09-synthesis');
  const reports = phase('10-report');
  assert.match(synthesis, /exposure.*impact|impact.*exposure/i);
  assert.match(synthesis, /owner.*(?:condition|proof)|(?:condition|proof).*owner/i);
  assert.match(reports, /PM_REVIEW.*(?:product|user)|(?:product|user).*PM_REVIEW/);
  assert.match(reports, /acceptance criteria.*(?:patch|implementation)|(?:patch|implementation).*acceptance criteria/i);
  assert.match(read('commands/review-pro.md'), /never diagnoses root causes or applies corrections/);
  assert.deepEqual(contract.modes.fast, [1,2,3,4,5,6,7,8,9,10]);
});

test('review network permission records actual consent without inventing a public mode', () => {
  const command = read('commands/review-pro.md');
  const core = read('skills/review-core/SKILL.md');
  assert.doesNotMatch(command, /network access, protected telemetry, and.*each require their named flag/);
  assert.match(command, /Network reads and protected telemetry require explicit bounded consent/);
  assert.match(core, /state\.transport\.network/);
  assert.match(core, /records permission, never grants it/);
  assert.ok(read('scripts/review-run.mjs').includes("args.has('--network')"));
});
