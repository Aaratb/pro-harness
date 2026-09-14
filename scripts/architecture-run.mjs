#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fingerprintArchitecture } from './architecture-source.mjs';
import { digestFile, digestValue } from './lib/digests.mjs';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { decideArtifactScope } from './lib/project-discovery.mjs';
import { resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { readFileNoFollow } from './lib/review-safety.mjs';
import { validateTrace } from './lib/workflow-trace.mjs';
import { withTraceLock } from './lib/workflow-trace-storage.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'config', 'architecture-pro.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'commands', 'architecture-pro', 'contract.json'), 'utf8'));
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MODES = {
  DESIGN: 'DESIGN',
  AUDIT: 'AUDIT',
  MIXED: 'MIXED',
  ADR_ONLY: 'ADR_ONLY',
  'ADR-ONLY': 'ADR_ONLY',
};
const OCCUPIED_TRACE_FILES = ['run-events.jsonl', 'run-events.continuation.jsonl', 'trace-recovery.json'];
const MODE_PHASES = {
  AUDIT: new Set(contract.modes.audit),
  DESIGN: new Set(contract.modes.design),
  MIXED: new Set(contract.modes.mixed),
  ADR_ONLY: new Set(contract.modes['adr-only']),
};

class RunError extends Error {
  constructor(message, { code = 1, payload = {} } = {}) {
    super(message);
    this.code = code;
    this.payload = payload;
  }
}

function print(payload, code = 0) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (code) process.exitCode = code;
}

function usage() {
  return 'usage: architecture-run.mjs initialize --slug <architecture-slug> --mode DESIGN|AUDIT|MIXED|ADR_ONLY [--repo <path>] [--title <title>] [--initiative <name>] [--repos <path,path>]';
}

function parseArguments(argv) {
  const args = [...argv];
  const operation = args.shift();
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag.startsWith('--')) throw new RunError(`unexpected argument ${flag}`);
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new RunError(`${flag} requires a value`);
    values.set(flag, args[index + 1]);
    index += 1;
  }
  return { operation, value: (flag, fallback) => values.get(flag) ?? fallback, has: (flag) => values.has(flag) };
}

function normalizeMode(value) {
  const key = String(value ?? '').trim().toUpperCase();
  const mode = MODES[key] ?? MODES[key.replace(/_/g, '-')];
  if (!mode) throw new RunError('mode must be DESIGN, AUDIT, MIXED, or ADR_ONLY');
  return mode;
}

function titleFrom(slug, explicit) {
  const title = String(explicit ?? slug.replace(/-/g, ' ')).trim();
  if (!title || title.length > 200) throw new RunError('architecture title must be 1-200 characters');
  return title;
}

function additionalRepositories(value) {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function gitToplevel(start) {
  const reported = execFileSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return canonicalRoot(reported);
}

function artifactExclusion(gitRoot, artifactRoot) {
  const relative = path.relative(gitRoot, artifactRoot).split(path.sep).join('/');
  if (!relative || relative === '..' || relative.startsWith(`../`) || path.isAbsolute(relative)) return null;
  return relative;
}

function contractDigests(loadedAt) {
  const commandDigest = digestFile(path.join(harnessRoot, 'commands', 'architecture-pro.md'));
  const governanceDigest = digestFile(path.join(harnessRoot, 'skills', 'architecture-pro-governance', 'SKILL.md'));
  const routingDigest = digestFile(path.join(harnessRoot, 'commands', 'architecture-pro', 'routing.md'));
  const contractDigest = digestFile(path.join(harnessRoot, 'commands', 'architecture-pro', 'contract.json'));
  const provenance = {
    schema_version: 'architecture-pro/harness-provenance@1',
    command_digest: commandDigest,
    governance_skill_digest: governanceDigest,
    routing_digest: routingDigest,
    contract_digest: contractDigest,
  };
  return {
    loaded_contract: {
      command_digest: commandDigest,
      governance_skill_digest: governanceDigest,
      routing_digest: routingDigest,
      contract_digest: contractDigest,
      loaded_at: loadedAt,
    },
    harness_provenance_digest: digestValue(provenance),
  };
}

function phaseMap(mode) {
  const active = MODE_PHASES[mode];
  return Object.fromEntries(Array.from({ length: 13 }, (_, index) => {
    const number = index + 1;
    if (number === 1) return ['1', 'in_progress'];
    return [String(number), active.has(number) ? 'pending' : 'skipped'];
  }));
}

function budgetUsage() {
  return Object.fromEntries(Object.keys(policy.budgets).map((name) => [name, 0]));
}

function workflowEvent({ runId, event, status, summary, phase, occurredAt, artifacts }) {
  return {
    schema_version: 'pro-harness/workflow-event@1',
    event_id: crypto.randomUUID(),
    run_id: runId,
    workflow: 'architecture-pro',
    event,
    ...(phase === undefined ? {} : { phase }),
    status,
    occurred_at: occurredAt,
    summary,
    artifacts,
  };
}

function encodeTrace(events) {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function writeExclusive(root, relativePath, contents) {
  const target = containedPath(root, relativePath, { allowMissingLeaf: true });
  const fd = fs.openSync(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try {
    fs.fchmodSync(fd, 0o600);
    fs.writeFileSync(fd, contents);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function existingRegularFile(root, relativePath) {
  const absolute = path.join(root, relativePath);
  const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stat) return null;
  if (stat.isSymbolicLink()) throw new RunError(`${relativePath} is a symlink; refuse to initialize through a link`);
  if (!stat.isFile()) throw new RunError(`${relativePath} exists and is not a regular file`);
  return absolute;
}

function occupiedTrace(artifactRoot) {
  for (const name of OCCUPIED_TRACE_FILES) {
    if (!existingRegularFile(artifactRoot, name)) continue;
    let runId = null;
    if (name !== 'trace-recovery.json') {
      try {
        const first = readFileNoFollow(artifactRoot, name).toString('utf8').split('\n').find(Boolean);
        if (first) runId = JSON.parse(first).run_id ?? null;
      } catch {
        runId = null;
      }
    }
    return { file: name, run_id: runId };
  }
  return null;
}

function occupiedState(artifactRoot) {
  return Boolean(existingRegularFile(artifactRoot, 'state.json'));
}

function refuseOccupied(kind, details) {
  const runLabel = details.run_id ? ` run ${details.run_id}` : '';
  throw new RunError(
    `artifact root already contains ${kind}${runLabel}; initialize a new slug and reverify old artifacts as untrusted evidence`,
    {
      payload: {
        occupied: details,
        next_actions: [
          'Choose a new architecture slug that does not already contain state.json or a workflow trace.',
          'Keep the previous root byte-for-byte. Reverify its artifacts as evidence in the new run; do not treat them as completed workflow history.',
        ],
      },
    },
  );
}

function resolveScope(args) {
  const start = canonicalRoot(args.value('--repo') ?? args.value('--repo-root') ?? process.cwd());
  const slug = args.value('--slug');
  if (!slug) throw new RunError(usage());
  if (!SLUG.test(slug)) throw new RunError('slug must be 1-64 lowercase letters, digits, or interior hyphens');
  const scope = decideArtifactScope({
    startDirectory: start,
    family: 'architecture',
    slug,
    requestedInitiative: args.value('--initiative') ?? '',
    create: true,
  });
  if (scope.status === 'needs-initiative') {
    throw new RunError(scope.ambiguous
      ? 'this architecture slug exists under more than one initiative'
      : 'select the initiative this architecture belongs to', {
      code: 2,
      payload: {
        status: 'needs-initiative',
        workspace_root: scope.workspace.workspaceRoot,
        matching: scope.matching,
        available: scope.available,
        next_actions: ['Re-run with --initiative <name>, using an existing initiative or a new one.'],
      },
    });
  }
  const resolved = resolveRepositoryArtifactRoot({
    startDirectory: start,
    artifactRelative: scope.artifactRelative,
    create: true,
    ...(scope.status === 'project'
      ? { rootOverride: scope.projectRoot, containmentRoot: scope.workspace.workspaceRoot }
      : {}),
  });
  return {
    slug,
    scope: scope.status,
    initiative: scope.initiative,
    workspaceRoot: scope.workspace?.workspaceRoot,
    repositoryRoot: resolved.repositoryRoot,
    artifactRoot: resolved.artifactRoot,
    artifactRelative: scope.artifactRelative,
    sourceRepositoryRoot: gitToplevel(start),
  };
}

function initialize(args) {
  const mode = normalizeMode(args.value('--mode'));
  const resolved = resolveScope(args);
  const title = titleFrom(resolved.slug, args.value('--title'));
  const extraRepos = additionalRepositories(args.value('--repos'));
    try {
      return withTraceLock(resolved.artifactRoot, () => {
    if (occupiedState(resolved.artifactRoot)) refuseOccupied('state.json', { file: 'state.json' });
    const trace = occupiedTrace(resolved.artifactRoot);
    if (trace) refuseOccupied(trace.file, trace);

    const loadedAt = new Date().toISOString();
    const captured = fingerprintArchitecture({
      repositoryRoot: resolved.sourceRepositoryRoot,
      artifactRelative: artifactExclusion(resolved.sourceRepositoryRoot, resolved.artifactRoot),
      additionalRepositories: extraRepos,
    });
    const { loaded_contract: loadedContract, harness_provenance_digest: harnessProvenanceDigest } = contractDigests(loadedAt);
    const runId = `architecture-${crypto.randomUUID()}`;
    const runStarted = workflowEvent({
      runId,
      event: 'run-started',
      status: 'in-progress',
      summary: `Architecture Pro ${mode} run initialized.`,
      occurredAt: loadedAt,
      artifacts: ['state.json'],
    });
    const phaseStarted = workflowEvent({
      runId,
      event: 'phase-started',
      phase: 1,
      status: 'in-progress',
      summary: 'Phase 1 intake started.',
      occurredAt: loadedAt,
      artifacts: ['state.json'],
    });
    const traceContent = encodeTrace([runStarted, phaseStarted]);
    const { errors } = validateTrace(traceContent, { expectedWorkflow: 'architecture-pro', expectedRunId: runId });
    if (errors.length) throw new RunError(`initial trace is invalid: ${errors.map((error) => error.message).join('; ')}`);

    const state = {
      schema_version: 'architecture-pro/state@1',
      architecture_slug: resolved.slug,
      architecture_title: title,
      command: 'architecture-pro',
      run_id: runId,
      mode,
      artifact_root: resolved.artifactRelative,
      loaded_contract: loadedContract,
      input_fingerprint: {
        source_fingerprint_digest: captured.digest,
        repositories: captured.repositories,
      },
      harness_provenance_digest: harnessProvenanceDigest,
      current_phase: 1,
      phases: phaseMap(mode),
      lane_runs: {},
      security_focus_runs: {},
      consent_receipts: [],
      decision_reopens: 0,
      transition_log: [],
      outcome_axes: {
        health_grade: null,
        evidence_confidence: 'INSUFFICIENT',
        target_attainment: 'UNVERIFIED',
      },
      audit_certification: 'pending',
      design_certification: 'pending',
      artifact_digests: {},
      handoff_digest: null,
      budget_usage: budgetUsage(),
      workflow_trace: {
        path: 'run-events.jsonl',
        schema: 'pro-harness/workflow-event@1',
        status: 'pending',
        last_event_id: phaseStarted.event_id,
        validated_at: loadedAt,
      },
    };
    assertJsonSchema(state, path.join(harnessRoot, 'schemas', 'architecture-pro', 'state.schema.json'), 'Architecture Pro state');

    writeExclusive(resolved.artifactRoot, 'run-events.jsonl', traceContent);
    if (process.env.PRO_HARNESS_TEST_FAIL_AFTER === 'trace') {
      throw new RunError('injected test failure after trace write');
    }
    writeExclusive(resolved.artifactRoot, 'state.json', `${JSON.stringify(state, null, 2)}\n`);

    return {
      status: 'success',
      summary: `initialized Architecture Pro run ${runId}`,
      run_id: runId,
      mode,
      architecture_slug: resolved.slug,
      scope: resolved.scope,
      ...(resolved.scope === 'project' ? { initiative: resolved.initiative, workspace_root: resolved.workspaceRoot } : {}),
      repository_root: resolved.repositoryRoot,
      artifact_root: resolved.artifactRoot,
      artifact_relative: resolved.artifactRelative,
      artifacts: ['state.json', 'run-events.jsonl'],
      next_actions: [
        'Continue Phase 1 intake under the resolved artifact root.',
        'Invoke scripts/run-workflow-hook.mjs --workflow architecture-pro --event before-phase-transition before leaving Phase 1.',
        'If another slug already has a trace, keep that root unchanged and reverify its artifacts as untrusted evidence; do not mark those phases complete.',
      ],
    };
  });
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      throw new RunError('architecture root is locked by another initialize or trace writer; retry once');
    }
    throw error;
  }
}

try {
  const args = parseArguments(process.argv.slice(2));
  if (args.operation === '--help' || args.has('--help')) {
    print({ usage: usage(), operations: ['initialize'], modes: ['DESIGN', 'AUDIT', 'MIXED', 'ADR_ONLY'] });
  } else if (args.operation === 'initialize' || args.operation === 'init') {
    print(initialize(args));
  } else {
    throw new RunError(usage());
  }
} catch (error) {
  const payload = error instanceof RunError ? error.payload : {};
  if (payload.status === 'needs-initiative') {
    print({ ...payload, summary: error.message, artifacts: payload.artifacts ?? [] }, error.code);
  } else {
    print({
      status: 'error',
      summary: error.message,
      artifacts: [],
      next_actions: payload.next_actions ?? ['Correct the repository, slug, or mode and retry initialize against an unoccupied architecture root.'],
      ...(payload.occupied ? { occupied: payload.occupied } : {}),
    }, error instanceof RunError ? error.code : 1);
  }
}
