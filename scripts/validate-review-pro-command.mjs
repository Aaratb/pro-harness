#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commandRoot = path.join(harnessRoot, 'commands', 'review-pro');
const resolveHarnessPath = createExistingContainedPathResolver(harnessRoot);
const cache = new Map();
const read = (relativePath) => {
  if (!cache.has(relativePath)) cache.set(relativePath, fs.readFileSync(resolveHarnessPath(relativePath, { expectedType: 'file' }), 'utf8'));
  return cache.get(relativePath);
};
const json = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const main = read('commands/review-pro.md');
  const routing = read('commands/review-pro/routing.md');
  const core = read('skills/review-core/SKILL.md');
  const contract = json('commands/review-pro/contract.json');
  const reconciliation = json('commands/review-pro/reconciliation.json');
  const stateExample = json('commands/review-pro/state.example.json');
  const policy = json('config/review-pro.json');
  const skillManifest = json('skills/resolution-manifest.json');
  const mcpRegistry = json('mcps/registry.json');
  const hooks = json('hooks/registry.json');
  const workflowSchema = json('schemas/workflow-event/workflow-event.schema.json');
  assertJsonSchema(policy, resolveHarnessPath('schemas/review-pro/policy.schema.json', { expectedType: 'file' }), 'Review Pro policy');
  assertJsonSchema(stateExample, resolveHarnessPath('schemas/review-pro/state.schema.json', { expectedType: 'file' }), 'Review Pro state example');
  const catalogs = buildCommandCatalogs({ harnessRoot, skillManifest, mcpRegistry });
  const phaseTexts = contract.phases.map(({ file }) => read(path.posix.join('commands/review-pro', file)));
  const skillNames = ['review-pro', 'review-core', 'review-evidence-integrity', 'review-production-challenge', 'review-handoff'];
  const skillTexts = skillNames.map((name) => read(`skills/${name}/SKILL.md`));
  const referenceTexts = skillNames.flatMap((name) => {
    const directory = path.join(harnessRoot, 'skills', name, 'references');
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).sort().map((entry) => read(`skills/${name}/references/${entry}`));
  });
  const bundle = [main, routing, core, ...phaseTexts, ...skillTexts, ...referenceTexts].join('\n');
  const legacyAgent = /`(?:architect|explorer|general-code-reviewer|general-system-architect|legal-reviewer|performance-benchmarker)`/i;
  const { mainWords, mainLines, expectedNumbers, contextBudgetScope } = validateCommandMechanics({
    contract,
    phaseCount: 10,
    commandRoot,
    phaseBasePath: 'commands/review-pro',
    read,
    mainText: main,
    globalTexts: [main, routing, core],
    mainWordBudget: 1600,
    mainLineBudget: 220,
    activeWordBudget: 4200,
    phaseHeading: (phase) => `# Phase ${phase.number} — ${phase.name}\n`,
    catalogs,
    forbidden: {
      text: bundle,
      label: 'Review Pro canonical bundle',
      patterns: [/\.agent_docs|REVIEW_PRO_WORKSPACE/i, /\b(?:god-level|gstack|superpowers)\b/i, /\bPhase\s+0\b|\bPhase\s+\d+\.\d+\b/i, legacyAgent, new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i'), /\/Users\//],
    },
  });

  assert(contract.command === 'review-pro' && contract.identity === 'Pro-Level Production Reviewer', 'invalid Review Pro identity');
  assert(contract.loading === 'global-once-current-phase-only', 'Review Pro must use progressive loading');
  assert(contract.artifact_root === '$REPO_ROOT/.agents/reviews/<review-slug>', 'Review Pro artifact root is not repository-owned');
  assert(JSON.stringify(contract.global_context) === JSON.stringify(['commands/review-pro.md', 'skills/review-core/SKILL.md', 'commands/review-pro/routing.md']), 'Review Pro global context is incomplete or reordered');
  assert(JSON.stringify(contract.modes.deep) === JSON.stringify(expectedNumbers), 'deep mode must include all ten phases');
  assert(JSON.stringify(contract.modes.fast) === JSON.stringify(expectedNumbers), 'fast mode must retain all review surfaces at bounded depth');
  const fullOutputs = ['CODE_REVIEW.md', 'SCORECARD.md', 'PRODUCTION_READINESS.md', 'PM_REVIEW.md', 'findings.json', 'production-risks.json'];
  assert(JSON.stringify(policy.required_outputs.fast) === JSON.stringify(['CODE_REVIEW.md', 'findings.json', 'production-risks.json']), 'fast mode must use the compact report envelope');
  for (const mode of ['deep', 'reverify']) assert(JSON.stringify(policy.required_outputs[mode]) === JSON.stringify(fullOutputs), `${mode} must preserve the full report envelope`);
  assert(main.includes('begin already-authorized read-only inspection') && !bundle.includes('first-response pause'), 'Review Pro must not pause before already-authorized inspection');
  assert(main.includes('before-run-completion') && main.includes('Do not separately rerun'), 'Review Pro must use the completion hook without duplicate validator runs');
  assert(reconciliation.status === 'reconciled-with-approved-normalizations' && reconciliation.phase_map.length === 10, 'Review Pro source reconciliation is incomplete');
  assert(!Object.hasOwn(reconciliation.source_snapshot, 'path'), 'reconciliation must not expose a migration source path');
  assert(new Set(skillNames).size === 5, 'Review Pro must add exactly five consolidated skills');
  for (const name of skillNames) assert(catalogs.skills.has(name), `unresolved Review Pro skill ${name}`);
  for (const name of ['policy', 'state', 'evidence', 'finding', 'findings', 'lane-report', 'production-risks', 'debug-handoff', 'debug-resolution-input']) {
    const schema = json(`schemas/review-pro/${name}.schema.json`);
    assert(schema.$schema?.includes('2020-12'), `${name}: Review Pro schema must use JSON Schema 2020-12`);
  }
  for (const lane of policy.lanes) {
    assert(catalogs.agents.has(lane.agent), `${lane.id}: unresolved canonical agent ${lane.agent}`);
    const agent = json(`agents/definitions/${lane.agent}.json`);
    assert(agent.capability_profile === lane.profile, `${lane.id}: lane profile differs from canonical agent`);
    assert(agent.artifact_policy.repository_writes === 'deny', `${lane.id}: review lane agent may write repository files`);
  }
  assert(!policy.lanes.some(({ agent }) => agent === 'performance-benchmarker'), 'write-capable performance-benchmarker must not review the checkout');
  assert(policy.security_routes.length === 5 && policy.security_routes.every(({ agent, skill }) => agent === 'security-reviewer' && skill === 'security-review'), 'security routing must use one canonical coordinator');
  assert(new Set(policy.security_routes.map(({ focus }) => focus)).size === 5, 'security focus packets must be unique');
  assert(workflowSchema.properties.workflow.enum.includes('review-pro'), 'shared workflow events do not accept Review Pro');
  assert(hooks.hooks.some(({ workflow, event }) => workflow === 'review-pro' && event === 'before-phase-transition'), 'Review Pro transition hook is missing');
  assert(hooks.hooks.some(({ workflow, event }) => workflow === 'review-pro' && event === 'before-run-completion'), 'Review Pro completion hook is missing');
  for (const required of ['Legacy `--fix`', 'source-read-only', 'Top 5', 'four-part failure', 'independent', 'run-events.jsonl', 'review-pro/debug-handoff@2', 'SAFE_TO_MERGE']) assert(bundle.toLowerCase().includes(required.toLowerCase()), `Review Pro lost required behavior: ${required}`);
  for (const script of ['resolve-review-root.mjs', 'review-source.mjs', 'review-run.mjs', 'validate-review-pro-run.mjs', 'validate-review-handoff.mjs', 'validate-review-handoffs.mjs', 'validate-review-resolution.mjs']) assert(fs.existsSync(path.join(harnessRoot, 'scripts', script)), `missing Review Pro Node helper ${script}`);

  console.log(JSON.stringify({ status: 'success', summary: 'Review Pro command contract is valid', phases: 10, skills: 5, lanes: policy.lanes.length, security_focuses: policy.security_routes.length, main_words: mainWords, main_lines: mainLines, context_budget_scope: contextBudgetScope, artifacts: ['commands/review-pro.md', 'commands/review-pro/contract.json'], next_actions: ['Run Review Pro behavior and distribution validation.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair the Review Pro command, schema, routing, or progressive-loading contract.'] }, null, 2));
  process.exit(1);
}
