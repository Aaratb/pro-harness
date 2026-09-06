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
  const contract = json('commands/outcome-pro/contract.json');
  const catalogs = buildCommandCatalogs({ harnessRoot: root, skillManifest: json('skills/resolution-manifest.json'), mcpRegistry: json('mcps/registry.json') });
  const main = read('commands/outcome-pro.md');
  const globalTexts = contract.global_context.map(read);
  const skills = ['outcome-pro', 'outcome-analysis', 'outcome-evidence-audit', 'outcome-independent-challenge'];
  const referenceFiles = ['skills/outcome-pro/references', 'skills/outcome-analysis/references'].flatMap((folder) =>
    fs.readdirSync(resolve(folder, { expectedType: 'directory' })).map((file) => `${folder}/${file}`));
  const files = [...contract.global_context, ...contract.phases.map(({ file }) => 'commands/outcome-pro/' + file),
    ...skills.map((name) => `skills/${name}/SKILL.md`), ...referenceFiles];
  const bundle = files.map(read).join('\n');
  const mechanics = validateCommandMechanics({ contract, phaseCount: 4, commandRoot: path.join(root, 'commands/outcome-pro'),
    // Allow the requested opening roadmap/choice without cutting analytical methods.
    phaseBasePath: 'commands/outcome-pro', read, mainText: main, globalTexts, mainWordBudget: 1300, mainLineBudget: 140,
    activeWordBudget: 2450, phaseHeading: (phase) => `# Phase ${phase.number} — ${phase.name}\n`, catalogs,
    forbidden: { text: bundle, label: 'Outcome Pro canonical bundle', patterns: [/\.agent_docs|\.aw_docs|\bgod-level\b/i,
      /\b(?:gstack|superpowers)\b/i, /app-product:|app-shared:|fork_turns|openai\.yaml|Flow Ship|flow-ship/,
      /\/Users\//, new RegExp(['Updated', 'Personal', 'Harness'].join('-'), 'i')] } });
  assert(contract.command === 'outcome-pro' && contract.phase_count === 4, 'invalid Outcome identity or phase count');
  assert(contract.loading === 'global-once-current-phase-only', 'Outcome must progressively load current phase');
  assert(JSON.stringify(contract.global_context) === JSON.stringify(['commands/outcome-pro.md', 'commands/outcome-pro/routing.md']), 'Outcome global context expanded');
  assert(contract.artifact_root === '$REPO_ROOT/.agents/outcomes/<run-id>', 'Outcome artifacts must remain repository-owned');
  assert(JSON.stringify(contract.modes.default) === '[1,2,3,4]', 'Outcome default phase ordering changed');
  assert(referenceFiles.length === 5, 'Outcome depth must remain consolidated into five references');
  assert(JSON.stringify([...catalogs.skills].filter((name) => name.startsWith('outcome-')).sort()) === JSON.stringify([...skills].sort()), 'Outcome must expose exactly four flat skills');
  assert([...catalogs.agents].filter((name) => name.startsWith('outcome-')).length === 1, 'Outcome must reuse one configurable analyst');
  const agent = json('agents/definitions/outcome-analyst.json');
  assert(agent.capability_profile === 'evidence-analysis-read-only' && agent.required_inputs.includes('analysis_focus') && agent.required_inputs.includes('artifact_root'), 'Outcome worker boundary is incomplete');
  assert(agent.artifact_policy.repository_writes === 'deny' && agent.artifact_policy.invent_paths === false, 'Outcome workers cannot write or invent artifact roots');
  for (const file of files) {
    for (const [, target] of read(file).matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#')) continue;
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), target.split('#')[0]));
      resolve(relative, { expectedType: 'file' });
    }
  }
  for (const required of ['causal_claim: false', 'INSUFFICIENT_EVIDENCE', 'evidence_gap', 'source-to-claim', 'two credible alternatives',
    'opportunity cost', 'falsifier', 'independent challenge not performed', 'author rationale, confidence, desired verdict', 'Review first',
    'readFileNoFollow', 'ARITHMETIC_ONLY', 'no state/resume engine']) {
    assert(bundle.toLowerCase().includes(required.toLowerCase()), `Outcome lost required behavior: ${required}`);
  }
  for (const script of ['resolve-outcome-root.mjs', 'validate-outcome-report.mjs', 'verify-outcome-calculations.mjs', 'record-workflow-event.mjs', 'validate-workflow-trace.mjs']) read('scripts/' + script);
  read('schemas/outcome-pro/report.schema.json');
  assert(json('schemas/workflow-event/workflow-event.schema.json').properties.workflow.enum.includes('outcome-pro'), 'shared trace must accept Outcome Pro');
  console.log(JSON.stringify({ status: 'success', summary: 'Outcome Pro command contract is valid', phases: 4, new_skills: 4,
    main_words: mechanics.mainWords, global_words: mechanics.globalWords, artifacts: ['commands/outcome-pro.md', 'commands/outcome-pro/contract.json'],
    next_actions: ['Run Outcome arithmetic, report, repository-root and distribution behavior checks.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Repair the scoped Outcome command contract before running it.'] }, null, 2));
  process.exitCode = 1;
}
