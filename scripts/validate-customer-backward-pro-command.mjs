#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
// Maintainer regression expectations; runtime routing has one source: contract.json.
const methods = [
  ['framing', 'customer-research-framing', 1, 'customer-researcher'],
  ['evidence-audit', 'customer-evidence-audit', 2, 'customer-evidence-analyst'],
  ['access', 'customer-research-access', 2, 'customer-researcher'],
  ['cohort-design', 'customer-cohort-design', 3, 'customer-researcher'],
  ['interview-design', 'customer-interview-design', 3, 'customer-researcher'],
  ['records', 'customer-research-records', 4, 'customer-researcher'],
  ['quantitative-analysis', 'customer-quantitative-analysis', 5, 'customer-evidence-analyst'],
  ['behavior', 'customer-behavior-synthesis', 5, 'customer-researcher'],
  ['insights', 'customer-insight-synthesis', 5, 'customer-researcher'],
  ['icp', 'customer-icp-definition', 6, 'customer-researcher'],
  ['market', 'customer-market-intelligence', 6, 'customer-evidence-analyst'],
  ['economics', 'customer-opportunity-economics', 6, 'customer-evidence-analyst'],
  ['positioning', 'customer-positioning', 6, 'customer-researcher'],
  ['strategy', 'customer-strategy-synthesis', 7, 'customer-researcher'],
  ['validation', 'customer-solution-validation', 7, 'customer-researcher'],
  ['challenge', 'customer-independent-challenge', 8, 'customer-evidence-analyst'],
];

export function validateCustomerRouteMap(contract) {
  const routes = contract?.capability_routes;
  assert(Array.isArray(routes) && routes.length === methods.length, 'Customer requires sixteen distinct method routes');
  assert(new Set(routes.map((r) => r.selector)).size === methods.length, 'duplicate Customer selector');
  assert(new Set(routes.map((r) => r.skill)).size === methods.length, 'duplicate Customer method');
  for (const [selector, skill, phaseNumber, agent] of methods) {
    const route = routes.find((r) => r.selector === selector);
    assert(route && route.skill === skill && route.phase === phaseNumber && route.agent === agent, `invalid Customer route: ${selector}`);
    const phase = contract.phases?.find((p) => p.number === phaseNumber);
    assert(phase && [...phase.required_skills, ...phase.optional_skills].includes(skill) && phase.agents.includes(agent), `unreachable Customer route: ${selector}`);
  }
}

export function validateCustomerCommand() {
  const resolve = createExistingContainedPathResolver(root);
  const read = (file) => fs.readFileSync(resolve(file, { expectedType: 'file' }), 'utf8');
  const json = (file) => JSON.parse(read(file));
  const contract = json('commands/customer-backward-pro/contract.json');
  validateCustomerRouteMap(contract);
  const catalogs = buildCommandCatalogs({ harnessRoot: root, skillManifest: json('skills/resolution-manifest.json'), mcpRegistry: json('mcps/registry.json') });
  const skills = ['customer-backward-pro', ...methods.map(([, skill]) => skill)];
  const references = methods.flatMap(([, skill]) => {
    const relative = `skills/${skill}/references`;
    if (!fs.existsSync(path.join(root, relative))) return [];
    return fs.readdirSync(resolve(relative, { expectedType: 'directory' })).map((file) => `${relative}/${file}`);
  });
  const files = [...contract.global_context, 'commands/customer-backward-pro/local-controls.md',
    ...contract.phases.map(({ file }) => `commands/customer-backward-pro/${file}`),
    ...skills.map((skill) => `skills/${skill}/SKILL.md`), ...references];
  const main = read('commands/customer-backward-pro.md');
  const mechanics = validateCommandMechanics({
    contract, phaseCount: 8, commandRoot: path.join(root, 'commands/customer-backward-pro'),
    phaseBasePath: 'commands/customer-backward-pro', read, mainText: main, globalTexts: contract.global_context.map(read),
    // Opening choice and eight phase purposes are deliberate user-facing context.
    mainWordBudget: 1300, mainLineBudget: 140, activeWordBudget: 2500,
    phaseHeading: (phase) => `# Phase ${phase.number} — ${phase.name}\n`,
    phaseIndex: { text: main, entry: (phase) => `\`${phase.file}\`` }, catalogs,
    forbidden: { text: files.map(read).join('\n'), label: 'Customer canonical bundle', patterns: [
      /\.agent_docs|\.aw_docs|\bgod-level\b/i, /\b(?:gstack|superpowers)\b/i,
      /app-product:|app-shared:|fork_turns|openai\.yaml|\/Users\//,
      new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i'),
    ] },
  });
  assert(contract.command === 'customer-backward-pro' && contract.phase_count === 8, 'invalid Customer identity or phase count');
  assert(contract.loading === 'global-once-current-phase-only', 'Customer must progressively load');
  assert(JSON.stringify(contract.global_context) === JSON.stringify(['commands/customer-backward-pro.md', 'commands/customer-backward-pro/routing.md']), 'Customer global context expanded');
  assert(contract.artifact_root === '$PROJECT_ROOT/.agents/research/<study-slug>', 'Customer output must be project-owned');
  assert(JSON.stringify(contract.modes.default) === '[1,2,3,4,5,6,7,8]', 'Customer default phase map changed');
  assert(references.length === 9, 'Customer must preserve nine conditional method references');
  assert(JSON.stringify([...catalogs.skills].filter((s) => s.startsWith('customer-')).sort()) === JSON.stringify([...skills, 'customer-journey-map'].sort()), 'Customer skill inventory drifted; preserve the existing journey-map skill');
  assert([...catalogs.agents].filter((a) => a.startsWith('customer-')).length === 2, 'Customer must consolidate into two agents');
  for (const [name, profile] of [['customer-researcher', 'static-analysis-read-only'], ['customer-evidence-analyst', 'evidence-analysis-read-only']]) {
    const definition = json(`agents/definitions/${name}.json`);
    assert(definition.capability_profile === profile && definition.required_inputs.includes('artifact_root') && definition.required_inputs.includes('research_mode'), `${name}: invalid worker boundary`);
    assert(definition.artifact_policy.repository_writes === 'deny' && !definition.artifact_policy.invent_paths, `${name}: worker cannot write or invent roots`);
    assert(JSON.stringify([...definition.skills].sort()) === JSON.stringify(methods.filter((m) => m[3] === name).map((m) => m[1]).sort()), `${name}: method ownership differs from routes`);
  }
  for (const file of files) {
    for (const [, target] of read(file).matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#')) continue;
      resolve(path.posix.normalize(path.posix.join(path.posix.dirname(file), target.split('#')[0])), { expectedType: 'file' });
    }
  }
  const acquisitions = catalogs.mcpContracts.filter(({ registryEntry: e }) => e.workflows['customer-backward-pro']);
  assert(JSON.stringify(acquisitions.map(({ registryEntry: e }) => e.name).sort()) === '["exa","firecrawl"]', 'Customer acquisition must reuse only Firecrawl and Exa');
  for (const { registryEntry: entry } of acquisitions) assert(JSON.stringify(entry.workflows['customer-backward-pro']) === '[2]', 'Customer acquisition belongs to Phase 2');
  for (const phase of contract.phases) if (phase.number !== 2) assert(phase.capabilities.length === 0, 'Customer research methods cannot acquire sources directly');
  for (const file of ['scripts/resolve-customer-research-root.mjs', 'scripts/lib/customer-research-packet.mjs', 'scripts/lib/customer-research-operation.mjs', 'scripts/record-workflow-event.mjs', 'scripts/validate-workflow-trace.mjs']) read(file);
  assert(json('schemas/workflow-event/workflow-event.schema.json').properties.workflow.enum.includes('customer-backward-pro'), 'shared trace must accept Customer');
  return { status: 'success', summary: 'Customer Backward Pro command contract is valid', phases: 8, research_methods: 16,
    canonical_agents: 2, main_words: mechanics.mainWords, global_words: mechanics.globalWords,
    context_budget_scope: mechanics.contextBudgetScope, artifacts: ['commands/customer-backward-pro.md', 'commands/customer-backward-pro/contract.json'] };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(validateCustomerCommand(), null, 2)); }
  catch (error) { console.log(JSON.stringify({ status: 'error', summary: error.message }, null, 2)); process.exitCode = 1; }
}
