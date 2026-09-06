#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commandRoot = path.join(harnessRoot, 'commands', 'explainer-pro');
const resolveHarnessPath = createExistingContainedPathResolver(harnessRoot);
const read = (relative) => fs.readFileSync(resolveHarnessPath(relative, { expectedType: 'file' }), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const main = read('commands/explainer-pro.md');
  const routing = read('commands/explainer-pro/routing.md');
  const core = read('skills/explainer-core/SKILL.md');
  const contract = json('commands/explainer-pro/contract.json');
  const reconciliation = json('commands/explainer-pro/reconciliation.json');
  const stateExample = json('commands/explainer-pro/state.example.json');
  const policy = json('config/explainer-pro.json');
  const skillManifest = json('skills/resolution-manifest.json');
  const mcpRegistry = json('mcps/registry.json');
  const hooks = json('hooks/registry.json');
  assertJsonSchema(policy, resolveHarnessPath('schemas/explainer-pro/policy.schema.json', { expectedType: 'file' }), 'Explainer Pro policy');
  assertJsonSchema(stateExample, resolveHarnessPath('schemas/explainer-pro/state.schema.json', { expectedType: 'file' }), 'Explainer Pro state example');
  const catalogs = buildCommandCatalogs({ harnessRoot, skillManifest, mcpRegistry });
  const phaseTexts = contract.phases.map((phase) => read(`commands/explainer-pro/${phase.file}`));
  const skillNames = ['explainer-pro', 'explainer-core', 'explainer-orientation', 'explainer-architecture', 'explainer-feature-tracing', 'explainer-system-views', 'explainer-reference', 'explainer-comprehension', 'change-explanation'];
  const skillTexts = skillNames.map((name) => read(`skills/${name}/SKILL.md`));
  const referenceTexts = skillNames.flatMap((name) => {
    const directory = path.join(harnessRoot, 'skills', name, 'references');
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).sort().map((entry) => read(`skills/${name}/references/${entry}`));
  });
  const forbiddenPattern = new RegExp([
    'God[- ]level', '\\.agent_docs', '~\\/Explanations', '~\\/\\.claude', '~\\/\\.cursor',
    ['g', 'stack'].join(''), ['super', 'powers'].join(''), ['Context', '7'].join(''),
    ['Updated', 'Personal', 'Harness'].join('-'), 'explainer:[a-z]'
  ].join('|'), 'i');
  const result = validateCommandMechanics({
    contract,
    phaseCount: 8,
    commandRoot,
    phaseBasePath: 'commands/explainer-pro',
    read,
    mainText: main,
    globalTexts: [main, routing, core],
    mainWordBudget: 1600,
    mainLineBudget: 220,
    activeWordBudget: 4200,
    phaseHeading: (phase) => `# Phase ${phase.number} — ${phase.name}`,
    catalogs,
    phaseIndex: { text: main, entry: (phase) => `${phase.number}. ${phase.name}` },
    forbidden: { patterns: [forbiddenPattern], text: [main, routing, core, ...phaseTexts, ...skillTexts, ...referenceTexts].join('\n'), label: 'canonical Explainer Pro surface' },
  });

  assert(contract.identity === 'Pro-Level Repository Learning Guide', 'unexpected Explainer Pro identity');
  assert(contract.artifact_root === '$REPO_ROOT/.agents/explanations/<explanation-slug>', 'artifact root contract changed');
  assert(contract.global_context.join('|') === ['commands/explainer-pro.md', 'skills/explainer-core/SKILL.md', 'commands/explainer-pro/routing.md'].join('|'), 'global context must stay minimal and ordered');
  assert(reconciliation.status === 'reconciled-with-approved-normalizations', 'reconciliation is not approved');
  assert(reconciliation.phase_map.length === 8, 'reconciliation must map all eight phases');
  assert(!fs.existsSync(path.join(harnessRoot, 'commands', 'explainer')), 'thin explainer command wrappers must not exist');
  assert(new Set(skillNames).size === 9, 'Explainer Pro must have exactly nine consolidated skills');
  for (const name of skillNames) assert(catalogs.skills.has(name), `unresolved Explainer Pro skill ${name}`);
  assert(new Set(policy.section_order).size === 18, 'capability order must contain eighteen unique routed capability names');
  assert(Object.keys(policy.capability_dependencies).length === policy.section_order.length, 'capability dependencies and section order must have equal cardinality');
  assert(new Set([...Object.keys(policy.capability_dependencies), ...policy.section_order]).size === policy.section_order.length, 'capability dependencies and section order differ');
  for (const [capability, dependencies] of Object.entries(policy.capability_dependencies)) for (const dependency of dependencies) assert(Object.hasOwn(policy.capability_dependencies, dependency), `${capability} has unknown dependency ${dependency}`);
  assert(hooks.hooks.some(({ workflow, event }) => workflow === 'explainer-pro' && event === 'before-phase-transition'), 'missing Explainer Pro transition hook');
  assert(hooks.hooks.some(({ workflow, event }) => workflow === 'explainer-pro' && event === 'before-run-completion'), 'missing Explainer Pro completion hook');
  for (const script of ['resolve-explainer-root.mjs', 'explainer-source.mjs', 'explainer-change-intake.mjs', 'explainer-course.mjs', 'validate-explainer-course.mjs', 'validate-explainer-pro-run.mjs']) {
    assert(fs.existsSync(path.join(harnessRoot, 'scripts', script)), `missing Node helper ${script}`);
  }
  const importedRoots = skillNames.map((name) => path.join(harnessRoot, 'skills', name));
  const hasPython = importedRoots.some((root) => fs.readdirSync(root, { recursive: true }).some((entry) => String(entry).endsWith('.py')));
  assert(!hasPython, 'Explainer Pro canonical package must not add Python runtime files');
  console.log(JSON.stringify({ status: 'success', summary: 'Explainer Pro command contract is valid', phases: 8, skills: 9, main_words: result.mainWords, main_lines: result.mainLines, context_budget_scope: result.contextBudgetScope, artifacts: ['commands/explainer-pro.md', 'commands/explainer-pro/contract.json'], next_actions: ['Use the lifecycle hook for generated run and course validation.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair the canonical command, resolution, or progressive-loading contract.'] }, null, 2));
  process.exit(1);
}
