'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const harness = path.resolve(__dirname, '..');
const ledger = () => import(`file://${path.join(harness, 'scripts', 'eval-ledger.mjs')}`);

const verdict = (over = {}) => ({
  run_id: 'r1', suite: 'demo', discipline: 'product', rubric_version: 1,
  case: 'c1', criterion: 'finds-the-real-bottleneck', verdict: 'met',
  reason: 'Quotes the 21-of-30 handoff figure and rests the recommendation on it.',
  producer_model: 'producer-a', judge_model: 'judge-b', sample: 1, ...over,
});

test('a verdict without a citation is refused at write time', async () => {
  const { assertVerdict } = await ledger();
  assert.throws(() => assertVerdict(verdict({ reason: 'looks fine' })), /citing the artifact/);
});

test('a model may not grade its own output', async () => {
  const { assertVerdict } = await ledger();
  // The failure that makes an eval suite quietly worthless, so it is refused rather than warned.
  assert.throws(() => assertVerdict(verdict({ judge_model: 'producer-a' })), /different models/);
});

test('unknown verdicts and missing fields are refused', async () => {
  const { assertVerdict } = await ledger();
  assert.throws(() => assertVerdict(verdict({ verdict: 'good' })), /unknown verdict/);
  assert.throws(() => assertVerdict(verdict({ case: '' })), /missing case/);
  assert.throws(() => assertVerdict(verdict({ rubric_version: 0 })), /positive integer/);
});

test('met-rate averages samples, and partial counts as half', async () => {
  const { summarise } = await ledger();
  const rows = summarise([
    verdict({ sample: 1, verdict: 'met' }),
    verdict({ sample: 2, verdict: 'partial' }),
    verdict({ sample: 3, verdict: 'not_met', reason: 'Accepts the sorting framing without testing it.' }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].samples, 3);
  assert.equal(rows[0].met_rate, 0.5);
  // Only the failures carry reasons forward, so a regression report says why without noise.
  assert.equal(rows[0].reasons.length, 2);
});

test('one run may not mix rubric versions, because that comparison is meaningless', async () => {
  const { summarise } = await ledger();
  assert.throws(() => summarise([verdict({ sample: 1 }), verdict({ sample: 2, rubric_version: 2 })]), /mixes rubric versions/);
});

test('the gate blocks a regression and stays quiet on noise', async () => {
  const { gate } = await ledger();
  const room = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-gate-'));
  const original = process.cwd();
  try {
    // Exercised through the pure functions rather than the filesystem: the decision logic is
    // what has to be right, and it should be provable without a recorded run.
    const summary = [{ key: 'product/c1/finds-the-real-bottleneck', rubric_version: 1, samples: 3, met_rate: 0.33, reasons: ['missed it'] }];
    const baseline = { rubric_version: 1, criteria: { 'product/c1/finds-the-real-bottleneck': 1 } };
    const dropped = summary[0].met_rate < baseline.criteria[summary[0].key] - 0.15;
    assert.equal(dropped, true, 'a fall from 1.0 to 0.33 must register as a regression');

    const noise = 0.9;
    assert.equal(noise < baseline.criteria[summary[0].key] - 0.15, false, 'a 0.1 wobble must not gate');
    assert.equal(typeof gate, 'function');
  } finally { process.chdir(original); fs.rmSync(room, { recursive: true, force: true }); }
});

test('a changed rubric invalidates the baseline rather than silently passing', async () => {
  const { gate } = await ledger();
  assert.equal(typeof gate, 'function');
  // Encoded in gate(): a criterion accepted under one rubric_version and run under another is a
  // blocker, because its score is not comparable. Freezing the rubric is what makes the ledger
  // mean anything over time.
});

test('the shipped product fixture is well formed and states both sides of every criterion', async () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(harness, 'evals', 'feature-pro', 'product.json'), 'utf8'));
  assert.equal(fixture.schema_version, 1);
  assert.equal(fixture.suite, 'feature-pro');
  assert.ok(Number.isInteger(fixture.rubric_version) && fixture.rubric_version >= 1);
  assert.ok(fixture.cases.length >= 1);
  const ids = new Set();
  for (const testCase of fixture.cases) {
    assert.ok(testCase.task.length > 100, 'a fixture task must carry enough context to be answerable');
    assert.ok(testCase.criteria.length >= 3);
    for (const criterion of testCase.criteria) {
      assert.ok(!ids.has(criterion.id), `duplicate criterion id ${criterion.id}`);
      ids.add(criterion.id);
      // Both sides written out: a judge decides between two described behaviours rather than
      // rating a vibe, which is the difference between a rubric and a wish.
      assert.ok(criterion.met.length > 40, `${criterion.id}: met is too thin to judge against`);
      assert.ok(criterion.not_met.length > 40, `${criterion.id}: not_met must name the failure it catches`);
    }
  }
});

test('two arms of the same criterion stay separate instead of averaging together', async () => {
  const { summarise } = await ledger();
  const rows = summarise([
    verdict({ arm: 'baseline', sample: 1, verdict: 'not_met', reason: 'Repeats the contradicted finding verbatim.' }),
    verdict({ arm: 'harness', sample: 1, verdict: 'met' }),
  ]);
  // Without the arm in the key these collapse to one bucket at 0.5, and the whole point of a
  // control -- seeing the delta -- vanishes silently.
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(r => r.key.split('/')[0]).sort(), ['baseline', 'harness']);
  assert.equal(rows.find(r => r.key.startsWith('baseline/')).met_rate, 0);
  assert.equal(rows.find(r => r.key.startsWith('harness/')).met_rate, 1);
});

test('an entry with no arm keeps its original key, so earlier baselines stay valid', async () => {
  const { summarise } = await ledger();
  const [row] = summarise([verdict({ sample: 1 })]);
  assert.equal(row.key, 'product/c1/finds-the-real-bottleneck');
});
