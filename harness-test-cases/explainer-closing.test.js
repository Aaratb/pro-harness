'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/explainer-pro.json'), 'utf8'));
const phases = { 'repo-map': 2, 'reading-plan': 2, architecture: 3, 'feature-map': 4, 'trace-feature': 4, 'business-logic': 4, 'explain-file': 4, 'explain-function': 4, sequence: 4, change: 4, 'dependency-graph': 5, 'data-model': 5, 'sync-async': 5, libraries: 6, conventions: 6, glossary: 6, quiz: 7, codemap: 8 };
const closing = '#### Teach-back\n\nExplain **durability** using `src/index.js:1`.\n\n#### Questions to take to the builders\n\n1. What would change if the write failed?\n2. Which source boundary owns recovery?';

function runScript(name, args) {
  return JSON.parse(childProcess.execFileSync(process.execPath, [path.join(ROOT, 'scripts', name), ...args], { encoding: 'utf8', timeout: 20000 }));
}

function sectionFor(capability, fingerprint, consequence = `${capability}: consequence`) {
  const claimId = `claim-${capability}-fixture`;
  return {
    schema_version: 'explainer-pro/section@1', id: capability, capability, phase: phases[capability], title: `Chapter ${capability}`,
    prerequisites: policy.capability_dependencies[capability], claim_ids: [claimId],
    content: { orientation: `${capability}: orientation`, mechanism: `${capability}: mechanism`, evidence: `${capability}: evidence`, consequence },
    status: 'gated', source_fingerprint_sha256: fingerprint, diagrams: [],
    quiz: [1, 2].map((index) => ({ question: `${capability}: checkpoint ${index}`, options: [`${capability}: option ${index}A`, `${capability}: option ${index}B`], correct_index: 0, explanations: ['The cited source confirms this.', 'The cited source does not show this.'], claim_ids: [claimId] })),
  };
}

function publishFixture(t, { withCodemap = false, consequence = closing, emptyQuiz = false } = {}) {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-closing-'));
  t.after(() => fs.rmSync(repository, { recursive: true, force: true }));
  const git = (args) => childProcess.execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8', timeout: 20000 });
  git(['init', '-q']);
  git(['config', 'user.name', 'Explainer Closing Test']);
  git(['config', 'user.email', 'explainer-closing@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', '/dev/null']);
  fs.mkdirSync(path.join(repository, 'src'));
  fs.writeFileSync(path.join(repository, 'src/index.js'), 'export const durable = true;\n');
  git(['add', '.']);
  git(['commit', '--no-verify', '-q', '-m', 'synthetic fixture']);
  const { artifact_root: artifactRoot } = runScript('resolve-explainer-root.mjs', ['--repo', repository, '--slug', 'closing-fixture', '--create']);
  const context = ['--repo-root', repository, '--artifact-root', artifactRoot];
  runScript('explainer-course.mjs', ['init', ...context, '--audience', 'FSB']);
  const state = JSON.parse(fs.readFileSync(path.join(artifactRoot, 'state.json'), 'utf8'));
  const capabilities = policy.section_order.filter((capability) => withCodemap || capability !== 'codemap');
  const sections = capabilities.map((capability) => sectionFor(capability, state.source_fingerprint.worktree_sha256, capability === 'quiz' ? consequence : undefined));
  if (emptyQuiz) sections.find(({ capability }) => capability === 'quiz').quiz = [];
  const batch = sections.map((section) => {
    const input = { section: `work/${section.id}.json`, claims: `work/${section.id}-claims.json` };
    fs.writeFileSync(path.join(artifactRoot, input.section), JSON.stringify(section));
    fs.writeFileSync(path.join(artifactRoot, input.claims), JSON.stringify({ schema_version: 'explainer-pro/claims@1', records: [{
      id: section.claim_ids[0], owner_section: section.id, type: 'behavior', level: 'CONFIRMED', text: 'The synthetic source exports a constant.', cite: 'src/index.js:1', quote: 'export const durable = true;', material: true, independently_verified: true, gated_at: new Date().toISOString(),
    }] }));
    return input;
  });
  fs.writeFileSync(path.join(artifactRoot, 'work/batch.json'), JSON.stringify(batch.reverse()));
  runScript('explainer-course.mjs', ['publish', ...context, '--batch', 'work/batch.json']);
  assert.equal(runScript('validate-explainer-course.mjs', context).status, 'success');
  const generation = fs.readFileSync(path.join(artifactRoot, 'CURRENT'), 'utf8').trim();
  const generationRoot = path.join(artifactRoot, 'generations', generation);
  return { sections, read: (name) => fs.readFileSync(path.join(generationRoot, name), 'utf8') };
}

function chapter(output, capability, format) {
  const marker = format === 'course.html' ? `<section class="chapter" id="${capability}"` : `## Chapter ${capability}\n`;
  const start = output.indexOf(marker);
  assert.notEqual(start, -1, `missing ${capability} chapter in ${format}`);
  const end = output.indexOf(format === 'course.html' ? '</section>' : '\n## ', start + marker.length);
  return output.slice(start, end === -1 ? undefined : end);
}

function assertOrdered(output, markers) {
  let previous = -1;
  for (const marker of markers) {
    const position = output.indexOf(marker);
    assert.ok(position >= 0, `missing marker: ${marker}`);
    assert.ok(position > previous, `out-of-order marker: ${marker}`);
    previous = position;
  }
}

for (const withCodemap of [true, false]) {
  for (const format of ['EXPLAINER.md', 'course.html']) {
    test(`${format} closes quiz after all questions ${withCodemap ? 'and before optional codemap' : 'without codemap'}`, (t) => {
      const fixture = publishFixture(t, { withCodemap });
      const output = fixture.read(format);
      const quiz = chapter(output, 'quiz', format);
      const wrapper = format === 'course.html' ? '<h3>What this means</h3>' : '### Consequence';
      assertOrdered(quiz, ['quiz: orientation', 'quiz: mechanism', 'quiz: evidence', 'quiz: checkpoint 1', 'quiz: option 2B', wrapper, 'Teach-back', 'Questions to take to the builders']);
      assert.equal(quiz.split(wrapper).length - 1, 1, 'the existing consequence wrapper must appear once');
      for (const section of fixture.sections.filter(({ capability }) => capability !== 'quiz')) {
        assertOrdered(chapter(output, section.id, format), ['orientation', 'mechanism', 'evidence', `${section.id}: consequence`, `${section.id}: checkpoint 1`]);
      }
      const codemapMarker = format === 'course.html' ? '<section class="chapter" id="codemap"' : '## Chapter codemap\n';
      if (withCodemap) assertOrdered(output, ['Questions to take to the builders', codemapMarker]);
      else assert.ok(!output.includes(codemapMarker), 'codemap must remain optional');
      if (format === 'course.html') {
        assert.match(output, /href="#quiz" data-chapter-link/);
        assert.match(quiz, /aria-labelledby="course--quiz--title"/);
        assert.match(quiz, /data-check="course--quiz--q2" hidden/);
        assert.match(quiz, /id="course--quiz--q2--feedback" role="status" aria-live="polite"/);
        assertOrdered(quiz, ['Questions to take to the builders', 'class="chapter-next"']);
        assert.match(quiz, withCodemap ? /href="#codemap"/ : /End of the guide/);
      } else assert.ok(quiz.includes(closing), 'authored Markdown must be preserved');
    });
  }
}

test('legacy quiz consequences retain generic wrappers even with no quiz questions', (t) => {
  const consequence = 'Use the mapped evidence to explain the result.';
  const fixture = publishFixture(t, { consequence, emptyQuiz: true });
  for (const format of ['EXPLAINER.md', 'course.html']) {
    const quiz = chapter(fixture.read(format), 'quiz', format);
    assertOrdered(quiz, ['quiz: evidence', format === 'course.html' ? '<h3>What this means</h3>' : '### Consequence', consequence]);
    assert.doesNotMatch(quiz, /Questions to take to the builders|Teach-back|quiz: checkpoint/);
  }
});

test('authored quiz closing remains formatted passive text and preserves answer data', async () => {
  const [{ htmlFor }, { courseScript }] = await Promise.all([import('../scripts/lib/explainer-html.mjs'), import('../scripts/lib/explainer-presentation.mjs')]);
  const consequence = `${closing}\n\n<script>authoredClosingExecuted()</script>\n\n<img src="x" onerror="authoredClosingExecuted()">\n\n[Unsafe link](javascript:authoredClosingExecuted())`;
  const section = sectionFor('quiz', `sha256:${'0'.repeat(64)}`, consequence);
  const state = { slug: 'synthetic-closing', audience: 'FSB', mode: 'COURSE', coverage: { scope: 'Synthetic renderer fixture', static_only: true, limitations: [] } };
  const html = htmlFor([section], state, new Map());
  const quiz = chapter(html, 'quiz', 'course.html');
  assert.match(quiz, /<h4>Teach-back<\/h4>/);
  assert.match(quiz, /<strong>durability<\/strong>/);
  assert.match(quiz, /<code>src\/index.js:1<\/code>/);
  assert.match(quiz, /<ol><li>What would change/);
  assert.match(quiz, /&lt;script&gt;authoredClosingExecuted\(\)&lt;\/script&gt;/);
  assert.match(quiz, /&lt;img src=&quot;x&quot; onerror=&quot;authoredClosingExecuted\(\)&quot;&gt;/);
  assert.doesNotMatch(quiz, /<script\b|<img\b|href="javascript:/i);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, 'only the trusted course interaction script may be active');
  const answers = Object.fromEntries(section.quiz.map((question, index) => [`course--quiz--q${index + 1}`, { correct: question.correct_index, explanations: question.explanations }]));
  assert.equal(scripts[0][1], courseScript(answers), 'closing prose must not alter the trusted quiz interaction script or answers');
});
