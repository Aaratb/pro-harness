'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');
const HELPER = path.join(HARNESS_ROOT, 'scripts', 'workspace-learning-state.mjs');

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

function fixture(prefix = 'workspace-learning-codeqa-') {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  initRepo(path.join(workspace, 'api'));
  initRepo(path.join(workspace, 'zeta'));
  fs.writeFileSync(path.join(workspace, 'service-repos.txt'), 'api\nzeta\n');
  run(workspace, 'init');
  return workspace;
}

function stateFile(workspace) {
  return path.join(workspace, '.workspace-learning', 'state.json');
}

function recordFor(workspace, name = 'api') {
  return JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8')).repositories.find(record => record.name === name);
}

function forceCodeQAPhaseReady(workspace) {
  const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
  const record = state.repositories.find(candidate => candidate.name === 'api');
  record.phases['1'].status = 'completed';
  record.phases['2'].status = 'completed';
  record.phases['3'].status = 'in_progress';
  record.current_phase = 3;
  record.status = 'in_progress';
  fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);
  return workspace;
}

function codeQaFixture(prefix = 'workspace-learning-codeqa-') {
  return forceCodeQAPhaseReady(fixture(prefix));
}

function canonicalPhaseTwoDigests(workspace) {
  const directory = path.join(workspace, 'api', '.agents', 'repository-learning');
  fs.mkdirSync(directory, { recursive: true });
  const contents = {
    local_study_digest: ['LOCAL-STUDY.md', '# Local study\n'],
    operation_authority_digest: ['OPERATION-AUTHORITY.md', '# Operation authority\n'],
    invariants_failure_digest: ['INVARIANTS-AND-FAILURE.md', '# Invariants and failure\n'],
  };
  return Object.fromEntries(Object.entries(contents).map(([key, [name, content]]) => {
    fs.writeFileSync(path.join(directory, name), content);
    return [key, crypto.createHash('sha256').update(content).digest('hex')];
  }));
}

function invoke(workspace, command, ...args) {
  return childProcess.spawnSync(
    process.execPath,
    [HELPER, command, '--workspace', workspace, ...args],
    { encoding: 'utf8' },
  );
}

function run(workspace, command, ...args) {
  const result = invoke(workspace, command, ...args);
  assert.equal(result.status, 0, `${command} failed:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function reject(workspace, command, expected, ...args) {
  const result = invoke(workspace, command, ...args);
  assert.equal(result.status, 1, `${command} unexpectedly succeeded:\n${result.stdout}`);
  assert.match(result.stderr, expected);
  return result;
}

function promptDigest(label) {
  return crypto.createHash('sha256').update(label).digest('hex');
}

function reserveIntent(workspace, {
  intentId, kind, expectedGeneration, parentTaskId, fromTaskId, reason,
}) {
  const args = [
    '--repo', 'api', '--intent-id', intentId, '--kind', kind, '--transport', 'mcp',
    '--prompt-sha256', promptDigest(`${kind}:${intentId}`),
    '--expected-generation', String(expectedGeneration), '--reason', reason,
  ];
  if (parentTaskId) args.push('--parent-task-id', parentTaskId);
  if (fromTaskId) args.push('--from-task-id', fromTaskId);
  return run(workspace, 'codeqa-reserve', ...args);
}

function start(workspace, taskId = 'task-1', transport = 'mcp', status = 'CREATED') {
  const reason = `${transport} selected by capability probe`;
  const intentId = `intent-start-${taskId}`;
  reserveIntent(workspace, { intentId, kind: 'start', expectedGeneration: 1, reason });
  return run(
    workspace,
    'codeqa-start',
    '--repo', 'api',
    '--task-id', taskId,
    '--intent-id', intentId,
    '--transport', transport,
    '--status', status,
    '--reason', reason,
  );
}

function finishRound(workspace, {
  taskId,
  transport = 'mcp',
  number,
  name,
  lens,
  novelty,
}) {
  run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', taskId, '--transport', transport, '--status', 'COMPLETED');
  run(
    workspace,
    'codeqa-result',
    '--repo', 'api', '--task-id', taskId, '--transport', transport,
    '--result-id', `result-${taskId}`, '--semantic-success', 'true',
  );
  return run(
    workspace,
    'codeqa-round',
    '--repo', 'api',
    '--task-id', taskId,
    '--transport', transport,
    '--round', String(number),
    '--round-name', name,
    '--lens', lens,
    '--novelty', novelty,
    '--locally-reconciled', 'true',
  );
}

function continueTask(workspace, parentTaskId, taskId, transport = 'mcp') {
  const lifecycle = run(workspace, 'codeqa-status', '--repo', 'api');
  const intentId = `intent-continue-${taskId}`;
  reserveIntent(workspace, {
    intentId,
    kind: 'continue',
    expectedGeneration: lifecycle.generation,
    parentTaskId,
    reason: `continue to ${taskId}`,
  });
  return run(
    workspace,
    'codeqa-continue',
    '--repo', 'api',
    '--parent-task-id', parentTaskId,
    '--task-id', taskId,
    '--intent-id', intentId,
    '--transport', transport,
    '--status', 'PENDING',
  );
}

function recoverTask(workspace, {
  fromTaskId, taskId, status = 'CREATED', reason,
}) {
  const lifecycle = run(workspace, 'codeqa-status', '--repo', 'api');
  const intentId = `intent-recover-${taskId}`;
  reserveIntent(workspace, {
    intentId,
    kind: 'recover',
    expectedGeneration: lifecycle.generation + 1,
    fromTaskId,
    reason,
  });
  return run(
    workspace, 'codeqa-recover', '--repo', 'api', '--from-task-id', fromTaskId,
    '--task-id', taskId, '--intent-id', intentId, '--transport', 'mcp', '--status', status, '--reason', reason,
  );
}

test('CodeQA lifecycle records typed lineage and reaches convergence through four named rounds', () => {
  const workspace = codeQaFixture();
  try {
    assert.deepEqual(run(workspace, 'codeqa-status', '--repo', 'api'), {
      initialized: false,
      repository: 'api',
      lifecycle: null,
    });
    const initial = start(workspace);
    assert.equal(initial.generation, 1);
    assert.equal(initial.transport, 'mcp');
    assert.equal(initial.root_task_id, 'task-1');
    assert.equal(initial.current_task_id, 'task-1');
    assert.equal(initial.parent_task_id, null);

    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'RUNNING');
    const requeued = run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'PENDING');
    assert.equal(requeued.status, 'PENDING', 'live CodeQA work may requeue from RUNNING to PENDING');

    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'COMPLETED');
    run(
      workspace,
      'codeqa-result',
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp',
      '--result-id', 'result-task-1', '--semantic-success', 'true',
    );
    reject(
      workspace,
      'codeqa-round',
      /first four CodeQA rounds must be exact and ordered: expected atlas/,
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--round', '1',
      '--round-name', 'source-challenge', '--lens', 'wrong first lens', '--novelty', 'material', '--locally-reconciled', 'true',
    );
    run(
      workspace,
      'codeqa-round',
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--round', '1',
      '--round-name', 'atlas', '--lens', 'repository atlas', '--novelty', 'material', '--locally-reconciled', 'true',
    );
    continueTask(workspace, 'task-1', 'task-2');
    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp', '--status', 'COMPLETED');
    run(
      workspace, 'codeqa-result', '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp',
      '--result-id', 'result-task-2', '--semantic-success', 'true',
    );
    reject(
      workspace, 'codeqa-round', /first four CodeQA rounds must be exact and ordered: expected source-challenge/,
      '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp', '--round', '2',
      '--round-name', 'gap closure', '--lens', 'interleaved lens', '--novelty', 'material', '--locally-reconciled', 'true',
    );
    run(
      workspace, 'codeqa-round', '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp', '--round', '2',
      '--round-name', 'source challenge', '--lens', 'source counterexamples', '--novelty', 'material', '--locally-reconciled', 'true',
    );
    continueTask(workspace, 'task-2', 'task-3');
    finishRound(workspace, {
      taskId: 'task-3', number: 3, name: 'invariants/failure', lens: 'failure recovery', novelty: 'represented',
    });
    continueTask(workspace, 'task-3', 'task-4');
    const fourth = finishRound(workspace, {
      taskId: 'task-4', number: 4, name: 'history/misunderstanding', lens: 'history intent', novelty: 'none',
    });
    assert.deepEqual(
      { number: fourth.number, name: fourth.name, reconciled: fourth.locally_reconciled },
      { number: 4, name: 'history-misunderstanding', reconciled: true },
    );

    reserveIntent(workspace, {
      intentId: 'intent-unbound-continuation', kind: 'continue', expectedGeneration: 1,
      parentTaskId: 'task-4', reason: 'provider call reserved before convergence check',
    });
    reject(workspace, 'codeqa-convergence', /blocked by unresolved dispatch intent/, '--repo', 'api');
    run(
      workspace, 'codeqa-resolve-intent', '--repo', 'api', '--intent-id', 'intent-unbound-continuation',
      '--resolution', 'no-task-created', '--evidence-id', 'provider-lookup-no-task',
      '--reason', 'bounded provider lookup confirmed no task was created', '--user-authorized', 'true',
    );

    const convergence = run(workspace, 'codeqa-convergence', '--repo', 'api');
    assert.equal(convergence.eligible, true);
    assert.deepEqual(convergence.core_rounds, {
      atlas: 1,
      'source-challenge': 2,
      'invariants-failure': 3,
      'history-misunderstanding': 4,
    });
    assert.deepEqual(convergence.novelty_rounds.map(round => round.task_id), ['task-3', 'task-4']);

    const status = run(workspace, 'codeqa-status', '--repo', 'api');
    assert.equal(status.schema_version, 2);
    assert.equal(status.current_task_id, 'task-4');
    assert.equal(status.parent_task_id, 'task-3');
    assert.equal(status.status, 'COMPLETED');
    assert.equal(status.rounds.length, 4);
    assert.deepEqual(status.tasks.map(task => task.parent_task_id), [null, 'task-1', 'task-2', 'task-3']);

    const beforeMerge = structuredClone(status);
    const merged = run(workspace, 'init');
    assert.deepEqual(merged.repositories.find(record => record.name === 'api').code_qa, beforeMerge);
    assert.equal(merged.repositories.find(record => record.name === 'zeta').code_qa, undefined);
    assert.equal(fs.statSync(path.join(workspace, '.workspace-learning', 'state.json')).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('CodeQA dispatch intent reserves before provider work, binds once, or resolves with explicit no-task evidence', () => {
  const workspace = codeQaFixture('workspace-learning-codeqa-intent-');
  try {
    const reason = 'initial MCP interrogation';
    const reserved = reserveIntent(workspace, {
      intentId: 'dispatch-intent-1', kind: 'start', expectedGeneration: 1, reason,
    });
    assert.equal(reserved.status, 'reserved');
    assert.equal(reserved.transport, 'mcp');
    assert.equal(run(workspace, 'codeqa-status', '--repo', 'api').dispatch_intent.intent_id, 'dispatch-intent-1');
    reject(
      workspace, 'codeqa-reserve', /unresolved CodeQA dispatch intent dispatch-intent-1/,
      '--repo', 'api', '--intent-id', 'dispatch-intent-2', '--kind', 'start', '--transport', 'mcp',
      '--prompt-sha256', promptDigest('second'), '--expected-generation', '1', '--reason', 'duplicate dispatch',
    );
    reject(
      workspace, 'codeqa-start', /dispatch intent mismatch/,
      '--repo', 'api', '--task-id', 'provider-task-1', '--intent-id', 'wrong-intent',
      '--transport', 'mcp', '--status', 'CREATED', '--reason', reason,
    );
    reject(
      workspace, 'checkpoint', /blocked by unresolved CodeQA dispatch intent dispatch-intent-1/,
      '--repo', 'api', '--phase', '3', '--status', 'completed',
    );
    reject(
      workspace, 'codeqa-resolve-intent', /requires --user-authorized true/,
      '--repo', 'api', '--intent-id', 'dispatch-intent-1', '--resolution', 'no-task-created',
      '--evidence-id', 'lookup-1', '--reason', 'bounded provider lookup found no task', '--user-authorized', 'false',
    );
    const resolved = run(
      workspace, 'codeqa-resolve-intent', '--repo', 'api', '--intent-id', 'dispatch-intent-1',
      '--resolution', 'no-task-created', '--evidence-id', 'lookup-1',
      '--reason', 'bounded provider lookup found no task', '--user-authorized', 'true',
    );
    assert.equal(resolved.resolution, 'no-task-created');
    reject(
      workspace, 'codeqa-resolve-intent', /no unresolved CodeQA dispatch intent exists/,
      '--repo', 'api', '--intent-id', 'dispatch-intent-1', '--resolution', 'no-task-created',
      '--evidence-id', 'lookup-2', '--reason', 'cannot resolve twice', '--user-authorized', 'true',
    );
    reject(
      workspace, 'codeqa-reserve', /duplicate CodeQA dispatch intent ID/,
      '--repo', 'api', '--intent-id', 'dispatch-intent-1', '--kind', 'start', '--transport', 'mcp',
      '--prompt-sha256', promptDigest('reused'), '--expected-generation', '1', '--reason', 'must be unique',
    );

    reserveIntent(workspace, {
      intentId: 'dispatch-intent-2', kind: 'start', expectedGeneration: 1, reason,
    });
    const bound = run(
      workspace, 'codeqa-start', '--repo', 'api', '--task-id', 'provider-task-1',
      '--intent-id', 'dispatch-intent-2', '--transport', 'mcp', '--status', 'CREATED', '--reason', reason,
    );
    assert.equal(bound.tasks[0].dispatch_intent_id, 'dispatch-intent-2');
    assert.equal(bound.dispatch_intents[0].bound_task_id, 'provider-task-1');
    assert.equal(recordFor(workspace).code_qa_dispatch_intent, undefined);
    assert.equal(recordFor(workspace).code_qa_dispatch_resolutions[0].evidence_id, 'lookup-1');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('CodeQA lifecycle rejects duplicate creation/result ingestion, transport switches, and implicit recovery', () => {
  const workspace = codeQaFixture('workspace-learning-codeqa-reject-');
  try {
    reject(
      workspace,
      'codeqa-start',
      /require native MCP transport/,
      '--repo', 'api', '--task-id', 'cli-root', '--intent-id', 'no-cli-intent', '--transport', 'cli', '--status', 'CREATED', '--reason', 'legacy fallback',
    );
    start(workspace);
    reject(
      workspace,
      'codeqa-start',
      /lifecycle already exists/,
      '--repo', 'api', '--task-id', 'duplicate-root', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED', '--reason', 'duplicate',
    );
    reject(
      workspace,
      'codeqa-continue',
      /successfully completed current task/,
      '--repo', 'api', '--parent-task-id', 'task-1', '--task-id', 'task-2', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED',
    );
    reject(
      workspace,
      'codeqa-recover',
      /nonterminal CodeQA task cannot be replaced/,
      '--repo', 'api', '--from-task-id', 'task-1', '--task-id', 'task-2', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED', '--reason', 'premature recovery',
    );

    finishRound(workspace, {
      taskId: 'task-1', number: 1, name: 'atlas', lens: 'atlas lens', novelty: 'material',
    });
    reject(
      workspace,
      'codeqa-result',
      /already ingested for task task-1/,
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp',
      '--result-id', 'another-result', '--semantic-success', 'true',
    );
    reject(
      workspace,
      'codeqa-continue',
      /transport is immutable/,
      '--repo', 'api', '--parent-task-id', 'task-1', '--task-id', 'task-2', '--intent-id', 'missing-intent', '--transport', 'cli', '--status', 'CREATED',
    );

    continueTask(workspace, 'task-1', 'task-2');
    reject(
      workspace,
      'codeqa-observe',
      /allowed only for current CodeQA task task-2/,
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'COMPLETED',
    );
    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp', '--status', 'FAILED');
    reject(
      workspace,
      'codeqa-continue',
      /failed task cannot auto-continue/,
      '--repo', 'api', '--parent-task-id', 'task-2', '--task-id', 'task-3', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED',
    );
    reject(
      workspace,
      'codeqa-recover',
      /must open a native MCP generation/,
      '--repo', 'api', '--from-task-id', 'task-2', '--task-id', 'task-3', '--intent-id', 'missing-intent', '--transport', 'cli', '--status', 'CREATED', '--reason', 'CLI fallback forbidden',
    );

    const recovered = recoverTask(workspace, {
      fromTaskId: 'task-2', taskId: 'task-3', reason: 'user explicitly authorized MCP recovery',
    });
    assert.equal(recovered.generation, 2);
    assert.equal(recovered.transport, 'mcp');
    assert.equal(recovered.root_task_id, 'task-3');
    assert.equal(recovered.current_task_id, 'task-3');
    assert.equal(recovered.parent_task_id, null);
    assert.deepEqual(
      recovered.recoveries.map(({ explicit, from_generation, to_generation, from_task_id, to_task_id }) => (
        { explicit, from_generation, to_generation, from_task_id, to_task_id }
      )),
      [{ explicit: true, from_generation: 1, to_generation: 2, from_task_id: 'task-2', to_task_id: 'task-3' }],
    );
    reject(
      workspace,
      'codeqa-observe',
      /transport is immutable/,
      '--repo', 'api', '--task-id', 'task-3', '--transport', 'cli', '--status', 'RUNNING',
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('CodeQA semantic failure is explicit, persisted, recoverable, and result IDs are task-scoped', () => {
  const workspace = codeQaFixture('workspace-learning-codeqa-semantic-');
  try {
    start(workspace);
    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'COMPLETED');
    reject(
      workspace, 'codeqa-result', /requires .*--semantic-success true\|false/,
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--result-id', 'shared-result',
    );
    reject(
      workspace, 'codeqa-result', /--semantic-success must be true or false/,
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--result-id', 'shared-result', '--semantic-success', 'yes',
    );
    const negative = run(
      workspace, 'codeqa-result', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp',
      '--result-id', 'shared-result', '--semantic-success', 'false',
    );
    assert.equal(negative.tasks[0].result_checkpoint.semantic_success, false);
    reject(
      workspace, 'codeqa-round', /requires explicit semantic success/,
      '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--round', '1',
      '--round-name', 'atlas', '--lens', 'negative result', '--novelty', 'material', '--locally-reconciled', 'true',
    );
    reject(
      workspace, 'codeqa-continue', /requires the parent result to be semantically successful and locally reconciled/,
      '--repo', 'api', '--parent-task-id', 'task-1', '--task-id', 'task-2', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED',
    );
    recoverTask(workspace, { fromTaskId: 'task-1', taskId: 'task-2', reason: 'semantic result was negative' });
    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp', '--status', 'COMPLETED');
    const reused = run(
      workspace, 'codeqa-result', '--repo', 'api', '--task-id', 'task-2', '--transport', 'mcp',
      '--result-id', 'shared-result', '--semantic-success', 'true',
    );
    assert.equal(reused.tasks[1].result_checkpoint.id, 'shared-result');
    assert.equal(reused.tasks[1].result_checkpoint.semantic_success, true);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('validated typed lifecycle remains authoritative over stale flat CodeQA mirrors', () => {
  const workspace = codeQaFixture('workspace-learning-typed-flat-mirrors-');
  try {
    start(workspace);
    const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    const api = state.repositories.find(record => record.name === 'api');
    Object.assign(api.details, {
      code_qa_task_id: 'stale-legacy-task',
      code_qa_task_status: 'PENDING',
      code_qa_transport: 'cli',
    });
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);

    assert.equal(run(workspace, 'contract-status', '--repo', 'api').needs_migration, false);
    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'RUNNING');
    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp', '--status', 'COMPLETED');
    const lifecycle = run(
      workspace, 'codeqa-result', '--repo', 'api', '--task-id', 'task-1', '--transport', 'mcp',
      '--result-id', 'typed-result', '--semantic-success', 'true',
    );
    assert.equal(lifecycle.status, 'COMPLETED');
    assert.equal(recordFor(workspace).details.code_qa_task_status, 'PENDING', 'legacy mirrors remain inert audit residue');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('historical typed CLI tasks may close but only MCP may continue in a new generation', () => {
  const workspace = codeQaFixture('workspace-learning-historical-cli-');
  try {
    start(workspace);
    const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    const api = state.repositories.find(record => record.name === 'api');
    api.code_qa.transport = 'cli';
    api.code_qa.generations[0].transport = 'cli';
    api.code_qa.tasks[0].transport = 'cli';
    delete api.code_qa.tasks[0].dispatch_intent_id;
    delete api.code_qa.intent_enforcement_task_index;
    delete api.code_qa.dispatch_intents;
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);

    run(workspace, 'codeqa-observe', '--repo', 'api', '--task-id', 'task-1', '--transport', 'cli', '--status', 'COMPLETED');
    run(
      workspace, 'codeqa-result', '--repo', 'api', '--task-id', 'task-1', '--transport', 'cli',
      '--result-id', 'historical-cli-result', '--semantic-success', 'true',
    );
    run(
      workspace, 'codeqa-round', '--repo', 'api', '--task-id', 'task-1', '--transport', 'cli',
      '--round', '1', '--round-name', 'atlas', '--lens', 'historical CLI atlas',
      '--novelty', 'material', '--locally-reconciled', 'true',
    );
    reject(
      workspace, 'codeqa-continue', /requires a native MCP-bound generation/,
      '--repo', 'api', '--parent-task-id', 'task-1', '--task-id', 'task-2', '--intent-id', 'missing-intent', '--transport', 'cli', '--status', 'PENDING',
    );
    assert.equal(recoverTask(workspace, {
      fromTaskId: 'task-1', taskId: 'task-2', reason: 'move historical CLI state to native MCP',
    }).transport, 'mcp');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('CodeQA convergence rejects material novelty and repeated terminal lenses without mutating its checkpoint', () => {
  const workspace = codeQaFixture('workspace-learning-codeqa-convergence-');
  try {
    start(workspace);
    const rounds = [
      ['atlas', 'atlas lens', 'material'],
      ['source-challenge', 'source lens', 'material'],
      ['invariants-failure', 'failure lens', 'none'],
      ['history-misunderstanding', 'history lens', 'material'],
    ];
    for (let index = 0; index < rounds.length; index += 1) {
      const taskId = `task-${index + 1}`;
      if (index > 0) continueTask(workspace, `task-${index}`, taskId);
      finishRound(workspace, {
        taskId,
        number: index + 1,
        name: rounds[index][0],
        lens: rounds[index][1],
        novelty: rounds[index][2],
      });
    }
    const stateFile = path.join(workspace, '.workspace-learning', 'state.json');
    const beforeMaterialRejection = fs.readFileSync(stateFile, 'utf8');
    reject(workspace, 'codeqa-convergence', /no material novelty or represented-only novelty/, '--repo', 'api');
    assert.equal(fs.readFileSync(stateFile, 'utf8'), beforeMaterialRejection);

    continueTask(workspace, 'task-4', 'task-5');
    finishRound(workspace, {
      taskId: 'task-5', number: 5, name: 'gap closure', lens: 'history lens', novelty: 'none',
    });
    reject(workspace, 'codeqa-convergence', /distinct nonempty lens labels/, '--repo', 'api');

    continueTask(workspace, 'task-5', 'task-6');
    finishRound(workspace, {
      taskId: 'task-6', number: 6, name: 'gap closure', lens: 'final counterexample lens', novelty: 'represented',
    });
    assert.equal(run(workspace, 'codeqa-convergence', '--repo', 'api').eligible, true);
    continueTask(workspace, 'task-6', 'task-7');
    reject(workspace, 'codeqa-convergence', /current task must be the latest terminal successful locally reconciled round/, '--repo', 'api');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('CodeQA mutations fail closed on a symlinked state file', () => {
  const workspace = fixture('workspace-learning-codeqa-symlink-');
  const external = path.join(os.tmpdir(), `workspace-learning-external-${process.pid}-${Date.now()}.json`);
  try {
    const stateFile = path.join(workspace, '.workspace-learning', 'state.json');
    fs.writeFileSync(external, '{"sentinel":true}\n');
    fs.unlinkSync(stateFile);
    fs.symlinkSync(external, stateFile);
    reject(
      workspace,
      'codeqa-start',
      /state must be a regular file/,
      '--repo', 'api', '--task-id', 'task-1', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED', '--reason', 'probe',
    );
    assert.equal(fs.readFileSync(external, 'utf8'), '{"sentinel":true}\n');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(external, { force: true });
  }
});

test('state root permissions and existing locks fail closed without automatic stale removal', () => {
  const workspace = fixture('workspace-learning-state-lock-');
  const root = path.join(workspace, '.workspace-learning');
  const lock = path.join(root, 'state.lock');
  try {
    fs.chmodSync(root, 0o755);
    reject(workspace, 'status', /state root must have mode 0700/, '--repo', 'api');
    fs.chmodSync(root, 0o700);
    fs.writeFileSync(lock, `${JSON.stringify({
      version: 1,
      hostname: os.hostname(),
      pid: 999999,
      nonce: 'known-stale-lock',
      created_at: '2026-09-01T00:00:00.000Z',
    })}\n`, { mode: 0o600 });
    reject(
      workspace, 'checkpoint', /locked by PID 999999.*state\.lock; only an operator may remove this lock/,
      '--repo', 'api', '--phase', '1', '--status', 'in_progress',
    );
    assert.equal(fs.existsSync(lock), true, 'the helper must not unlink even an apparently stale lock');
  } finally {
    fs.chmodSync(root, 0o700);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('ensure-ignored rejects a dangling local-exclude symlink without creating its target', () => {
  const workspace = fixture('workspace-learning-exclude-symlink-');
  const exclude = path.join(workspace, 'api', '.git', 'info', 'exclude');
  const external = path.join(os.tmpdir(), `workspace-learning-dangling-${process.pid}-${Date.now()}`);
  try {
    fs.unlinkSync(exclude);
    fs.symlinkSync(external, exclude);
    reject(workspace, 'ensure-ignored', /local exclude must be a regular no-follow file/, '--repo', 'api');
    assert.equal(fs.existsSync(external), false);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(external, { force: true });
  }
});

test('a pending checkpoint reopens completion and invalidates every downstream phase', () => {
  const workspace = fixture('workspace-learning-pending-reopen-');
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    const api = state.repositories.find(record => record.name === 'api');
    api.status = 'completed';
    api.current_phase = 8;
    api.completed_at = '2026-09-08T00:00:00.000Z';
    for (let phase = 1; phase <= 8; phase += 1) api.phases[String(phase)].status = 'completed';
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);
    const reopened = run(workspace, 'checkpoint', '--repo', 'api', '--phase', '4', '--status', 'pending');
    for (let phase = 1; phase <= 3; phase += 1) assert.equal(reopened.phases[String(phase)].status, 'completed');
    for (let phase = 4; phase <= 8; phase += 1) assert.equal(reopened.phases[String(phase)].status, 'pending');
    assert.equal(reopened.status, 'in_progress');
    assert.equal(reopened.current_phase, 4);
    assert.equal(reopened.completed_at, undefined);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('phase ordering, artifact digests, convergence, and explicit reopening are state enforced', () => {
  const workspace = fixture('workspace-learning-phase-gates-');
  try {
    reject(
      workspace, 'codeqa-start', /requires completed Phases 1 and 2/,
      '--repo', 'api', '--task-id', 'task-1', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED', '--reason', 'too early',
    );
    reject(
      workspace, 'checkpoint', /Phase 2 requires all prior phases completed/,
      '--repo', 'api', '--phase', '2', '--status', 'in_progress',
    );
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '1', '--status', 'completed');
    reject(
      workspace, 'checkpoint', /Phase 2 completion requires SHA-256 details in this checkpoint/,
      '--repo', 'api', '--phase', '2', '--status', 'completed',
    );
    const digests = canonicalPhaseTwoDigests(workspace);
    const wrong = 'a'.repeat(64);
    reject(
      workspace, 'checkpoint', /Phase 2 completion digest mismatch/,
      '--repo', 'api', '--phase', '2', '--status', 'completed',
      '--detail', `local_study_digest=${wrong}`,
      '--detail', `operation_authority_digest=${wrong}`,
      '--detail', `invariants_failure_digest=${wrong}`,
    );
    run(
      workspace, 'checkpoint', '--repo', 'api', '--phase', '2', '--status', 'completed',
      '--detail', `local_study_digest=${digests.local_study_digest}`,
      '--detail', `operation_authority_digest=${digests.operation_authority_digest}`,
      '--detail', `invariants_failure_digest=${digests.invariants_failure_digest}`,
    );
    reject(
      workspace, 'checkpoint', /Phase 4 requires all prior phases completed/,
      '--repo', 'api', '--phase', '4', '--status', 'in_progress',
    );
    const corrupted = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    corrupted.repositories.find(record => record.name === 'api').phases['3'].status = 'completed';
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(corrupted, null, 2)}\n`);
    reject(
      workspace, 'checkpoint', /requires a current typed CodeQA convergence checkpoint/,
      '--repo', 'api', '--phase', '4', '--status', 'in_progress',
    );
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'pending');
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'in_progress');
    reject(
      workspace, 'checkpoint', /requires a current typed CodeQA convergence checkpoint/,
      '--repo', 'api', '--phase', '3', '--status', 'completed',
    );

    start(workspace);
    const rounds = [
      ['atlas', 'atlas lens', 'material'],
      ['source-challenge', 'source lens', 'material'],
      ['invariants-failure', 'failure lens', 'represented'],
      ['history-misunderstanding', 'history lens', 'none'],
    ];
    for (let index = 0; index < rounds.length; index += 1) {
      const taskId = `task-${index + 1}`;
      if (index > 0) continueTask(workspace, `task-${index}`, taskId);
      finishRound(workspace, {
        taskId,
        number: index + 1,
        name: rounds[index][0],
        lens: rounds[index][1],
        novelty: rounds[index][2],
      });
    }
    run(workspace, 'codeqa-convergence', '--repo', 'api');
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'completed');
    run(workspace, 'ensure-ignored', '--repo', 'api');
    run(workspace, 'snapshot', '--repo', 'api', '--label', 'baseline');
    reject(workspace, 'snapshot', /snapshot is immutable/, '--repo', 'api', '--label', 'baseline');
    for (let phase = 4; phase <= 7; phase += 1) {
      run(workspace, 'checkpoint', '--repo', 'api', '--phase', String(phase), '--status', 'completed');
    }
    reject(
      workspace, 'checkpoint', /fresh successful verify receipt/,
      '--repo', 'api', '--phase', '8', '--status', 'completed',
    );
    run(workspace, 'snapshot', '--repo', 'api', '--label', 'after-change');
    reject(workspace, 'snapshot', /snapshot is immutable/, '--repo', 'api', '--label', 'after-change');
    run(workspace, 'verify', '--repo', 'api', '--label', 'after-change');
    reject(
      workspace, 'checkpoint', /immutable baseline snapshot label/,
      '--repo', 'api', '--phase', '8', '--status', 'completed', '--label', 'after-change',
    );
    run(workspace, 'verify', '--repo', 'api', '--label', 'baseline');
    fs.appendFileSync(path.join(workspace, 'api', 'README.md'), 'changed after verify\n');
    reject(
      workspace, 'checkpoint', /Git status changed after verify/,
      '--repo', 'api', '--phase', '8', '--status', 'completed',
    );
    fs.writeFileSync(path.join(workspace, 'api', 'README.md'), '# fixture\n');
    run(workspace, 'verify', '--repo', 'api', '--label', 'baseline');
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '8', '--status', 'completed');
    assert.equal(recordFor(workspace).status, 'completed');
    reject(
      workspace, 'codeqa-continue', /requires Phase 3 in_progress/,
      '--repo', 'api', '--parent-task-id', 'task-4', '--task-id', 'task-5', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'PENDING',
    );

    const reopenedPhaseTwo = run(workspace, 'checkpoint', '--repo', 'api', '--phase', '2', '--status', 'in_progress');
    assert.equal(reopenedPhaseTwo.status, 'in_progress');
    assert.equal(reopenedPhaseTwo.completed_at, undefined);
    assert.equal(reopenedPhaseTwo.code_qa.convergence, null);
    assert.equal(reopenedPhaseTwo.code_qa.convergence_floor_round, 4);
    for (let phase = 3; phase <= 8; phase += 1) assert.equal(reopenedPhaseTwo.phases[String(phase)].status, 'pending');
    run(
      workspace, 'checkpoint', '--repo', 'api', '--phase', '2', '--status', 'completed',
      '--detail', `local_study_digest=${digests.local_study_digest}`,
      '--detail', `operation_authority_digest=${digests.operation_authority_digest}`,
      '--detail', `invariants_failure_digest=${digests.invariants_failure_digest}`,
    );
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'in_progress');
    reject(workspace, 'codeqa-convergence', /after convergence floor 4/, '--repo', 'api');
    continueTask(workspace, 'task-4', 'task-5');
    finishRound(workspace, {
      taskId: 'task-5', number: 5, name: 'gap closure', lens: 'fresh boundary lens', novelty: 'represented',
    });
    reject(workspace, 'codeqa-convergence', /after convergence floor 4/, '--repo', 'api');
    continueTask(workspace, 'task-5', 'task-6');
    finishRound(workspace, {
      taskId: 'task-6', number: 6, name: 'gap closure', lens: 'fresh failure lens', novelty: 'none',
    });
    run(workspace, 'codeqa-convergence', '--repo', 'api');
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'completed');
    for (let phase = 4; phase <= 7; phase += 1) {
      run(workspace, 'checkpoint', '--repo', 'api', '--phase', String(phase), '--status', 'completed');
    }
    run(workspace, 'verify', '--repo', 'api', '--label', 'baseline');
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '8', '--status', 'completed');

    const reopened = run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'in_progress');
    assert.equal(reopened.status, 'in_progress');
    assert.equal(reopened.completed_at, undefined);
    assert.equal(reopened.code_qa.convergence, null);
    assert.equal(reopened.code_qa.convergence_floor_round, 6);
    assert.equal(reopened.code_qa.rounds.length, 6, 'deliberate Phase 3 reopening preserves prior rounds');
    for (let phase = 4; phase <= 8; phase += 1) assert.equal(reopened.phases[String(phase)].status, 'pending');
    reject(workspace, 'codeqa-convergence', /after convergence floor 6/, '--repo', 'api');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('legacy DOMAIN-AUTHORITY checkpoints migrate audibly and must resume at Phase 2', () => {
  const workspace = fixture('workspace-learning-contract-migration-');
  try {
    const file = stateFile(workspace);
    const legacy = JSON.parse(fs.readFileSync(file, 'utf8'));
    const api = legacy.repositories.find(record => record.name === 'api');
    delete api.workflow_contract_version;
    delete api.artifact_contract_version;
    delete api.contract_applied_at;
    delete api.contract_restudy_required;
    delete api.contract_migrations;
    api.status = 'completed';
    api.current_phase = 8;
    api.completed_at = '2026-09-01T00:00:00.000Z';
    api.contract_restudy_completed_at = '2026-09-01T00:00:00.000Z';
    api.details = {
      authority_artifact: '.agents/repository-learning/DOMAIN-AUTHORITY.md',
      domain_authority_digest: 'legacy-digest',
      preserved_legacy_detail: 'audit me',
      local_study_digest: 'b'.repeat(64),
      operation_authority_digest: 'b'.repeat(64),
      invariants_failure_digest: 'b'.repeat(64),
      code_qa_task_id: 'legacy-code-qa-task',
      code_qa_task_status: 'COMPLETED',
      code_qa_transport: 'cli',
      parity_state: 'COMPLETED',
    };
    for (let phase = 1; phase <= 8; phase += 1) {
      api.phases[String(phase)] = {
        status: 'completed',
        note: phase === 2 ? 'generated DOMAIN-AUTHORITY.md' : `legacy phase ${phase}`,
      };
    }
    api.phases['1'].details = {
      domain_authority_path: '.agents/repository-learning/DOMAIN-AUTHORITY.md',
      phase1_preserved: 'keep me',
    };
    api.phases['2'].details = {
      local_study_digest: 'c'.repeat(64),
      operation_authority_digest: 'c'.repeat(64),
      invariants_failure_digest: 'c'.repeat(64),
    };
    api.phases['3'].details = {
      code_qa_task_id: 'legacy-code-qa-task',
      code_qa_task_status: 'COMPLETED',
      code_qa_transport: 'cli',
    };
    const zeta = legacy.repositories.find(record => record.name === 'zeta');
    zeta.status = 'in_progress';
    zeta.current_phase = 1;
    zeta.phases['1'].status = 'in_progress';
    fs.writeFileSync(file, `${JSON.stringify(legacy, null, 2)}\n`);

    const inspection = run(workspace, 'contract-status', '--repo', 'api');
    assert.equal(inspection.needs_migration, true);
    assert.equal(inspection.resume_phase, 2);
    assert.equal(inspection.legacy_code_qa_state_detected, true);
    assert.ok(inspection.legacy_authority_references.includes('details.authority_artifact'));
    assert.equal(run(workspace, 'next').name, 'zeta', 'normal in-progress work must precede completed migration fallback');
    const withZetaComplete = JSON.parse(fs.readFileSync(file, 'utf8'));
    const completedZeta = withZetaComplete.repositories.find(record => record.name === 'zeta');
    completedZeta.status = 'completed';
    completedZeta.current_phase = 8;
    for (let phase = 1; phase <= 8; phase += 1) completedZeta.phases[String(phase)].status = 'completed';
    fs.writeFileSync(file, `${JSON.stringify(withZetaComplete, null, 2)}\n`);
    assert.equal(run(workspace, 'next').name, 'api', 'completed legacy work must prevent workspace_complete');
    reject(
      workspace,
      'checkpoint',
      /requires workflow\/artifact contract migration/,
      '--repo', 'api', '--phase', '3', '--status', 'in_progress',
    );

    const result = run(workspace, 'contract-migrate', '--repo', 'api');
    assert.equal(result.migrated, true);
    assert.equal(result.needs_migration, false);
    assert.equal(result.phase_2_restudy_required, true);
    assert.deepEqual(result.migration.invalidated_phases, [2, 3, 4, 5, 6, 7, 8]);
    assert.equal(result.migration.legacy_checkpoint.details.preserved_legacy_detail, 'audit me');
    assert.equal(result.migration.legacy_checkpoint.details.domain_authority_digest, 'legacy-digest');
    assert.equal(result.migration.legacy_checkpoint.details.code_qa_task_id, 'legacy-code-qa-task');
    assert.equal(result.migration.legacy_checkpoint.code_qa, null);

    const migrated = recordFor(workspace);
    assert.equal(migrated.workflow_contract_version, 2);
    assert.equal(migrated.artifact_contract_version, 2);
    assert.equal(migrated.current_phase, 2);
    assert.equal(migrated.status, 'in_progress');
    assert.equal(migrated.completed_at, undefined);
    assert.equal(migrated.contract_restudy_completed_at, undefined);
    assert.equal(migrated.code_qa, undefined);
    assert.deepEqual(migrated.details, { preserved_legacy_detail: 'audit me', parity_state: 'COMPLETED' });
    assert.equal(migrated.phases['1'].note, 'legacy phase 1');
    assert.deepEqual(migrated.phases['1'].details, { phase1_preserved: 'keep me' });
    for (let phase = 2; phase <= 8; phase += 1) {
      assert.equal(migrated.phases[String(phase)].status, 'pending');
      assert.equal(migrated.phases[String(phase)].invalidated_by_workflow_contract_version, 2);
    }

    reject(
      workspace,
      'codeqa-start',
      /requires Phase 2 restudy/,
      '--repo', 'api', '--task-id', 'new-task', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED', '--reason', 'probe',
    );
    reject(
      workspace,
      'checkpoint',
      /cannot resume until Phase 2 is completed/,
      '--repo', 'api', '--phase', '3', '--status', 'in_progress',
    );
    reject(
      workspace,
      'checkpoint',
      /requires SHA-256 details/,
      '--repo', 'api', '--phase', '2', '--status', 'completed',
    );

    const digests = canonicalPhaseTwoDigests(workspace);
    const digest = 'a'.repeat(64);
    reject(
      workspace,
      'checkpoint',
      /completion digest mismatch/,
      '--repo', 'api', '--phase', '2', '--status', 'completed',
      '--detail', `local_study_digest=${digest}`,
      '--detail', `operation_authority_digest=${digest}`,
      '--detail', `invariants_failure_digest=${digest}`,
    );
    run(
      workspace,
      'checkpoint',
      '--repo', 'api',
      '--phase', '2',
      '--status', 'completed',
      '--note', 'canonical artifacts rebuilt',
      '--detail', `local_study_digest=${digests.local_study_digest}`,
      '--detail', `operation_authority_digest=${digests.operation_authority_digest}`,
      '--detail', `invariants_failure_digest=${digests.invariants_failure_digest}`,
    );
    assert.equal(run(workspace, 'contract-status', '--repo', 'api').phase_2_restudy_required, false);
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'in_progress');
    assert.equal(start(workspace, 'new-task').current_task_id, 'new-task');

    const merged = run(workspace, 'init');
    const afterMerge = merged.repositories.find(record => record.name === 'api');
    assert.equal(afterMerge.workflow_contract_version, 2);
    assert.equal(afterMerge.contract_migrations.length, 1);
    assert.equal(afterMerge.code_qa.current_task_id, 'new-task');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('pre-revision typed CodeQA schema is terminally observed, quarantined, and never coerced into v2', () => {
  const workspace = codeQaFixture('workspace-learning-old-typed-codeqa-');
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    const api = state.repositories.find(record => record.name === 'api');
    api.code_qa = {
      schema_version: 1,
      generation: 1,
      transport: 'mcp',
      root_task_id: 'legacy-root',
      current_task_id: 'legacy-current',
      parent_task_id: 'legacy-root',
      status: 'CREATED',
      generations: [{
        generation: 1, transport: 'mcp', root_task_id: 'legacy-root',
        reason: 'pre-revision native MCP run', started_at: '2026-09-08T00:00:00.000Z',
      }],
      tasks: [
        {
          task_id: 'legacy-root', generation: 1, transport: 'mcp', parent_task_id: null,
          kind: 'start', status: 'COMPLETED',
          result_checkpoint: {
            id: 'sha256:legacy-result', ingested: true,
            ingested_at: '2026-09-08T00:01:00.000Z', round_number: 1,
          },
          created_at: '2026-09-08T00:00:00.000Z', updated_at: '2026-09-08T00:01:00.000Z',
        },
        {
          task_id: 'legacy-current', generation: 1, transport: 'mcp', parent_task_id: 'legacy-root',
          kind: 'continuation', status: 'CREATED', result_checkpoint: null,
          created_at: '2026-09-08T00:02:00.000Z', updated_at: '2026-09-08T00:02:00.000Z',
        },
      ],
      rounds: [{
        number: 1, name: 'provider-bootstrap-degenerate', lens: 'transport bootstrap',
        task_id: 'legacy-root', generation: 1, transport: 'mcp', status: 'COMPLETED',
        terminal_successful: true, result_checkpoint_id: 'sha256:legacy-result',
        locally_reconciled: true, novelty: 'none', material_novelty: false,
        represented_only: false, represented_locally_verified: false,
        recorded_at: '2026-09-08T00:01:00.000Z',
      }],
      recoveries: [],
      convergence: null,
      created_at: '2026-09-08T00:00:00.000Z',
      updated_at: '2026-09-08T00:02:00.000Z',
    };
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);

    const inspection = run(workspace, 'contract-status', '--repo', 'api');
    assert.equal(inspection.needs_migration, true);
    assert.equal(inspection.legacy_code_qa_state_detected, true);
    assert.equal(inspection.recorded_code_qa_schema_version, 1);
    assert.equal(inspection.current_code_qa_schema_version, 2);
    reject(workspace, 'contract-migrate', /legacy CodeQA state is CREATED/, '--repo', 'api');
    reject(
      workspace, 'contract-observe-codeqa', /current task mismatch/,
      '--repo', 'api', '--task-id', 'legacy-root', '--transport', 'mcp',
      '--status', 'FAILED', '--evidence-id', 'legacy-terminal-1',
    );
    const observation = run(
      workspace, 'contract-observe-codeqa', '--repo', 'api', '--task-id', 'legacy-current',
      '--transport', 'mcp', '--status', 'FAILED', '--evidence-id', 'legacy-terminal-1',
    );
    assert.equal(observation.migration_ready, true);
    const migration = run(workspace, 'contract-migrate', '--repo', 'api').migration;
    assert.deepEqual(migration.code_qa_schema_transition, {
      from_code_qa_schema_version: 1,
      to_code_qa_schema_version: 2,
      action: 'archived-not-coerced',
    });
    assert.match(migration.reason, /archive legacy CodeQA schema v1 without coercion/);
    assert.equal(migration.legacy_checkpoint.code_qa.schema_version, 1);
    assert.equal(
      migration.legacy_checkpoint.code_qa.tasks[0].result_checkpoint.semantic_success,
      undefined,
      'the incompatible result is preserved verbatim rather than fabricated',
    );
    assert.equal(migration.legacy_checkpoint.code_qa.rounds[0].name, 'provider-bootstrap-degenerate');
    assert.equal(migration.legacy_checkpoint.contract_terminal_observations[0].evidence_id, 'legacy-terminal-1');
    const migrated = recordFor(workspace);
    assert.equal(migrated.code_qa, undefined);
    assert.equal(migrated.contract_restudy_required, true);
    for (let phase = 2; phase <= 8; phase += 1) assert.equal(migrated.phases[String(phase)].status, 'pending');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('current contracts still migrate key-only legacy domain authority state', () => {
  const workspace = fixture('workspace-learning-domain-authority-key-');
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    state.repositories.find(record => record.name === 'api').details.domain_authority_digest = 'legacy-digest';
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);
    const inspection = run(workspace, 'contract-status', '--repo', 'api');
    assert.equal(inspection.needs_migration, true);
    assert.ok(inspection.legacy_authority_references.includes('details.domain_authority_digest'));
    const migrated = run(workspace, 'contract-migrate', '--repo', 'api');
    assert.deepEqual(migrated.migration.invalidated_phases, []);
    assert.equal(recordFor(workspace).details.domain_authority_digest, undefined);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('flat legacy CodeQA checkpoints block duplicate creation until exact terminal evidence is observed', () => {
  const workspace = fixture('workspace-learning-legacy-codeqa-observe-');
  try {
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '1', '--status', 'completed');
    const digests = canonicalPhaseTwoDigests(workspace);
    run(
      workspace, 'checkpoint', '--repo', 'api', '--phase', '2', '--status', 'completed',
      '--detail', `local_study_digest=${digests.local_study_digest}`,
      '--detail', `operation_authority_digest=${digests.operation_authority_digest}`,
      '--detail', `invariants_failure_digest=${digests.invariants_failure_digest}`,
    );
    reject(
      workspace, 'checkpoint', /reserves typed CodeQA task details/,
      '--repo', 'api', '--phase', '3', '--status', 'in_progress', '--detail', 'code_qa_task_id=legacy-live-task',
    );
    run(workspace, 'checkpoint', '--repo', 'api', '--phase', '3', '--status', 'in_progress');
    const legacy = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    const legacyApi = legacy.repositories.find(record => record.name === 'api');
    const flatCheckpoint = {
      code_qa_task_id: 'legacy-live-task',
      code_qa_task_status: 'RUNNING',
      code_qa_status: 'PENDING',
      code_qa_transport: 'cli',
      parity_state: 'COMPLETED',
    };
    Object.assign(legacyApi.details, flatCheckpoint);
    legacyApi.phases['3'].details = structuredClone(flatCheckpoint);
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(legacy, null, 2)}\n`);

    assert.equal(run(workspace, 'contract-status', '--repo', 'api').needs_migration, true);
    reject(
      workspace, 'codeqa-start', /requires workflow\/artifact contract migration/,
      '--repo', 'api', '--task-id', 'duplicate', '--intent-id', 'missing-intent', '--transport', 'mcp', '--status', 'CREATED', '--reason', 'must not duplicate',
    );
    const before = fs.readFileSync(stateFile(workspace), 'utf8');
    reject(workspace, 'contract-migrate', /legacy CodeQA state is .*RUNNING.*PENDING/, '--repo', 'api');
    assert.equal(fs.readFileSync(stateFile(workspace), 'utf8'), before);
    reject(
      workspace, 'contract-observe-codeqa', /current task mismatch/,
      '--repo', 'api', '--task-id', 'wrong-task', '--transport', 'cli', '--status', 'COMPLETED', '--evidence-id', 'provider-event-1',
    );
    reject(
      workspace, 'contract-observe-codeqa', /transport mismatch/,
      '--repo', 'api', '--task-id', 'legacy-live-task', '--transport', 'mcp', '--status', 'COMPLETED', '--evidence-id', 'provider-event-1',
    );
    reject(
      workspace, 'contract-observe-codeqa', /accepts only terminal/,
      '--repo', 'api', '--task-id', 'legacy-live-task', '--transport', 'cli', '--status', 'PENDING', '--evidence-id', 'provider-event-1',
    );
    const observation = run(
      workspace, 'contract-observe-codeqa', '--repo', 'api', '--task-id', 'legacy-live-task',
      '--transport', 'cli', '--status', 'COMPLETED', '--evidence-id', 'provider-event-1',
    );
    assert.equal(observation.migration_ready, true);
    const observed = recordFor(workspace);
    assert.equal(observed.details.code_qa_task_status, 'COMPLETED');
    assert.equal(observed.details.code_qa_status, 'COMPLETED');
    assert.equal(observed.phases['3'].details.code_qa_task_status, 'COMPLETED');
    assert.equal(observed.details.parity_state, 'COMPLETED');
    assert.equal(observed.contract_terminal_observations[0].evidence_id, 'provider-event-1');
    reject(
      workspace, 'contract-observe-codeqa', /duplicate legacy CodeQA observation evidence ID/,
      '--repo', 'api', '--task-id', 'legacy-live-task', '--transport', 'cli', '--status', 'COMPLETED', '--evidence-id', 'provider-event-1',
    );
    reject(
      workspace, 'contract-observe-codeqa', /terminal status is immutable/,
      '--repo', 'api', '--task-id', 'legacy-live-task', '--transport', 'cli', '--status', 'FAILED', '--evidence-id', 'provider-event-2',
    );

    const migrated = run(workspace, 'contract-migrate', '--repo', 'api');
    assert.equal(migrated.migration.legacy_checkpoint.contract_terminal_observations[0].evidence_id, 'provider-event-1');
    assert.equal(recordFor(workspace).details.parity_state, 'COMPLETED');
    assert.equal(recordFor(workspace).details.code_qa_task_id, undefined);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('contract migration metadata-upgrades untouched Phase 1 work and requires complete legacy task identity', () => {
  const workspace = fixture('workspace-learning-contract-phase-one-');
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(workspace), 'utf8'));
    const api = state.repositories.find(record => record.name === 'api');
    delete api.workflow_contract_version;
    delete api.artifact_contract_version;
    delete api.contract_applied_at;
    delete api.contract_restudy_required;
    delete api.contract_migrations;
    api.details = { code_qa_transport: 'mcp', phase_one_note: 'transport selected before any task' };
    const zeta = state.repositories.find(record => record.name === 'zeta');
    zeta.details = { code_qa_task_status: 'COMPLETED' };
    fs.writeFileSync(stateFile(workspace), `${JSON.stringify(state, null, 2)}\n`);

    const inspection = run(workspace, 'contract-status', '--repo', 'api');
    assert.equal(inspection.needs_migration, true);
    assert.equal(inspection.resume_phase, 1);
    assert.equal(inspection.legacy_code_qa_state_detected, false, 'transport choice alone is not an active task');
    const migrated = run(workspace, 'contract-migrate', '--repo', 'api');
    assert.deepEqual(migrated.migration.invalidated_phases, []);
    assert.equal(migrated.phase_2_restudy_required, false);
    const active = recordFor(workspace);
    assert.equal(active.current_phase, 1);
    assert.equal(active.status, 'pending');
    assert.equal(active.phases['1'].status, 'pending');
    assert.equal(active.phases['2'].status, 'pending');
    assert.equal(active.phases['2'].invalidated_at, undefined);
    assert.deepEqual(active.details, { phase_one_note: 'transport selected before any task' });
    assert.equal(migrated.migration.legacy_checkpoint.details.code_qa_transport, 'mcp');

    reject(
      workspace, 'contract-migrate', /current task identity cannot be proven/,
      '--repo', 'zeta',
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
