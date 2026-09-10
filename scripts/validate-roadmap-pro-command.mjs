#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
// Maintainer expectations only; runtime mode selection uses contract.json.
const methods = [
  ['backlog', 'roadmap-backlog-structuring', 'roadmap-curator', 2],
  ['priorities', 'roadmap-priority-advisory', 'roadmap-analyst', 3],
  ['challenge', 'roadmap-independent-challenge', 'roadmap-analyst', 4],
  ['human-review', 'roadmap-human-review', 'roadmap-curator', 5],
  ['product-notes', 'roadmap-product-note', 'roadmap-curator', 6],
  ['execution', 'roadmap-execution-planning', 'roadmap-analyst', 7],
];

export function validateRoadmapRouteMap(contract) {
  const routes = contract?.capability_routes;
  assert(Array.isArray(routes) && routes.length === methods.length, 'Roadmap needs six distinct method routes');
  assert(new Set(routes.map(route => route.selector)).size === methods.length, 'duplicate Roadmap selector');
  for (const [selector, skill, agent, number] of methods) {
    const route = routes.find(item => item.selector === selector);
    assert(route && route.skill === skill && route.agent === agent && route.phase === number, `invalid Roadmap route: ${selector}`);
    const phase = contract.phases?.find(item => item.number === number);
    assert(phase && phase.required_skills.includes(skill) && phase.agents.includes(agent), `unreachable Roadmap route: ${selector}`);
  }
}

export function validateRoadmapCommand() {
  const resolve = createExistingContainedPathResolver(root);
  const read = file => fs.readFileSync(resolve(file, { expectedType: 'file' }), 'utf8');
  const json = file => JSON.parse(read(file));
  const contract = json('commands/roadmap-pro/contract.json');
  validateRoadmapRouteMap(contract);
  const catalogs = buildCommandCatalogs({ harnessRoot: root, skillManifest: json('skills/resolution-manifest.json'), mcpRegistry: json('mcps/registry.json') });
  const skills = ['roadmap-pro', ...methods.map(([, skill]) => skill)];
  const references = methods.flatMap(([, skill]) => fs.readdirSync(resolve(`skills/${skill}/references`, { expectedType: 'directory' })).map(file => `skills/${skill}/references/${file}`));
  const files = [...contract.global_context, ...contract.phases.map(({ file }) => `commands/roadmap-pro/${file}`), ...skills.map(skill => `skills/${skill}/SKILL.md`), ...references];
  const main = read('commands/roadmap-pro.md');
  const mechanics = validateCommandMechanics({
    contract, phaseCount: 7, commandRoot: path.join(root, 'commands/roadmap-pro'), phaseBasePath: 'commands/roadmap-pro', read,
// Budgets are a derived FLOOR, never a cut: activeWordBudget = global_context (2102) + largest phase (238) + 600 words of working room.
// Raised 2026-09-10 after a commit tripped three checks at once because every phase sat within a few words of its ceiling.
// scripts/check-budget-headroom.mjs warns below 300 words; re-derive these if global_context or the largest phase grows.
    mainText: main, globalTexts: contract.global_context.map(read), mainWordBudget: 1423, mainLineBudget: 140, activeWordBudget: 2940,
    phaseHeading: phase => `# Phase ${phase.number} — ${phase.name}\n`, phaseIndex: { text: main, entry: phase => `\`${phase.file}\`` }, catalogs,
    forbidden: { text: files.map(read).join('\n'), label: 'Roadmap bundle', patterns: [/\.agent_docs|\.aw_docs|\bgod-level\b/i, /\b(?:gstack|superpowers)\b/i, /app-product:|app-shared:|fork_turns|openai\.yaml|\/Users\//, new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i')] },
  });
  assert(contract.command === 'roadmap-pro' && contract.phase_count === 7, 'invalid Roadmap identity');
  assert(contract.loading === 'global-once-current-phase-only', 'Roadmap must progressively load');
  assert(JSON.stringify(contract.global_context) === '["commands/roadmap-pro.md","commands/roadmap-pro/routing.md"]', 'Roadmap global context expanded');
  assert(contract.artifact_root === '$PROJECT_ROOT/roadmaps/<roadmap-slug>', 'Roadmap output must be project-owned');
  assert(JSON.stringify(contract.modes.default) === '[1,2,3,4,5,6,7]', 'Roadmap phase map changed');
  assert(references.length === 6, 'preserve six conditional core references');
  assert(JSON.stringify([...catalogs.skills].filter(skill => skill.startsWith('roadmap-')).sort()) === JSON.stringify(skills.sort()), 'Roadmap skill inventory drift');
  for (const [name, profile] of [['roadmap-curator', 'static-analysis-read-only'], ['roadmap-analyst', 'evidence-analysis-read-only']]) {
    const agent = json(`agents/definitions/${name}.json`);
    assert(agent.capability_profile === profile && agent.required_inputs.includes('artifact_root') && agent.required_inputs.includes('roadmap_mode'), `${name}: invalid worker boundary`);
    assert(agent.artifact_policy.repository_writes === 'deny' && !agent.artifact_policy.invent_paths, `${name}: worker cannot write or invent roots`);
    assert(JSON.stringify([...agent.skills].sort()) === JSON.stringify(methods.filter(method => method[2] === name).map(method => method[1]).sort()), `${name}: method ownership differs from route map`);
  }
  for (const file of files) {
    for (const [, target] of read(file).matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#')) continue;
      resolve(path.posix.normalize(path.posix.join(path.posix.dirname(file), target.split('#')[0])), { expectedType: 'file' });
    }
  }
  assert(contract.phases.every(phase => phase.capabilities.length === 0), 'Roadmap methods analyze supplied evidence; no acquisition route');
  for (const file of ['scripts/resolve-roadmap-root.mjs', 'scripts/record-workflow-event.mjs', 'scripts/validate-workflow-trace.mjs', 'scripts/generate-artifact-companion.mjs', 'scripts/validate-artifact-companion.mjs']) read(file);
  assert(json('schemas/workflow-event/workflow-event.schema.json').properties.workflow.enum.includes('roadmap-pro'), 'shared trace must accept Roadmap');
  return { status: 'success', summary: 'Roadmap Pro command contract is valid', phases: 7, methods: 6, canonical_agents: 2,
    main_words: mechanics.mainWords, global_words: mechanics.globalWords, context_budget_scope: mechanics.contextBudgetScope };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(validateRoadmapCommand(), null, 2)); }
  catch (error) { console.log(JSON.stringify({ status: 'error', summary: error.message }, null, 2)); process.exitCode = 1; }
}
