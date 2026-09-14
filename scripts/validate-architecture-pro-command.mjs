#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commandRoot = path.join(harnessRoot, 'commands', 'architecture-pro');
const readCache = new Map();
const resolveHarnessPath = createExistingContainedPathResolver(harnessRoot);
const harnessFile = (relativePath) => resolveHarnessPath(relativePath, { expectedType: 'file' });
const read = (relativePath) => {
  if (!readCache.has(relativePath)) {
    readCache.set(relativePath, fs.readFileSync(harnessFile(relativePath), 'utf8'));
  }
  return readCache.get(relativePath);
};
const readJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const main = read('commands/architecture-pro.md');
const routing = read('commands/architecture-pro/routing.md');
const governance = read('skills/architecture-pro-governance/SKILL.md');
const contract = readJson('commands/architecture-pro/contract.json');
const reconciliation = readJson('commands/architecture-pro/reconciliation.json');
const stateExample = readJson('commands/architecture-pro/state.example.json');
const policy = readJson('config/architecture-pro.json');
const skillManifest = readJson('skills/resolution-manifest.json');
const mcpRegistry = readJson('mcps/registry.json');
const workflowSchema = readJson('schemas/workflow-event/workflow-event.schema.json');
const hooks = readJson('hooks/registry.json');

assertJsonSchema(policy, harnessFile('schemas/architecture-pro/policy.schema.json'), 'architecture policy');
assertJsonSchema(stateExample, harnessFile('schemas/architecture-pro/state.schema.json'), 'architecture state example');
assertJsonSchema(hooks, harnessFile('hooks/schema/registry.schema.json'), 'hook registry');
assert(contract.schema_version === 1 && contract.command === 'architecture-pro', 'invalid Architecture Pro contract identity');
assert(contract.identity === 'Pro-Level System Architect', 'invalid Architecture Pro identity');
assert(contract.phase_count === 13, 'Architecture Pro must have 13 phases');
assert(contract.loading === 'global-once-current-phase-only', 'Architecture Pro must use progressive phase loading');
assert(JSON.stringify(contract.global_context) === JSON.stringify([
  'commands/architecture-pro.md',
  'skills/architecture-pro-governance/SKILL.md',
  'commands/architecture-pro/routing.md',
]), 'Architecture Pro global context is incomplete or reordered');
assert(contract.artifact_root === '$PROJECT_ROOT/architecture/<architecture-slug>', 'invalid repository artifact root');
assert(reconciliation.status === 'reconciled-with-approved-normalizations', 'source reconciliation is incomplete');
assert(reconciliation.phase_map.length === 13, 'reconciliation must map every phase');
assert(!Object.hasOwn(reconciliation.source_snapshot, 'path'), 'reconciliation must not expose a migration source path');

const catalogs = buildCommandCatalogs({ harnessRoot, skillManifest, mcpRegistry });
const migrationName = new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i');
const machinePath = new RegExp(['/','Users','/'].join(''));
const bundle = [main, routing, governance, ...contract.phases.map(({ file }) => read(path.posix.join('commands/architecture-pro', file)))].join('\n');
const { expectedNumbers, mainWords, mainLines } = validateCommandMechanics({
  contract,
  phaseCount: 13,
  commandRoot,
  phaseBasePath: 'commands/architecture-pro',
  read,
  mainText: main,
  globalTexts: [main, routing, governance],
// Budgets are a derived FLOOR, never a cut: activeWordBudget = global_context (3437) + largest phase (747) + 600 words of working room.
// Raised 2026-09-10 after a commit tripped three checks at once because every phase sat within a few words of its ceiling.
// scripts/check-budget-headroom.mjs warns below 300 words; re-derive these if global_context or the largest phase grows.
  mainWordBudget: 1704,
  mainLineBudget: 220,
  activeWordBudget: 4784,
  phaseHeading: (phase) => `# Phase ${phase.number} — ${phase.name}\n`,
  catalogs,
  forbidden: {
    text: bundle,
    label: 'Architecture Pro bundle',
    patterns: [/\.agent_docs|\.aw_docs/i, /\b(?:god-level|gstack|superpowers)\b/i, migrationName, machinePath, /\bPhase\s+\d+\.\d+\b/i],
  },
});

const expectedModes = {
  audit: [1, 2, 3, 4, 5, 6, 11, 12, 13],
  design: [1, 2, 7, 8, 9, 10, 11, 12, 13],
  mixed: expectedNumbers,
  'adr-only': [1, 2, 7, 8, 9, 10],
};
assert(JSON.stringify(contract.modes) === JSON.stringify(expectedModes), 'mode paths differ from the 13-phase contract');
assert(Object.keys(stateExample.phases).join(',') === expectedNumbers.join(','), 'state example must contain exactly phases 1 through 13');
assert(workflowSchema.properties.workflow.enum.includes('architecture-pro'), 'shared workflow trace does not route Architecture Pro');
assert(hooks.hooks.some(({ workflow, event }) => workflow === 'architecture-pro' && event === 'before-phase-transition'), 'Architecture Pro transition hook is missing');
assert(hooks.hooks.some(({ workflow, event }) => workflow === 'architecture-pro' && event === 'before-run-completion'), 'Architecture Pro completion hook is missing');
for (const helper of ['resolve-architecture-root.mjs', 'architecture-source.mjs', 'architecture-run.mjs', 'validate-architecture-pro-run.mjs', 'validate-architecture-handoff.mjs']) {
  assert(fs.existsSync(path.join(harnessRoot, 'scripts', helper)), `missing Architecture Pro Node helper ${helper}`);
}

const schemaRoot = path.join(harnessRoot, 'schemas', 'architecture-pro');
for (const name of ['common', 'policy', 'state', 'consent-receipt', 'evidence', 'evidence-manifest', 'finding', 'decision', 'contract', 'lane-report', 'probe-plan', 'probe-registry']) {
  const schema = readJson(path.posix.join('schemas/architecture-pro', `${name}.schema.json`));
  assert(schema.$schema?.includes('2020-12'), `${name}: schema must use JSON Schema 2020-12`);
}
assert(!fs.existsSync(path.join(schemaRoot, 'handoff.schema.json')), 'Architecture Pro must use the shared handoff schema');

const focuses = policy.security_routes.map(({ focus }) => focus);
assert(policy.security_routes.every(({ agent, skill, profile }) => agent === 'security-reviewer' && skill === 'architecture-security-review' && profile === 'static-analysis-read-only'), 'security routes must use the consolidated reviewer contract');
assert(new Set(focuses).size === focuses.length && focuses.length === 5, 'security focus contracts must be unique and complete');
for (const lane of policy.lanes) assert(catalogs.agents.has(lane.agent), `policy lane ${lane.id}: unresolved agent ${lane.agent}`);
for (const required of ['fresh capability-equivalent instance', 'credible viable options', 'option_scope', 'fresh independent challenger', 'weights totaling 100', 'decision reopen', 'DESIGN_CERTIFIED', 'run-events.jsonl', 'digest-bound consent', 'diagram.render', 'single validation entry point', 'architecture-run.mjs']) {
  assert(bundle.toLowerCase().includes(required.toLowerCase()), `Architecture Pro bundle lost required behavior: ${required}`);
}
assert(!/stop blocked if three credible shapes|produce three viable shapes or record a blocker/i.test(bundle), 'Architecture Pro reintroduced obsolete option-count blocking');
const deepDesign = contract.phases.find(({ number }) => number === 9);
for (const skill of ['architecture-distributed-consistency', 'architecture-concurrency-and-overload', 'architecture-data-recovery', 'architecture-capacity-and-tuning']) {
  assert(!deepDesign.required_skills.includes(skill) && deepDesign.optional_skills.includes(skill), `${skill} must remain available as evidence-triggered depth`);
  assert(read('commands/architecture-pro/phases/09-deep-design.md').includes(skill), `${skill} lacks a current-phase routing trigger`);
}

const diagramMethod = read('skills/architecture-explanation-diagrams/SKILL.md');
const visualGuide = read('docs/architecture-visuals.md');
for (const number of [2, 7, 9, 12]) {
  const phase = contract.phases.find((entry) => entry.number === number);
  assert(phase.required_skills.includes('architecture-explanation-diagrams'), `Phase ${number}: rendered architecture method is not routed`);
  assert(phase.capabilities.includes('diagram.render'), `Phase ${number}: optional external rendering route is missing`);
  const text = read(path.posix.join('commands/architecture-pro', phase.file));
  assert(text.includes('architecture-explanation-diagrams') && /rendered/i.test(text), `Phase ${number}: rendered checkpoint is not explicit`);
}
for (const label of ['EXISTING', 'NEW', 'CHANGED', 'PROPOSED REMOVAL']) assert(diagramMethod.includes(label), `diagram method lost change status ${label}`);
assert(/nodes.*edges/.test(diagramMethod) && /unchanged components.*changed relationship/.test(diagramMethod), 'diagram method must classify relationships independently from nodes');
assert(/colour-independent legend/.test(diagramMethod) && /inference.*separate/.test(diagramMethod), 'diagram method must distinguish accessible change notation from evidence confidence');
assert(!/Local Mermaid source is sufficient|visually or textually distinct/i.test(diagramMethod), 'diagram method permits source-only or prose-only visual delivery');
assert(diagramMethod.includes('docs/architecture-visuals.md'), 'diagram method must load its local rendering guide');
for (const marker of ['generate-artifact-companion.mjs', 'validate-artifact-companion.mjs', '--profile architecture', '--render-diagrams', 'state.artifact_digests']) assert(visualGuide.includes(marker), `architecture visual guide lost ${marker}`);
assert(/EXPLAIN\.html/.test(read('commands/architecture-pro/phases/12-walkthrough.md')), 'walkthrough must deliver its rendered companion');
assert(/ADR-only.*rendered views/.test(read('commands/architecture-pro/phases/10-design-certification.md')), 'ADR-only must retain its early rendered views without adding Phase 12');
const diagramManifest = skillManifest.skills.find(({ name }) => name === 'architecture-explanation-diagrams');
assert(diagramManifest && !/optional rendered/i.test(diagramManifest.output) && diagramManifest.output.includes('EXPLAIN.html'), 'diagram manifest must agree with rendered delivery');

console.log(`Architecture Pro command valid: 13 phases, ${policy.lanes.length} architecture lanes, ${focuses.length} security focus routes, ${catalogs.skills.size} resolvable skills; main ${mainWords} words/${mainLines} lines, command-shell context <=${4784} words (excludes routed skill and agent payloads)`);
