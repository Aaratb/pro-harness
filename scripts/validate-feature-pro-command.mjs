#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, validateCommandMechanics } from './lib/command-validation.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(scriptDirectory, '..');
const commandRoot = path.join(harnessRoot, 'commands', 'feature-pro');
const readCache = new Map();
const resolveHarnessPath = createExistingContainedPathResolver(harnessRoot);

function read(relativePath) {
  if (!readCache.has(relativePath)) {
    readCache.set(relativePath, fs.readFileSync(resolveHarnessPath(relativePath, { expectedType: 'file' }), 'utf8'));
  }
  return readCache.get(relativePath);
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectBundleMarkdown() {
  const files = ['commands/feature-pro.md', 'commands/feature-pro/governance.md', 'commands/feature-pro/routing.md'];
  const phaseRoot = resolveHarnessPath('commands/feature-pro/phases', { expectedType: 'directory' });
  for (const name of fs.readdirSync(phaseRoot).filter((entry) => entry.endsWith('.md')).sort()) {
    files.push(path.posix.join('commands', 'feature-pro', 'phases', name));
  }
  return { files, text: files.map((file) => read(file)).join('\n') };
}

const main = read('commands/feature-pro.md');
const contract = readJson('commands/feature-pro/contract.json');
const reconciliation = readJson('commands/feature-pro/reconciliation.json');
const stateExample = readJson('commands/feature-pro/state.example.json');
const workflowEventSchema = readJson('schemas/workflow-event/workflow-event.schema.json');
const skillManifest = readJson('skills/resolution-manifest.json');
const mcpRegistry = readJson('mcps/registry.json');
const { files: bundleFiles, text: bundleText } = collectBundleMarkdown();
const parityText = `${bundleText}\n${JSON.stringify(contract)}`;

assert(contract.schema_version === 1, 'contract schema_version must be 1');
assert(contract.command === 'feature-pro', 'contract command must be feature-pro');
assert(contract.identity === 'Pro-Level Feature Developer', 'Feature Pro identity is not canonical');
assert(contract.phase_count === 20, 'Feature Pro must declare 20 phases');
assert(contract.loading === 'global-once-current-phase-only', 'Feature Pro must load global contracts once and only the current phase thereafter');
assert(JSON.stringify(contract.global_context) === JSON.stringify([
  'commands/feature-pro.md',
  'commands/feature-pro/governance.md',
  'commands/feature-pro/routing.md',
]), 'Feature Pro global context is incomplete or reordered');
assert(reconciliation.status === 'reconciled-with-approved-normalizations', 'Feature Pro source reconciliation is incomplete');
assert(reconciliation.phase_map.length === contract.phase_count, 'Feature Pro reconciliation does not cover every phase');
assert(/^# \/feature-pro — Pro-Level Feature Developer$/m.test(main), 'main command must use the Pro-Level Feature Developer title');

const catalogs = buildCommandCatalogs({ harnessRoot, skillManifest, mcpRegistry });
for (const { registryEntry } of catalogs.mcpContracts) {
  assert((registryEntry.workflows?.['feature-pro'] ?? []).every((phase) => Number.isInteger(phase) && phase >= 1 && phase <= 20), `${registryEntry.name}: MCP Feature Pro routes must use whole-number phases 1-20`);
}

const { expectedNumbers, mainWords, mainLines } = validateCommandMechanics({
  contract,
  phaseCount: 20,
  commandRoot,
  phaseBasePath: 'commands/feature-pro',
  read,
  mainText: main,
  globalTexts: contract.global_context.map((file) => read(file)),
  mainWordBudget: 2500,
  mainLineBudget: 300,
  // Includes the requested opening choice and all 20 phase purposes; depth is unchanged.
  activeWordBudget: 5900,
  phaseHeading: (phase) => `# Phase ${phase.number}: ${phase.name}\n`,
  catalogs,
  phaseIndex: { text: main, entry: (phase) => `feature-pro/${phase.file}` },
  forbidden: {
    text: bundleText,
    label: 'Feature Pro bundle',
    patterns: [
      /\b(?:GOD-LEVEL|god-level)\b/i,
      /\bGOD-LEVEL ORCHESTRATOR\b/i,
      /\bPhase\s+(?:3\.5|7\.5|7\.6)\b/i,
      /\b(?:3\.5|7\.5|7\.6)\b/,
      /\b17-phase\b/i,
      /\bPhase\s+\d+\/17\b/i,
      /\.agent_docs|\.aw_docs/i,
      /\bgstack\b|\bsuperpowers\b/i,
      /\bTask tool calls?\b/i,
    ],
  },
});

const stateNumbers = Object.keys(stateExample.phases).map(Number);
assert(JSON.stringify(stateNumbers) === JSON.stringify(expectedNumbers), 'state example must contain exactly phases 1 through 20');
assert(Number.isInteger(stateExample.current_phase) && stateExample.current_phase >= 1 && stateExample.current_phase <= 20, 'state example current_phase is invalid');
assert(Object.hasOwn(stateExample, 'architecture_handoff_intake'), 'state example must use architecture_handoff_intake');
assert(!Object.hasOwn(stateExample, 'architecture_pro_intake'), 'state example retains obsolete architecture_pro_intake');
for (const field of ['business_requirement', 'product_solution', 'verification_contract', 'product_observability', 'ai_delivery', 'workflow_trace']) {
  assert(Object.hasOwn(stateExample, field), `state example missing ${field}`);
}
assert(workflowEventSchema.$schema?.includes('2020-12'), 'workflow event schema must use JSON Schema 2020-12');
assert(workflowEventSchema.properties.schema_version.const === 'pro-harness/workflow-event@1', 'workflow event schema version is invalid');

for (const requiredText of [
  'resolve-feature-root.sh',
  'generate-artifact-companion.mjs',
  'validate-artifact-companion.mjs',
  'validate-architecture-handoff.mjs',
  'record-workflow-event.mjs',
  'validate-workflow-trace.mjs',
  'split-large-pull-request',
  'firecrawl.search',
  'diagram.render',
  'messaging.send',
  'slack-handoff.md',
]) assert(parityText.includes(requiredText), `Feature Pro bundle lost required contract ${requiredText}`);

assert(bundleFiles.length === 23, `expected 23 Markdown files in Feature Pro bundle, found ${bundleFiles.length}`);
console.log(`Feature Pro command valid: 20 phases, ${catalogs.agents.size} agent routes, ${catalogs.skills.size} resolvable skills, ${catalogs.capabilities.size} MCP capabilities; main ${mainWords} words/${mainLines} lines, active context <=5900 words`);
