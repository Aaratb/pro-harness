'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const METHODS = {
  'customer-research-framing': [/Frame the decision and baseline/, /Make questions discriminate between explanations/, /problem discovery separate from positioning/],
  'customer-evidence-audit': [/Audit from sources to permitted claims/, /people asked, usable responses/, /Corrections and dependency impact/],
  'customer-research-access': [/Bind scope before execution/, /configured.*callable.*authenticated/i, /timeouts may leave remote work running/],
  'customer-quantitative-analysis': [/Make the measurement mean something/, /Explore with competing explanations/, /Execute material arithmetic/],
  'customer-cohort-design': [/target and accessible frame separately/, /analytical cohort/, /recruitment cohort/, /Selection receipt/],
  'customer-interview-design': [/Golden-script lifecycle/, /stable IDs/i, /field-tested for the stated roles/, /Short mode/],
  'customer-research-records': [/Record instrument execution and honest denominators/, /not asked is not a negative/i, /Corrections must reach current interpretations/],
  'customer-behavior-synthesis': [/Reconstruct episodes before describing people/, /Derive situational profiles/, /product boundary is the customer boundary/],
  'customer-insight-synthesis': [/Build explanations from the evidence/, /Seek unmet needs without inventing demand/, /Reopen corrected conclusions/],
  'customer-icp-definition': [/Build the fit explanation/, /current fit/, /future conditional fit/, /Unknown fit/, /Remain useful before evidence exists/],
  'customer-market-intelligence': [/Build a customer-choice explanation/, /Explain persistence and switching/, /Classify the apparent gap/],
  'customer-opportunity-economics': [/Prevent double counting/, /Examine capture and delivery/, /customer value creation separate from provider revenue/i, /not forecasts/],
  'customer-positioning': [/Build the position from the choice/, /foundational messages/, /Keep message exposure and evidence separate/],
  'customer-strategy-synthesis': [/right to exist/, /right to win/, /right to sustain/, /Choices and sacrifices/, /Customer fit and alignment/],
  'customer-solution-validation': [/Message clarity is a research question/, /Predeclare interpretation/, /competing mechanisms/i, /no new product/],
  'customer-independent-challenge': [/Independently reconstruct what matters/, /not the author's private reasoning/, /Agreement of agents is not new customer evidence/, /Review Pro/],
};
const NAMES = Object.keys(METHODS);
const REFERENCES = [
  'customer-evidence-audit/references/evidence-judgments.md',
  'customer-research-access/references/operation-controls.md',
  'customer-quantitative-analysis/references/quantitative-reasoning.md',
  'customer-insight-synthesis/references/cross-case-synthesis.md',
  'customer-market-intelligence/references/comparison-and-source-judgments.md',
  'customer-opportunity-economics/references/economic-model-checks.md',
  'customer-strategy-synthesis/references/strategic-challenge-lenses.md',
  'customer-strategy-synthesis/references/customer-fit-and-alignment.md',
  'customer-solution-validation/references/study-and-evidence-judgments.md',
];
const files = () => [...NAMES.map((name) => `skills/${name}/SKILL.md`), ...REFERENCES.map((file) => `skills/${file}`)];

test('all sixteen customer methods resolve through one canonical manifest and existing command routes', () => {
  const manifest = json('skills/resolution-manifest.json');
  const routes = json('commands/customer-backward-pro/contract.json').capability_routes;
  assert.equal(NAMES.length, 16);
  assert.deepEqual(new Set(routes.map(({ skill }) => skill)), new Set(NAMES));
  for (const name of NAMES) {
    const entries = manifest.skills.filter((entry) => entry.name === name);
    assert.equal(entries.length, 1, `${name}: needs one manifest entry`);
    const text = read(`skills/${name}/SKILL.md`);
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, `${name}: missing frontmatter`);
    const fields = Object.fromEntries(frontmatter[1].split('\n').map((line) => {
      const separator = line.indexOf(':');
      return [line.slice(0, separator), line.slice(separator + 1).trim().replace(/^["']|["']$/g, '')];
    }));
    assert.deepEqual(Object.keys(fields), ['name', 'description']);
    assert.equal(fields.name, name);
    assert.equal(entries[0].description, fields.description);
    for (const dependency of entries[0].dependencies) {
      assert.ok(manifest.skills.some((entry) => entry.name === dependency), `${name}: unresolved ${dependency}`);
    }
    assert.equal(fs.existsSync(path.join(ROOT, 'skills', name, 'agents')), false, `${name}: canonical skills must not contain runtime metadata`);
  }
});

for (const [name, patterns] of Object.entries(METHODS)) {
  test(`${name} retains its substantive research method`, () => {
    const text = read(`skills/${name}/SKILL.md`);
    for (const pattern of patterns) assert.ok(pattern.test(text), `${name}: missing method ${pattern}`);
  });
}

test('every customer skill permits bounded chat and requires exact caller-owned roots before saving or delegation', () => {
  for (const name of NAMES) {
    const text = read(`skills/${name}/SKILL.md`);
    for (const pattern of [/caller-supplied `artifact_root`/, /explicitly selected non-Git project/, /chat-only/, /nothing is saved or delegated/, /Saving or delegation requires/, /Never guess a project or output folder/, /A root is not write permission/, /narrower capabilities/, /arithmetic/]) {
      assert.ok(pattern.test(text), `${name}: missing boundary ${pattern}`);
    }
  }
});

test('all nine depth references and relative links resolve without historical/runtime taxonomy', () => {
  assert.equal(REFERENCES.length, 9);
  for (const file of files()) {
    const text = read(file);
    const historicalRoot = new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i');
    assert.ok(!historicalRoot.test(text) && !/\.agent_docs|\.aw_docs|app-product[:\/-]|app-shared[:\/-]|data-adhoc-queries|gstack|superpowers|\.planning\//i.test(text), `${file}: historical runtime dependency`);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      const resolved = path.resolve(ROOT, path.dirname(file), target);
      assert.ok(resolved.startsWith(`${ROOT}${path.sep}`), `${file}: escaped link ${target}`);
      assert.ok(fs.existsSync(resolved), `${file}: unresolved link ${target}`);
    }
  }
});

test('optional analytical reuse targets leaf references and the existing experiment skill, not Outcome workflow', () => {
  const quantitative = read('skills/customer-quantitative-analysis/references/quantitative-reasoning.md');
  for (const target of ['../../outcome-analysis/references/aggregate-query-design.md', '../../outcome-analysis/references/measurement-design.md', '../../ab-test-analysis/SKILL.md']) {
    assert.ok(quantitative.includes(target), `missing reusable lens ${target}`);
    assert.ok(fs.existsSync(path.resolve(ROOT, 'skills/customer-quantitative-analysis/references', target)), `unresolved reusable lens ${target}`);
  }
  const access = read('skills/customer-research-access/SKILL.md');
  assert.ok(access.includes('../outcome-analysis/references/aggregate-query-design.md'));
  assert.ok(quantitative.includes('Customer research scope and worker authority remain controlling'));
  assert.ok(quantitative.includes('Missing lenses leave the core analytical method usable'));
  assert.ok(!files().some((file) => read(file).includes('outcome-pro/references/analytical-methods.md')));
  assert.deepEqual(json('skills/resolution-manifest.json').skills.find(({ name }) => name === 'customer-quantitative-analysis').dependencies, ['ab-test-analysis']);
});

test('analyst acquisition remains prohibited and public-web acquisition reuses approved Firecrawl and Exa', () => {
  for (const name of NAMES.filter((name) => name !== 'customer-research-access')) {
    assert.ok(/(?:No new acquisition|No live acquisition|no live acquisition|no acquisition|browse for new evidence|live acquisition, production SQL|network retrieval|live database\/network queries|query live systems|does not recruit|Do not call customers, search other systems|No network, production query)/i.test(read(`skills/${name}/SKILL.md`)), `${name}: missing analytical acquisition boundary`);
  }
  const controls = read('skills/customer-research-access/references/operation-controls.md');
  assert.ok(/Firecrawl first/.test(controls));
  assert.ok(/Exa/.test(controls));
  assert.ok(/separately authorized setup task/.test(controls));
  assert.ok(/Unknown completion/.test(controls));
  assert.ok(/No consent\/approved processor means no upload/.test(controls));
});
