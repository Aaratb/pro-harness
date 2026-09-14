'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');
const HELPER = path.join(HARNESS_ROOT, 'scripts', 'workspace-learning-state.mjs');

function read(relativePath) {
  return fs.readFileSync(path.join(HARNESS_ROOT, relativePath), 'utf8');
}

function git(repo, ...args) {
  return childProcess.execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

function initRepo(repo) {
  fs.mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.email', 'workspace-learning@example.invalid');
  git(repo, 'config', 'user.name', 'Workspace Learning Test');
  fs.writeFileSync(path.join(repo, 'README.md'), '# fixture\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-qm', 'fixture');
}

function run(workspace, command, ...args) {
  return JSON.parse(childProcess.execFileSync(process.execPath, [HELPER, command, '--workspace', workspace, ...args], { encoding: 'utf8' }));
}

test('workspace learning uses native CodeQA MCP only and roots both entry paths deterministically', () => {
  const main = read('commands/workspace-learning-pro.md');
  const routing = read('commands/workspace-learning-pro/routing.md');
  const phase = read('commands/workspace-learning-pro/phases/03-external-interrogation.md');
  const reference = read('skills/workspace-learning-core/references/external-interrogation.md');
  const bridge = read('skills/workspace-learning-pro/SKILL.md');
  const transport = [main, routing, phase, reference].join('\n');

  assert.match(transport, /native CodeQA MCP[^\n]*sole transport/i);
  for (const operation of ['ask', 'continue_task', 'get_task', 'get_task_logs', 'cancel_task', 'health', 'list_conversations']) assert.ok(transport.includes(`\`${operation}\``));
  assert.match(transport, /runtime-authenticated identity/i);
  assert.match(transport, /a desktop auth token, user ID/i);
  assert.doesNotMatch(transport, /\$codeqa[^\n]*(?:fallback|fallback only)/i);
  assert.match(transport, /pre-existing legacy CLI task[^\n]*(?:observed|inspected)[^\n]*read-only|pre-existing legacy CLI task[^\n]*read-only/i);
  assert.match(transport, /never (?:create|use CLI to create)[^\n]*(?:continue|continued)[^\n]*(?:resume|resumed)[^\n]*(?:cancel|cancelled)[^\n]*(?:recover|recovered)/i);
  assert.match(transport, /Workspace Learning Pro has switched to native CodeQA MCP; the legacy CLI task will not be resumed\./i);
  assert.match(transport, /(?:Phase 3 blocker|blocks Phase 3)/i);
  assert.match(transport, /MCP `ask` has no branch field/i);
  assert.match(transport, /requested branch,? and expected (?:commit )?SHA/i);
  assert.match(transport, /unprovable checkout\/ref parity is a mismatch and bounded limitation/i);
  assert.match(transport, /Exact-ref uncertainty never authorizes another transport/i);

  assert.match(bridge, /adapter-provided canonical harness root first/i);
  assert.match(bridge, /default to `~\/\.agents`/i);
  assert.ok(bridge.includes('$HARNESS_ROOT/commands/workspace-learning-pro.md'));
  assert.doesNotMatch(bridge, /Read `~\/\.agents\/commands\/workspace-learning-pro\.md`/);
  assert.match(main, /adapter-provided canonical root/i);
  assert.ok(main.includes('$HARNESS_ROOT/skills/workspace-learning-core/SKILL.md'));
  assert.match(main, /required canonical file is unavailable, stop and report the exact resolved path/i);
});

test('workspace learning resolves exact CodeQA operations through an MCP-only portable capability contract', () => {
  const operations = ['ask', 'continue_task', 'get_task', 'get_task_logs', 'cancel_task', 'health', 'list_conversations'];
  const capabilities = operations.map(operation => `code-qa.${operation}`);
  const codeQaCapability = JSON.parse(read('mcps/code-qa/capability.json'));
  const registry = JSON.parse(read('mcps/registry.json'));
  const providers = JSON.parse(read('mcps/providers.json'));
  const adapters = JSON.parse(read('agents/adapters/capabilities.json')).capabilities;
  const command = JSON.parse(read('commands/workspace-learning-pro/contract.json'));
  const manifest = JSON.parse(read('skills/resolution-manifest.json'));

  assert.equal(codeQaCapability.transport, 'adapter-resolved');
  assert.deepEqual(codeQaCapability.launch.provider_candidates, ['runtime-native-code-qa-mcp']);
  assert.deepEqual(Object.keys(codeQaCapability.capabilities), capabilities);
  for (const operation of operations) {
    // The canonical id is generic; the concrete tool it binds to is site-specific and lives
    // only here and in the adapter map. Assert exactly one binding, not that it is named
    // after the operation.
    const [boundTool] = codeQaCapability.capabilities[`code-qa.${operation}`].tool_candidates;
    assert.equal(typeof boundTool, 'string');
    assert.equal(Object.hasOwn(codeQaCapability.capabilities[`code-qa.${operation}`], 'cli_fallback'), false);
    assert.deepEqual(adapters[`code-qa.${operation}`].claude, [`CallMcpTool:${boundTool}`]);
    assert.deepEqual(adapters[`code-qa.${operation}`].codex, [`mcp-tool:${boundTool}`]);
    assert.deepEqual(adapters[`code-qa.${operation}`].cursor, [`MCP:${boundTool}`]);
  }
  assert.equal(codeQaCapability.authentication.primary_identity, 'runtime-authenticated');
  assert.equal(codeQaCapability.authentication.may_print_secret, false);
  assert.equal(Object.hasOwn(providers.providers, 'code-qa'), false, 'runtime-native CodeQA must not add a credential-bearing provider config');

  const registered = registry.contracts.find(({ name }) => name === 'code-qa');
  assert.equal(registered.requirement, 'required-native-only-for-workspace-learning-interrogation');
  assert.deepEqual(registered.workflows['workspace-learning-pro'], [1, 3]);
  for (const phaseNumber of [1, 3]) assert.deepEqual(command.phases[phaseNumber - 1].capabilities, capabilities);
  for (const skillName of ['workspace-learning-pro', 'workspace-learning-core']) {
    assert.deepEqual(manifest.skills.find(({ name }) => name === skillName).capabilities, capabilities);
  }
});

test('workspace learning resumes a persisted CodeQA task without duplicate creation after compaction', () => {
  const phase = read('commands/workspace-learning-pro/phases/03-external-interrogation.md');
  const routing = read('commands/workspace-learning-pro/routing.md');
  const core = read('skills/workspace-learning-core/SKILL.md');
  const reference = read('skills/workspace-learning-core/references/external-interrogation.md');
  const contract = JSON.parse(read('commands/workspace-learning-pro/contract.json'));

  const restore = phase.indexOf('Before any CodeQA creation call, load the persisted Phase 3 task');
  const create = phase.indexOf('For a new or recovered MCP generation, reserve then call `ask` once');
  assert.ok(restore >= 0 && create > restore, 'persisted identity must be restored before fresh-task creation');
  assert.doesNotMatch(phase, /For MCP, start a fresh task with `ask`/);
  assert.match(phase, /phase re-entry, compaction[^\n]*never authorizes a second dispatch/);
  assert.match(phase, /Create a fresh MCP task only without an active task or after explicit recovery/);
  assert.match(phase, /first call `get_task` and `get_task_logs`/);
  assert.match(phase, /For `CREATED`, `PENDING`, or `RUNNING`, wait and poll the same task/);
  assert.match(phase, /For `COMPLETED`, checkpoint any previously unrecorded result exactly once/);
  assert.match(phase, /For `FAILED` or `CANCELLED`[\s\S]*never create a duplicate task/);
  assert.match(reference, /Start every entry with `codeqa-status`[^\n]*unbound intent blocks another dispatch/i);
  assert.match(reference, /On resume with an unbound intent, do not call `ask` or `continue_task`/i);
  assert.match(routing, /On re-entry, `codeqa-status` exposes both task and intent/);
  assert.match(core, /On re-entry, inspect the persisted intent and task before any external state change/);
  assert.ok(contract.global_gates.some(gate => /resume inspects the task and any dispatch intent before external state change/i.test(gate)));
});

test('workspace learning recovers only evidence-backed recursive-delegation PENDING stalls', () => {
  const main = read('commands/workspace-learning-pro.md');
  const routing = read('commands/workspace-learning-pro/routing.md');
  const core = read('skills/workspace-learning-core/SKILL.md');
  const phase = read('commands/workspace-learning-pro/phases/03-external-interrogation.md');
  const reference = read('skills/workspace-learning-core/references/external-interrogation.md');
  const codeQaCapability = JSON.parse(read('mcps/code-qa/capability.json'));
  const contract = JSON.parse(read('commands/workspace-learning-pro/contract.json'));
  const recovery = [main, routing, core, phase, reference].join('\n');

  assert.match(recovery, /PENDING[^\n]*(?:poll-by-default|polling rule is the default)/i);
  assert.match(recovery, /(?:status|`PENDING` status) or elapsed time alone never (?:proves[^\n]*killed|authorizes cancellation)/i);
  assert.match(reference, /`get_task` and `get_task_logs`[\s\S]{0,220}stuck[\s\S]{0,220}recursively delegated or spawned agents/i);
  assert.match(reference, /explicit user authorization[\s\S]{0,120}call native `cancel_task`/i);
  assert.match(reference, /persist `CANCELLED` through `codeqa-observe`/i);
  assert.match(reference, /cancellation is rejected, ambiguous, or unconfirmed[\s\S]{0,160}do not dispatch/i);
  assert.match(reference, /Do not delegate any part of this investigation, spawn or invoke another agent, or recursively create a CodeQA task[\s\S]{0,180}must perform the repository investigation itself/i);
  assert.match(reference, /`codeqa-reserve --kind recover`[\s\S]{0,160}Call `ask` once[\s\S]{0,160}intent-bound `codeqa-recover`/i);
  assert.match(reference, /Never use `continue_task` for this replacement or bypass the ordinary reservation and binding rules/i);
  assert.match(codeQaCapability.capabilities['code-qa.cancel_task'].purpose, /task and execution-log evidence[\s\S]*recursive\/delegated work[\s\S]*never status or elapsed time alone/i);
  assert.ok(contract.global_gates.some(gate => /PENDING is poll-by-default/i.test(gate)
    && /explicit user authorization permit native-MCP cancellation/i.test(gate)
    && /confirmed and checkpointed as CANCELLED/i.test(gate)
    && /prompt forbids recursive agent delegation/i.test(gate)));
});

test('workspace learning wires every typed CodeQA lifecycle transition in reconciliation order', () => {
  const phase = read('commands/workspace-learning-pro/phases/03-external-interrogation.md');
  const convergence = read('commands/workspace-learning-pro/phases/04-convergence.md');
  const reference = read('skills/workspace-learning-core/references/external-interrogation.md');
  const combined = `${phase}\n${reference}`;

  for (const operation of [
    'codeqa-status',
    'codeqa-reserve',
    'codeqa-resolve-intent',
    'codeqa-start',
    'codeqa-observe',
    'codeqa-result',
    'codeqa-round',
    'codeqa-continue',
    'codeqa-recover',
    'codeqa-convergence',
  ]) assert.ok(combined.includes(operation), `missing typed lifecycle operation ${operation}`);

  const reserve = phase.indexOf('codeqa-reserve --workspace');
  const dispatch = phase.indexOf('Only after reservation, make the one matching MCP call');
  const bind = phase.indexOf('codeqa-start --workspace');
  assert.ok(reserve >= 0 && dispatch > reserve && bind > dispatch, 'reserve must precede external dispatch and binding');
  assert.match(phase, /final exact prompt\/comment bytes[^\n]*intent ID/i);
  assert.match(phase, /Compute their SHA-256, then reserve before the provider call/i);
  assert.match(phase, /expected generation `1` for `start`[^\n]*current generation for `continue`[^\n]*current generation plus one for `recover`/i);
  assert.match(phase, /`codeqa-start`, `codeqa-continue`, and `codeqa-recover` require the matching `--intent-id`/i);
  assert.match(combined, /Workspace Learning dispatch intent: <intent-id>/i);
  assert.match(phase, /unbound intent[^\n]*blocks another dispatch, convergence, and Phase 3 completion/i);
  assert.match(phase, /`list_conversations`[^\n]*`get_task` and `get_task_logs`/i);
  assert.match(phase, /Missing or ambiguous lookup stays blocked/i);
  assert.match(phase, /lookup proves no matching task exists[^\n]*user explicitly authorizes/i);
  assert.match(phase, /codeqa-resolve-intent[^\n]*--intent-id[^\n]*--resolution no-task-created[^\n]*--evidence-id[^\n]*--user-authorized true/i);
  assert.match(phase, /fail-closed, at-most-one automatic dispatch[^\n]*not exactly-once provider execution/i);
  assert.match(phase, /historical MCP checkpoint[^\n]*(?:reserving then binding|reserve and bind)/i);
  assert.match(phase, /untyped legacy CLI[^\n]*archive-only/i);

  const loop = phase.slice(phase.indexOf('For each turn, preserve this exact order:'));
  const ordered = ['codeqa-observe', 'codeqa-result', 'repository-explorer', 'codeqa-round', 'reserve `continue`', 'continue_task', 'codeqa-continue'];
  for (let index = 1; index < ordered.length; index += 1) {
    assert.ok(loop.indexOf(ordered[index - 1]) < loop.indexOf(ordered[index]), `${ordered[index - 1]} must precede ${ordered[index]}`);
  }
  assert.match(phase, /historical MCP checkpoint[^\n]*without external dispatch/i);
  assert.match(phase, /Missing, ambiguous, or branched identity blocks import/i);
  assert.match(combined, /codeqa-result[\s\S]{0,240}--semantic-success <true\|false>/i);
  assert.match(combined, /(?:Provider status `COMPLETED` alone does not prove semantic success|provider status is `COMPLETED`)/i);
  assert.match(combined, /task:<task-id>:sha256:<hex>/i);
  assert.match(combined, /semantic-success=false|uses `false`[\s\S]*cannot become a round/i);
  assert.match(convergence, /codeqa-convergence[\s\S]*missing, stale, or rejected typed lifecycle result returns to Phase 3/i);
});

test('workspace learning versions and migrates legacy artifact checkpoints before resume', () => {
  const main = read('commands/workspace-learning-pro.md');
  const preflight = read('commands/workspace-learning-pro/phases/01-inventory-preflight.md');
  const verification = read('commands/workspace-learning-pro/phases/08-verification-advance.md');
  const artifactState = read('skills/workspace-learning-core/references/artifact-and-state.md');
  const combined = `${main}\n${preflight}\n${artifactState}`;

  assert.match(combined, /workflow(?: and|\/)artifact contract(?:s| versions)? (?:are|is) version `?2`?|workflow and artifact contract versions are both `2`/i);
  assert.match(combined, /contract-status/);
  assert.match(combined, /contract-migrate/);
  assert.match(combined, /preserve[\s\S]*(?:legacy|old)[\s\S]*(?:audit|migration record)/i);
  assert.match(combined, /invalidat(?:e|es)[\s\S]*Phases 2–8/i);
  assert.match(combined, /DOMAIN-AUTHORITY\.md[\s\S]*(?:quarantin|supersed)/i);
  assert.match(combined, /Phase 2 restudy/i);
  assert.match(combined, /(?:CREATED`, `PENDING`, or `RUNNING`)[\s\S]*blocks migration/i);
  assert.match(combined, /contract-observe-codeqa[\s\S]*evidence-id/i);
  for (const digest of ['local_study_digest', 'operation_authority_digest', 'invariants_failure_digest']) {
    assert.ok(combined.includes(digest), `missing version-2 Phase 2 digest ${digest}`);
  }
  assert.match(verification, /contract version `2`[\s\S]*no outstanding Phase 2 restudy/i);
});

test('workspace learning enforces operation-level authority, failure recovery, and evidence limits', () => {
  const main = read('commands/workspace-learning-pro.md');
  const local = read('commands/workspace-learning-pro/phases/02-local-study.md');
  const codeQaPhase = read('commands/workspace-learning-pro/phases/03-external-interrogation.md');
  const convergence = read('commands/workspace-learning-pro/phases/04-convergence.md');
  const explainer = read('commands/workspace-learning-pro/phases/05-explainer-course.md');
  const verification = read('commands/workspace-learning-pro/phases/08-verification-advance.md');
  const reference = read('skills/workspace-learning-core/references/external-interrogation.md');
  const artifacts = read('skills/workspace-learning-core/references/artifact-and-state.md');
  const depth = [main, local, codeQaPhase, convergence, reference].join('\n');

  for (const name of ['OPERATION-AUTHORITY.md', 'INVARIANTS-AND-FAILURE.md']) {
    assert.ok(artifacts.includes(name));
    assert.ok(local.includes(name));
    assert.ok(explainer.includes(name));
    assert.ok(verification.includes(name));
  }
  for (const pattern of [
    /each material domain into operations|domains into material operations/i,
    /pre-dispatch/i,
    /post-dispatch/i,
    /uncertain remote/i,
    /enqueue\/publish failure/i,
    /retry exhaustion/i,
    /durable retention or DLQ/i,
    /reconciliation/i,
    /recovery owner/i,
    /user-visible completion|meaning of completion/i,
    /outer (?:HTTP\/RPC )?clients|outer client\/middleware/i,
    /not found in bounded search/i,
  ]) assert.match(depth, pattern);
  assert.match(depth, /mocked test proves only|mocks prove only/i);
  assert.match(depth, /implementation source[\s\S]*inspected tests[\s\S]*configuration\/deployment[\s\S]*Git history[\s\S]*live operational/i);
  assert.match(convergence, /Two consecutive distinct successful rounds/i);
  assert.match(codeQaPhase, /Polls, progress logs, retries, or repeated wording are not rounds/i);
});

test('workspace learning state preserves queue order and keeps all owned state locally ignored', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-learning-'));
  try {
    initRepo(workspace);
    initRepo(path.join(workspace, 'api'));
    initRepo(path.join(workspace, 'zeta'));
    fs.writeFileSync(path.join(workspace, '.gitignore'), 'api/\nzeta/\n');
    fs.writeFileSync(path.join(workspace, 'service-repos.txt'), 'api\nmissing-service\n');
    git(workspace, 'add', '.gitignore', 'service-repos.txt');
    git(workspace, 'commit', '-qm', 'registry');

    const state = run(workspace, 'init');
    assert.deepEqual(state.repositories.map(({ name, status }) => [name, status]), [
      ['api', 'pending'], ['missing-service', 'unavailable'], ['zeta', 'pending'],
    ]);
    assert.equal(git(workspace, 'status', '--porcelain=v1').trim(), '');
    assert.match(git(workspace, 'check-ignore', '-v', path.join(workspace, '.workspace-learning', 'state.json')), /\/\.workspace-learning\//);

    const ignored = run(workspace, 'ensure-ignored', '--repo', 'api');
    assert.deepEqual(ignored.patterns, ['/.agents/explanations/', '/.agents/repository-learning/', '/.codemaps/']);
    const baseline = run(workspace, 'snapshot', '--repo', 'api', '--label', 'baseline');
    fs.mkdirSync(path.join(workspace, 'api', '.codemaps'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'api', '.codemaps', 'CODEMAP.md'), '# generated\n');
    const verified = run(workspace, 'verify', '--repo', 'api', '--label', 'baseline');
    assert.equal(verified.matches, true);
    assert.equal(verified.actual_digest, baseline.digest);

    fs.writeFileSync(path.join(workspace, 'api', 'ordinary-untracked.txt'), 'must remain visible\n');
    const changed = childProcess.spawnSync(process.execPath, [HELPER, 'verify', '--workspace', workspace, '--repo', 'api', '--label', 'baseline'], { encoding: 'utf8' });
    assert.equal(changed.status, 1);
    assert.match(changed.stderr, /Git status changed/);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('workspace learning refuses to hide tracked artifact paths', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-learning-tracked-'));
  try {
    initRepo(path.join(workspace, 'api'));
    fs.mkdirSync(path.join(workspace, 'api', '.codemaps'));
    fs.writeFileSync(path.join(workspace, 'api', '.codemaps', 'owned.md'), 'tracked\n');
    git(path.join(workspace, 'api'), 'add', '.codemaps/owned.md');
    git(path.join(workspace, 'api'), 'commit', '-qm', 'tracked artifact fixture');
    fs.writeFileSync(path.join(workspace, 'service-repos.txt'), 'api\n');
    run(workspace, 'init');

    const result = childProcess.spawnSync(process.execPath, [HELPER, 'ensure-ignored', '--workspace', workspace, '--repo', 'api'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /artifact paths contain tracked files/);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
