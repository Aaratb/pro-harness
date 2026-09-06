#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolve = createExistingContainedPathResolver(root);
const read = (file) => fs.readFileSync(resolve(file, { expectedType: 'file' }), 'utf8');
const json = (file) => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const contract = json('commands/debug-pro/contract.json');
  const reconciliation = json('commands/debug-pro/reconciliation.json');
  const skillManifest = json('skills/resolution-manifest.json');
  const mcpRegistry = json('mcps/registry.json');
  const catalogs = buildCommandCatalogs({ harnessRoot: root, skillManifest, mcpRegistry });
  const main = read('commands/debug-pro.md');
  const globalTexts = contract.global_context.map(read);
  const references = fs.readdirSync(path.join(root, 'skills/debug-core/references')).map((file) => read('skills/debug-core/references/' + file));
  const bundle = [...globalTexts, ...contract.phases.map(({ file }) => read('commands/debug-pro/' + file)), ...references, read('skills/debug-pro/SKILL.md')].join('\n');
  const mechanics = validateCommandMechanics({ contract, phaseCount: 13, commandRoot: path.join(root, 'commands/debug-pro'), phaseBasePath: 'commands/debug-pro',
    read, mainText: main, globalTexts, mainWordBudget: 1400, mainLineBudget: 180, activeWordBudget: 3600,
    phaseHeading: (phase) => `# Phase ${phase.number} — ${phase.name.replaceAll(' and ', ' & ')}\n`, catalogs,
    forbidden: { text: bundle, label: 'Debug Pro canonical bundle', patterns: [/\.agent_docs|\.aw_docs|\bgod-level\b/i, /\b(?:gstack|superpowers)\b/i,
      /\/Users\//, /\bPhase\s+(?:0\b|\d+\.\d+)/, new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i')] } });
  assert(contract.command === 'debug-pro' && contract.phase_count === 13, 'invalid Debug command identity or phase count');
  assert(contract.loading === 'global-once-current-phase-only', 'Debug must progressively load current phase');
  assert(JSON.stringify(contract.global_context) === JSON.stringify(['commands/debug-pro.md', 'skills/debug-core/SKILL.md', 'commands/debug-pro/routing.md']), 'Debug global context must remain minimal');
  assert(contract.artifact_root === '$REPO_ROOT/.agents/debug/<debug-slug>', 'Debug output must be repository-owned');
  for (const mode of ['adaptive', 'deep', 'fast']) assert(JSON.stringify(contract.modes[mode]) === JSON.stringify(mechanics.expectedNumbers), `${mode} must preserve stage order`);
  assert(JSON.stringify(contract.modes['observe-only']) === '[1,2,3,4,5,13]', 'observe-only must not enter active reproduction or repair');
  for (const name of ['debug-pro', 'debug-core']) assert(catalogs.skills.has(name), `missing Debug skill: ${name}`);
  assert(references.length === 3 && fs.readdirSync(path.join(root, 'schemas/debug-pro')).length === 1, 'Debug must not add redundant reference or historical schema families');
  assert(json('schemas/debug-pro/resolution.schema.json').allOf[0].$ref === '../review-pro/debug-resolution-input.schema.json#/$defs/nested', 'Debug must reuse the existing nested resolution wire contract');
  assert(reconciliation.status === 'reconciled-with-approved-adaptive-depth' && reconciliation.phase_map.length === 13 && !('path' in reconciliation.source_snapshot), 'source reconciliation is incomplete or exposes a migration path');
  for (const { source, target } of reconciliation.phase_map) assert(target === source + 1, 'source stage ordering changed');
  for (const reference of ['evidence.md', 'causal-experiments.md', 'repair-and-handoff.md']) assert(globalTexts[1].includes(reference), `missing lazy reference route ${reference}`);
  for (const required of ['DEBUG_REPORT.md', 'run-events.jsonl', 'resolution.json', 'matching RED', 'fresh process', 'three failed', 'positive control', 'redact', 'SPEC_DECISION_REQUIRED', 'ARCHITECTURE_DECISION_REQUIRED', 'NEW_CAPABILITY_REQUIRED']) {
    assert(bundle.toLowerCase().includes(required.toLowerCase()), `Debug lost required behavior: ${required}`);
  }
  assert(json('hooks/registry.json').hooks.some(({ workflow, event }) => workflow === 'debug-pro' && event === 'before-run-completion'), 'Debug completion hook is missing');
  assert(json('schemas/workflow-event/workflow-event.schema.json').properties.workflow.enum.includes('debug-pro'), 'shared trace does not accept Debug Pro');
  for (const script of ['resolve-debug-root.mjs', 'debug-context.mjs', 'validate-debug-resolution.mjs', 'validate-workflow-trace.mjs']) read('scripts/' + script);
  console.log(JSON.stringify({ status: 'success', summary: 'Debug Pro command contract is valid', phases: 13, new_skills: 2,
    main_words: mechanics.mainWords, global_words: mechanics.globalWords, artifacts: ['commands/debug-pro.md', 'commands/debug-pro/contract.json'],
    next_actions: ['Run Debug behavior, Review compatibility and isolated distribution tests.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair the scoped Debug command contract before running it.'] }, null, 2));
  process.exitCode = 1;
}
