#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandCatalogs, measureLoadedContext, validateCommandMechanics } from './lib/command-validation.mjs';
import { createExistingContainedPathResolver } from './lib/repository-paths.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commandRoot = path.join(harnessRoot, 'commands', 'workspace-learning-pro');
const resolveHarnessPath = createExistingContainedPathResolver(harnessRoot);
const read = relative => fs.readFileSync(resolveHarnessPath(relative, { expectedType: 'file' }), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const main = read('commands/workspace-learning-pro.md');
  const routing = read('commands/workspace-learning-pro/routing.md');
  const core = read('skills/workspace-learning-core/SKILL.md');
  const entry = read('skills/workspace-learning-pro/SKILL.md');
  const artifactState = read('skills/workspace-learning-core/references/artifact-and-state.md');
  const interrogation = read('skills/workspace-learning-core/references/external-interrogation.md');
  const publication = read('skills/workspace-learning-core/references/course-publication.md');
  const contract = json('commands/workspace-learning-pro/contract.json');
  const skillManifest = json('skills/resolution-manifest.json');
  const mcpRegistry = json('mcps/registry.json');
  const codeQaCapability = json('mcps/code-qa/capability.json');
  const adapterCapabilities = json('agents/adapters/capabilities.json').capabilities;
  const catalogs = buildCommandCatalogs({ harnessRoot, skillManifest, mcpRegistry });
  const phaseTexts = contract.phases.map(phase => read(`commands/workspace-learning-pro/${phase.file}`));
  const result = validateCommandMechanics({
    contract,
    phaseCount: 8,
    commandRoot,
    phaseBasePath: 'commands/workspace-learning-pro',
    read,
    mainText: main,
    globalTexts: [main, core, routing],
// Budgets are a derived FLOOR, never a cut: activeWordBudget = global_context (2779) + largest phase (1417) + 600 words of working room.
// Raised 2026-09-10 after a commit tripped three checks at once because every phase sat within a few words of its ceiling.
// scripts/check-budget-headroom.mjs warns below 300 words; re-derive these if global_context or the largest phase grows.
    mainWordBudget: 1906,
    mainLineBudget: 180,
    activeWordBudget: 5487,
    phaseHeading: phase => `# Phase ${phase.number} — ${phase.name}`,
    catalogs,
    phaseIndex: { text: main, entry: phase => `${phase.number}. ${phase.name}` },
  });

  const mandatoryReferencesByPhase = new Map([
    [1, ['skills/workspace-learning-core/references/artifact-and-state.md']],
    [2, ['skills/workspace-learning-core/references/external-interrogation.md']],
    [3, ['skills/workspace-learning-core/references/external-interrogation.md']],
    [4, ['skills/workspace-learning-core/references/external-interrogation.md']],
    [6, ['skills/workspace-learning-core/references/course-publication.md']],
    [8, [
      'skills/workspace-learning-core/references/artifact-and-state.md',
      'skills/workspace-learning-core/references/course-publication.md',
    ]],
  ]);
  const phaseContextMeasurements = contract.phases.map(phase => measureLoadedContext({
    harnessRoot,
    files: [
      ...contract.global_context,
      `commands/workspace-learning-pro/${phase.file}`,
      ...(mandatoryReferencesByPhase.get(phase.number) ?? []),
    ],
  }));
  const maxMandatoryContext = Math.max(...phaseContextMeasurements.map(measurement => measurement.words));
  // Derived FLOOR, same rule as the other budgets: measured peak + 600 words of working
  // room. This counts global_context + the phase file + that phase's mandatory reference
  // documents, so it moves whenever a reference grows — re-derive rather than trimming a
  // reference to fit.
  assert(maxMandatoryContext <= 7851, `mandatory Workspace Learning phase context exceeds 7851-word budget: ${maxMandatoryContext}`);

  const canonical = [main, routing, core, entry, artifactState, interrogation, publication, JSON.stringify(contract), ...phaseTexts].join('\n');
  assert(contract.identity === 'Workspace-Wide Repository Learning Coordinator', 'unexpected command identity');
  assert(contract.phase_count === 8, 'workspace learning must have eight phases');
  assert(contract.artifact_root === '$REPO_ROOT/.agents/repository-learning', 'repository learning root changed');
  assert(contract.workspace_state_root === '$WORKSPACE_ROOT/.workspace-learning', 'workspace state root changed');
  assert(contract.global_context.join('|') === ['commands/workspace-learning-pro.md', 'skills/workspace-learning-core/SKILL.md', 'commands/workspace-learning-pro/routing.md'].join('|'), 'global context must stay minimal and ordered');
  for (const name of ['workspace-learning-pro', 'workspace-learning-core']) assert(catalogs.skills.has(name), `unresolved skill ${name}`);
  for (const pathName of ['/.workspace-learning/', '/.agents/explanations/', '/.agents/repository-learning/', '/.codemaps/']) {
    assert(canonical.includes(pathName), `missing exact local-only path contract ${pathName}`);
  }
  for (const phrase of ['$docs_publisher', 'explainer-pro', 'workspace-codemap-pro', 'two consecutive', 'no-material-novelty']) {
    assert(canonical.toLowerCase().includes(phrase.toLowerCase()), `missing required workflow contract: ${phrase}`);
  }
  const codeQaOperations = ['ask', 'continue_task', 'get_task', 'get_task_logs', 'cancel_task', 'health', 'list_conversations'];
  const codeQaCapabilities = codeQaOperations.map(operation => `code-qa.${operation}`);
  const codeQaTransport = [main, routing, core, interrogation, phaseTexts[0], phaseTexts[2], JSON.stringify(contract), JSON.stringify(codeQaCapability)].join('\n');
  for (const operation of codeQaOperations) {
    assert(codeQaTransport.includes(`\`${operation}\``) || codeQaTransport.includes(operation), `missing native CodeQA MCP operation: ${operation}`);
  }
  const codeQaRegistry = mcpRegistry.contracts.find(({ name }) => name === 'code-qa');
  assert(codeQaRegistry?.path === 'code-qa/capability.json', 'CodeQA MCP capability is not registered');
  assert(codeQaRegistry?.requirement === 'required-native-only-for-workspace-learning-interrogation', 'CodeQA MCP registry must require native-only Workspace Learning interrogation');
  assert(JSON.stringify(codeQaRegistry.workflows?.['workspace-learning-pro']) === JSON.stringify([1, 3]), 'CodeQA MCP must route to Workspace Learning phases 1 and 3');
  assert(codeQaCapability.transport === 'adapter-resolved', 'CodeQA transport must be adapter-resolved');
  assert(JSON.stringify(codeQaCapability.launch?.provider_candidates) === JSON.stringify(['runtime-native-code-qa-mcp']), 'CodeQA must expose runtime-native MCP as its sole provider candidate');
  assert(JSON.stringify(Object.keys(codeQaCapability.capabilities)) === JSON.stringify(codeQaCapabilities), 'CodeQA MCP capability keys must match the exact operations');
  for (const operation of codeQaOperations) {
    const capability = codeQaCapability.capabilities[`code-qa.${operation}`];
    // The canonical capability id is generic; the concrete runtime tool it binds to is
    // site-specific and lives only in the two binding layers. So the invariant is not "the tool
    // is named after the operation" -- it is "exactly one tool is bound, and both binding
    // layers name the same one". That is the property that actually has to hold.
    assert(Array.isArray(capability?.tool_candidates) && capability.tool_candidates.length === 1,
      `CodeQA capability ${operation} must bind exactly one runtime tool`);
    const [boundTool] = capability.tool_candidates;
    assert(typeof boundTool === 'string' && boundTool.length > 0, `CodeQA capability ${operation} has an empty tool binding`);
    assert(!Object.hasOwn(capability, 'cli_fallback'), `CodeQA capability ${operation} must not expose a CLI fallback`);
    const expectedRuntimeBindings = {
      claude: [`CallMcpTool:${boundTool}`],
      codex: [`mcp-tool:${boundTool}`],
      cursor: [`MCP:${boundTool}`],
    };
    for (const [runtime, expected] of Object.entries(expectedRuntimeBindings)) {
      assert(JSON.stringify(adapterCapabilities[`code-qa.${operation}`]?.[runtime]) === JSON.stringify(expected), `${runtime} must bind ${operation} to native MCP only`);
    }
  }
  for (const phaseNumber of [1, 3]) assert(JSON.stringify(contract.phases[phaseNumber - 1].capabilities) === JSON.stringify(codeQaCapabilities), `Phase ${phaseNumber} must require every CodeQA lifecycle capability`);
  for (const skillName of ['workspace-learning-pro', 'workspace-learning-core']) {
    const skill = skillManifest.skills.find(({ name }) => name === skillName);
    assert(JSON.stringify(skill?.capabilities) === JSON.stringify(codeQaCapabilities), `${skillName} must resolve every CodeQA lifecycle capability`);
  }
  assert(/native CodeQA MCP[^\n]{0,180}sole transport/i.test(codeQaTransport), 'native CodeQA MCP must be the sole transport for new work');
  assert(/runtime-authenticated identity/i.test(codeQaTransport), 'MCP must use runtime-authenticated identity');
  assert(/never request or pass a desktop auth token, user ID/i.test(codeQaTransport), 'MCP must forbid a desktop auth token and user ID injection');
  assert(/unavailable, unhealthy, or missing[^\n]{0,180}preserve[^\n]{0,180}state/i.test(codeQaTransport), 'missing or unhealthy native MCP must preserve state');
  assert(/Phase 3 blocker|blocks Phase 3/i.test(codeQaTransport), 'missing or unhealthy native MCP must block Phase 3');
  assert(/pre-existing legacy CLI task[^\n]{0,220}(?:observed|inspected)[^\n]{0,80}read-only|pre-existing legacy CLI task[^\n]{0,220}read-only/i.test(codeQaTransport), 'legacy CLI access must be observation-only');
  assert(/never (?:create|use CLI to create)[^\n]{0,120}(?:continue|continued)[^\n]{0,120}(?:resume|resumed)[^\n]{0,120}(?:cancel|cancelled)[^\n]{0,120}(?:recover|recovered)/i.test(codeQaTransport), 'legacy CLI must not authorize creation, continuation, resume, cancellation, or recovery');
  assert(/Workspace Learning Pro has switched to native CodeQA MCP; the legacy CLI task will not be resumed\./i.test(codeQaTransport), 'legacy-to-MCP transition must be explicit to the user');
  assert(!JSON.stringify(codeQaCapability).includes('code-qa-cli-fallback'), 'CodeQA capability must not contain a CLI fallback provider');
  assert(!JSON.stringify(adapterCapabilities).includes('code-qa-cli-fallback'), 'runtime adapters must not contain CodeQA CLI fallback candidates');
  assert(/MCP `ask` has no branch field/i.test(codeQaTransport), 'MCP branch-field limitation must be explicit');
  assert(/requested branch,? and expected (?:commit )?SHA/i.test(codeQaTransport), 'MCP prompt must carry requested branch and expected SHA');
  assert(/unprovable parity[^\n]{0,80}(?:mismatch|bounded limitation)/i.test(codeQaTransport) || /unprovable checkout\/ref parity is a mismatch and bounded limitation/i.test(codeQaTransport), 'unprovable MCP ref parity must remain a mismatch/bounded limitation');
  assert(/Exact-ref uncertainty never authorizes another transport/i.test(codeQaTransport), 'exact-ref uncertainty must remain a bounded MCP limitation');
  const phaseThree = phaseTexts[2];
  const restoreIndex = phaseThree.indexOf('Before any CodeQA creation call, load the persisted Phase 3 task');
  const creationIndex = phaseThree.indexOf('For a new or recovered MCP generation, reserve then call `ask` once');
  assert(restoreIndex >= 0 && creationIndex > restoreIndex, 'Phase 3 must restore persisted CodeQA identity before task creation');
  assert(!/For MCP, start a fresh task with `ask`/.test(phaseThree), 'Phase 3 must not unconditionally create a fresh MCP task');
  assert(/phase re-entry, compaction[^\n]{0,120}never authorizes a second dispatch/.test(phaseThree), 'Phase 3 must forbid duplicate dispatch on resume');
  assert(/Create a fresh MCP task only without an active task or after explicit recovery/.test(phaseThree), 'fresh MCP task creation must require absent identity or explicit recovery');
  assert(/first call `get_task` and `get_task_logs`/.test(phaseThree), 'persisted MCP tasks must be observed before state changes');
  assert(/For `CREATED`, `PENDING`, or `RUNNING`, wait and poll the same task/.test(phaseThree), 'nonterminal persisted MCP tasks must be polled, not duplicated');
  assert(/For `COMPLETED`, checkpoint any previously unrecorded result exactly once/.test(phaseThree), 'completed MCP results must be checkpointed idempotently');
  assert(/For `FAILED` or `CANCELLED`[\s\S]*never create a duplicate task/.test(phaseThree), 'failed or cancelled MCP tasks must not be replaced automatically');
  const pendingRecovery = `${phaseThree}\n${interrogation}`;
  assert(/(?:status or time|Status or elapsed time) alone never (?:authorizes cancellation|proves that a task should be killed)/i.test(pendingRecovery), 'transient PENDING must remain poll-by-default');
  assert(/`get_task` and `get_task_logs`[\s\S]{0,220}stuck[\s\S]{0,220}recursively delegated or spawned agents/i.test(pendingRecovery), 'PENDING cancellation must require task-plus-log evidence of recursive delegation');
  assert(/explicit user authorization[\s\S]{0,120}(?:native `cancel_task`|call native `cancel_task`)/i.test(pendingRecovery), 'PENDING cancellation must be explicit and native-MCP only');
  assert(/persist `CANCELLED` through `codeqa-observe`[\s\S]{0,180}do not dispatch/i.test(pendingRecovery), 'cancellation must be confirmed before replacement dispatch');
  assert(/Do not delegate any part of this investigation, spawn or invoke another agent, or recursively create a CodeQA task[\s\S]{0,180}must perform the repository investigation itself/i.test(pendingRecovery), 'recursive-delegation recovery prompt must require CodeQA self-investigation');
  assert(/`codeqa-reserve --kind recover`[\s\S]{0,160}Call `ask` once[\s\S]{0,160}intent-bound `codeqa-recover`/i.test(pendingRecovery), 'PENDING recovery must preserve reserve-dispatch-bind ordering');
  assert(contract.global_gates.some(gate => /PENDING is poll-by-default/i.test(gate)
    && /task plus get_task_execution_logs evidence|task-plus-log evidence/i.test(gate)
    && /confirmed and checkpointed as CANCELLED/i.test(gate)
    && /prompt forbids recursive agent delegation/i.test(gate)), 'global contract must encode bounded PENDING recovery');
  assert(/PENDING task additionally requires task and execution-log evidence[\s\S]{0,160}never status or elapsed time alone/i.test(JSON.stringify(codeQaCapability)), 'CodeQA cancellation capability must reject transient-PENDING cancellation');
  for (const operation of ['codeqa-status', 'codeqa-reserve', 'codeqa-resolve-intent', 'codeqa-start', 'codeqa-observe', 'codeqa-result', 'codeqa-round', 'codeqa-continue', 'codeqa-recover', 'codeqa-convergence']) {
    assert(phaseThree.includes(operation) || phaseTexts[3].includes(operation), `command does not invoke typed state operation ${operation}`);
  }
  const reserveIndex = phaseThree.indexOf('codeqa-reserve --workspace');
  const dispatchIndex = phaseThree.indexOf('Only after reservation, make the one matching MCP call');
  const bindIndex = phaseThree.indexOf('codeqa-start --workspace');
  assert(reserveIndex >= 0 && dispatchIndex > reserveIndex && bindIndex > dispatchIndex, 'dispatch must be reserved before the external MCP call and task binding');
  assert(/final exact prompt\/comment bytes[^\n]{0,160}intent ID/i.test(phaseThree), 'final prompt bytes must contain the dispatch intent ID');
  assert(/Compute their SHA-256, then reserve before the provider call/i.test(phaseThree), 'exact prompt bytes must be hashed and reserved before dispatch');
  assert(/expected generation `1` for `start`[^\n]*current generation for `continue`[^\n]*current generation plus one for `recover`/i.test(phaseThree), 'dispatch reservation generation rules are missing');
  assert(/`codeqa-start`, `codeqa-continue`, and `codeqa-recover` require the matching `--intent-id`/i.test(phaseThree), 'task binding must require the reserved intent ID');
  assert(/unbound intent[^\n]{0,160}blocks another dispatch, convergence, and Phase 3 completion/i.test(phaseThree), 'an unbound intent must block dispatch and Phase 3/convergence completion');
  assert(/`list_conversations`[^\n]{0,160}`get_task` and `get_task_logs`/i.test(phaseThree), 'unbound intent recovery must use native conversation/task/log lookup');
  assert(/lookup proves no matching task exists[^\n]{0,180}user explicitly authorizes/i.test(phaseThree), 'no-task intent resolution must require provider evidence and user authorization');
  assert(/codeqa-resolve-intent[^\n]*--intent-id[^\n]*--resolution no-task-created[^\n]*--evidence-id[^\n]*--user-authorized true/i.test(phaseThree), 'no-task-created intent resolution interface is incomplete');
  assert(/fail-closed, at-most-one automatic dispatch[^\n]*not exactly-once provider execution/i.test(phaseThree), 'dispatch guarantee must be bounded to at-most-one automatic dispatch');
  assert(/historical MCP checkpoint[^\n]{0,200}reserving then binding|historical MCP checkpoint[^\n]{0,200}reserve and bind/i.test(phaseThree), 'historical MCP import must reserve and bind exact existing tasks');
  assert(/untyped legacy CLI[^\n]*archive-only/i.test(phaseThree), 'untyped legacy CLI state must remain archive-only');
  const typedLoop = phaseThree.slice(phaseThree.indexOf('For each turn, preserve this exact order:'));
  const typedOrder = ['codeqa-observe', 'codeqa-result', 'repository-explorer', 'codeqa-round', 'reserve `continue`', 'continue_task', 'codeqa-continue'];
  for (let index = 1; index < typedOrder.length; index += 1) {
    assert(typedLoop.indexOf(typedOrder[index - 1]) < typedLoop.indexOf(typedOrder[index]), `typed lifecycle order must place ${typedOrder[index - 1]} before ${typedOrder[index]}`);
  }
  assert(/historical MCP checkpoint[^\n]*without external dispatch/i.test(phaseThree), 'historical MCP checkpoints need a reserve-and-bind import path without dispatch');
  assert(/contract-status/i.test(canonical) && /contract-migrate/i.test(canonical), 'versioned legacy contract migration commands are missing');
  assert(/workflow(?: and|\/)artifact contract(?:s| versions)? (?:are|is) version `?2`?|workflow and artifact contract versions are both `2`/i.test(canonical), 'current workflow/artifact contract version is missing');
  assert(/invalidat(?:e|es)[^\n]{0,120}Phases 2–8/i.test(canonical), 'legacy contract migration must invalidate Phases 2–8');
  assert(/DOMAIN-AUTHORITY\.md/i.test(canonical) && /quarantin/i.test(canonical), 'legacy DOMAIN-AUTHORITY references must be quarantined');
  assert(contract.global_gates.some(gate => /resume inspects the task and any dispatch intent before external state change/i.test(gate)), 'global contract must gate resume on task and intent inspection before external mutation');
  assert(/adapter-provided canonical harness root first/i.test(entry), 'bridge skill must prefer adapter-provided HARNESS_ROOT');
  assert(/default to `~\/\.agents`/i.test(entry), 'bridge skill must default HARNESS_ROOT to ~/.agents');
  assert(entry.includes('$HARNESS_ROOT/commands/workspace-learning-pro.md'), 'bridge skill must read the command under HARNESS_ROOT');
  assert(!entry.includes('Read `~/.agents/commands/workspace-learning-pro.md`'), 'bridge skill must not hardcode the default command path');
  assert(/adapter-provided canonical root/i.test(main), 'direct command entry must resolve adapter-provided HARNESS_ROOT');
  assert(main.includes('$HARNESS_ROOT/skills/workspace-learning-core/SKILL.md'), 'direct command entry must root its core-skill read');
  assert(/required canonical file is unavailable, stop and report the exact resolved path/i.test(main), 'direct command entry must fail closed on missing canonical files');
  assert(/Do not edit `\.gitignore`/i.test(canonical), 'tracked ignore files must remain unchanged');
  assert(/Keep target source.*read-only/i.test(canonical), 'target source read-only boundary is missing');
  for (const phrase of ['OPERATION-AUTHORITY.md', 'INVARIANTS-AND-FAILURE.md', 'pre-dispatch', 'post-dispatch', 'uncertain remote', 'retry exhaustion', 'durable retention or DLQ', 'not found in bounded search']) {
    assert(canonical.toLowerCase().includes(phrase.toLowerCase()), `missing operation/failure depth contract: ${phrase}`);
  }
  assert(/Two consecutive distinct successful rounds/i.test(canonical), 'no-novelty convergence must use distinct successful rounds');
  assert(contract.global_gates.some(gate => /four named core rounds/i.test(gate)
    && /terminal-successful/i.test(gate)
    && /locally reconciled under distinct lenses/i.test(gate)
    && /represented-only items must be verified locally/i.test(gate)), 'machine contract must encode the complete novelty gate');
  assert(/polls[^\n]{0,120}(?:are not rounds|do not count)/i.test(canonical), 'CodeQA polling must not count as an interrogation round');
  assert(/publisher readback/i.test(canonical), 'publisher readback gate is missing');
  assert(fs.existsSync(path.join(harnessRoot, 'scripts', 'workspace-learning-state.mjs')), 'missing workspace state helper');
  console.log(JSON.stringify({
    status: 'success',
    summary: 'Workspace Learning Pro command contract is valid',
    phases: 8,
    skills: 2,
    main_words: result.mainWords,
    main_lines: result.mainLines,
    context_budget_scope: result.contextBudgetScope,
    mandatory_phase_context_max_words: maxMandatoryContext,
    mandatory_phase_context_scope: 'command shell plus explicitly required Workspace Learning references; routed downstream skill and agent payloads excluded',
    artifacts: ['commands/workspace-learning-pro.md', 'commands/workspace-learning-pro/contract.json'],
    next_actions: ['Exercise state and distribution tests.'],
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    status: 'error',
    summary: error.message,
    artifacts: [],
    next_actions: ['Repair the Workspace Learning Pro command or progressive-loading contract.'],
  }, null, 2));
  process.exit(1);
}
