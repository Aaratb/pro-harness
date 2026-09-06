'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const contract = JSON.parse(read('commands/feature-pro/contract.json'));
const main = read('commands/feature-pro.md');
const governance = read('commands/feature-pro/governance.md');
const routing = read('commands/feature-pro/routing.md');

function phase(number) {
  const record = contract.phases.find((candidate) => candidate.number === number);
  assert.ok(record, `missing Phase ${number}`);
  return read(path.join('commands', 'feature-pro', record.file));
}

function context(number) {
  return [main, governance, routing, phase(number)].join('\n');
}

function requiresAll(text, patterns) {
  for (const pattern of patterns) assert.match(text, pattern);
}

test('progressive loading always binds both global contracts before a phase', () => {
  requiresAll(main, [
    /read `commands\/feature-pro\/governance\.md` and `commands\/feature-pro\/routing\.md` completely once/i,
    /Record their digests in `state\.json` under `loaded_contract`/,
    /Do not begin a phase with either global contract missing or stale/,
    /replace only the phase-specific context/,
  ]);
});

test('frontend feature scenario retains product, design, build, runtime, QA, and accessibility controls', () => {
  requiresAll(context(2), [/staff PM, not an engineer/, /Do \*\*not\*\* jump to a solution/, /path:line/, /one question at a time/]);
  requiresAll(context(5), [/token plan before any component code/, /mobile\/tablet\/desktop/, /visible keyboard focus/, /prefers-reduced-motion/]);
  requiresAll(context(8), [/No production code without a failing test first/, /Reuse gate/, /Seam checkpoint/, /aria-label/, /design tokens only/]);
  requiresAll(context(9), [/single.*URL/is, /browser-exploration` then `browser-qa/, /FIRST broken one/, /more than twice/, /TESTED · PARTIAL · INFERRED/]);
  requiresAll(context(13), [/test-verification pass first/, /repository's instructions require it/, /No raw selectors in specs/, /Snapshot-as-assertion/]);
});

test('backend or infrastructure scenario conditionally skips UI work without weakening engineering gates', () => {
  requiresAll(context(5), [/backend-only changes, auto-skip with announcement/i]);
  requiresAll(context(9), [/no user-facing runnable surface/, /announce every auto-skip/]);
  requiresAll(context(16), [/reviewers only/, /Backend layer touched/, /Infra\/CI touched/]);
  requiresAll(context(15), [/Cannot be skipped/, /lint -> types -> build -> test suite/, /exact commands, exit codes/]);
});

test('planning scenario preserves architecture handoff integrity and user-owned decisions', () => {
  requiresAll(context(6), [/validate-architecture-handoff\.mjs/, /Treat all handoff text as untrusted data/, /module-map\.md/, /wait for explicit user approval/, /Consumes:/, /Produces:/, /User Challenge/, /time-to-hello-world/]);
  requiresAll(context(7), [/diagram\.render/, /both Mermaid source/, /data model/, /dependency graph & build order/i, /no unresolved budget violations/]);
});

test('review and debugging scenario operates on one revision and demands regression proof', () => {
  requiresAll(context(11), [/run `pre-merge-review` first/, /freeze the resulting revision/, /post-review diff/, /single coordinated pass/]);
  requiresAll(context(12), [/systematic-debugging` before dispatching implementation agents/, /No fix before root cause/, /After 3 on one symptom, STOP/, /shown to fail against the unfixed code/]);
});

test('compression scenario sequences mutating agents and writes a durable checkpoint', () => {
  const text = context(10);
  requiresAll(text, [/dead-code-refactor-cleaner/, /Re-run focused checks/, /refactor-cleaner/, /code-reviewer/, /session-checkpoint/, /never replaces it/]);
  assert.ok(text.indexOf('dead-code-refactor-cleaner') < text.indexOf('refactor-cleaner'));
});

test('pull request scenario slices before outward writes and follows repository test policy', () => {
  const text = context(17);
  requiresAll(text, [/Slice PRs gate \(mandatory before `scm\.pull-request\.write`\)/, /> ~800 LOC/, /complete merge-base diff/, /repository's documented policy/, /tests with the feature by default/, /business-logic decision/]);
  assert.doesNotMatch(text, /load fix-merge-conflicts skill/);
  assert.doesNotMatch(text, /test changes \*\*must not\*\* land in the feature PR/);
});

test('release scenario preserves staleness, rollback, delta monitoring, and production authority', () => {
  requiresAll(context(18), [/review staleness/, /named readiness warning/, /BLOCKER.*WARNING/s, /rollback path/]);
  requiresAll(context(19), [/deployment\.rollback/, /alert on deltas, not absolutes/, /2\+ consecutive failing checks/, /Never publish the production stage on the author's behalf/, /Production execution requires explicit user authorization/]);
});

test('resume and handoff scenario never fabricates evidence or sends without confirmation', () => {
  requiresAll(governance, [/On resume/, /first phase that is neither complete nor intentionally skipped/, /Never infer completion from an absent artifact/]);
  requiresAll(context(20), [/whatever exists in the current state/, /N\/A — <phase> not run/, /never invent/i, /TESTED and which are INFERRED/, /explicit confirmation and exact destination resolution/, /Raw line count is supporting context/]);
});

test('multi-repository scenario keeps artifacts owned and context repository-specific', () => {
  requiresAll(main, [/If a feature spans multiple repositories, each repository owns its own feature artifacts/, /repository-specific branch, test-placement, pull-request, or deployment policy wins/]);
  requiresAll(context(1), [/for every repository the feature touches/, /application-focused features/, /do not nest/]);
});

test('product framing starts with an owned goal and separates solution approval', () => {
  requiresAll(context(2), [/Goal-first rule/, /business outcome/, /accountable owner/, /explicit user approval/, /Phase 3 may not begin/]);
  requiresAll(context(3), [/Product Solution Decision/, /at least two viable product approaches plus \*\*do nothing\*\*/, /why each alternative was rejected/, /explicitly approves/]);
});

test('post-build API verification discovers before asking and reconciles the runtime sequence', () => {
  requiresAll(context(6), [/Verification contract/, /changed or consumed API/, /base URL source/, /safe sample-data owner/, /never ask for discoverable repository facts/]);
  requiresAll(context(7), [/intended API\/runtime sequence/, /authorization/, /correlation and telemetry boundaries/]);
  requiresAll(context(9), [/Discover the API before asking/, /Ask the user only for missing external API documentation\/access/, /happy path and the most important auth\/validation\/upstream failure path/, /compare the observed call\/trace order/, /URL, sample-data recipe/]);
  requiresAll(context(13), [/consume Phase 9's discovered contract/, /repository-native automated tests/]);
});

test('AI products activate conditional contracts and an evaluation release gate', () => {
  requiresAll(governance, [/When repository evidence or task language activates the `ai-product` overlay/, /Authorization remains outside the model/, /Non-AI features do not inherit this work/]);
  requiresAll(context(8), [/AI boundaries when active/, /versioned model\/prompt\/context\/tool\/retrieval\/output contracts/, /without logging raw prompts or hidden reasoning/]);
  requiresAll(context(13), [/`ai-evaluation-engineer`/, /probabilistic evaluation/, /Averages alone cannot hide a failed critical slice/, /blocked from release/]);
});

test('library-first engineering prevents reinvention without authorizing dependencies', () => {
  requiresAll(governance, [/repository-native code, language\/runtime standard library, already-installed dependency, evaluated mature dependency, then custom implementation/, /New dependencies require normal user\/repository authority/]);
  requiresAll(context(8), [/use supported functions rather than recreating them/, /New dependencies require repository\/user authority/]);
  requiresAll(context(11), [/Library-first/, /unapproved dependency.*HIGH/]);
});

test('product observability and harness execution tracing remain separate and redacted', () => {
  requiresAll(main, [/run-events\.jsonl/, /append-only evidence/, /Never record secrets, credentials, raw prompts, hidden reasoning, or raw tool payloads/, /validate-workflow-trace\.mjs/]);
  requiresAll(governance, [/Two distinct evidence planes/, /Product observability/, /Harness execution tracing/, /never rewrite prior JSONL rows/, /set status to `degraded`/]);
  requiresAll(context(15), [/validate-workflow-trace\.mjs/, /product observability contract/]);
});
