#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const SCHEMA_VERSION = 1;
const PHASE_COUNT = 8;
const PHASE_STATUSES = new Set(['pending', 'in_progress', 'completed', 'blocked']);
const WORKFLOW_CONTRACT_VERSION = 2;
const ARTIFACT_CONTRACT_VERSION = 2;
const CANONICAL_LEARNING_ARTIFACTS = [
  'LOCAL-STUDY.md',
  'OPERATION-AUTHORITY.md',
  'INVARIANTS-AND-FAILURE.md',
  'EXTERNAL-INTERROGATION.md',
  'CONVERGENCE.md',
];
const PHASE_TWO_CONTRACT_FILES = {
  local_study_digest: '.agents/repository-learning/LOCAL-STUDY.md',
  operation_authority_digest: '.agents/repository-learning/OPERATION-AUTHORITY.md',
  invariants_failure_digest: '.agents/repository-learning/INVARIANTS-AND-FAILURE.md',
};
const PHASE_TWO_CONTRACT_DIGESTS = Object.keys(PHASE_TWO_CONTRACT_FILES);
const CODE_QA_SCHEMA_VERSION = 2;
const CODE_QA_TRANSPORTS = new Set(['mcp', 'cli']);
const CODE_QA_STATUSES = new Set(['CREATED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);
const CODE_QA_TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const CODE_QA_STATUS_TRANSITIONS = new Map([
  ['CREATED', new Set(['CREATED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])],
  ['PENDING', new Set(['CREATED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])],
  ['RUNNING', new Set(['CREATED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])],
  ['COMPLETED', new Set(['COMPLETED'])],
  ['FAILED', new Set(['FAILED'])],
  ['CANCELLED', new Set(['CANCELLED'])],
]);
const CODE_QA_NOVELTY = new Set(['material', 'represented', 'none']);
const CODE_QA_CORE_ROUNDS = ['atlas', 'source-challenge', 'invariants-failure', 'history-misunderstanding'];
const CODE_QA_INTENT_KINDS = new Set(['start', 'continue', 'recover']);
const CODE_QA_INTENT_RESOLUTIONS = new Set(['no-task-created']);
// A CodeQA lane may be attested unavailable ONLY when the provider cannot be
// reached at all for this repository. Both causes are environmental boundaries,
// not outcomes of an interrogation:
//   mcp-surface-absent        - the native MCP surface is not provisioned in
//                               this environment (no CodeQA deployment at all).
//   repository-not-accessible - the surface is healthy but the provider cannot
//                               reach this repository, so no task can exist
//                               (for example a repository outside the org the
//                               CodeQA installation is granted).
// A reachable provider that fails, refuses, is cancelled, times out, or is
// merely unhealthy is NOT a qualifying cause: that lane stays blocked so a
// genuine interrogation failure can never be relabelled as an absent provider.
const CODE_QA_UNAVAILABLE_CAUSES = new Set(['mcp-surface-absent', 'repository-not-accessible']);
const CODE_QA_UNAVAILABLE_SCHEMA_VERSION = 1;
const CODE_QA_NONCONVERGENT_CLOSE_SCHEMA_VERSION = 1;
const CODE_QA_NONCONVERGENT_CLOSE_MIN_ROUNDS = 8;
const LEGACY_CODE_QA_TASK_KEYS = ['code_qa_task_id'];
const LEGACY_CODE_QA_TRANSPORT_KEYS = ['code_qa_transport'];
const LEGACY_CODE_QA_STATUS_KEYS = ['code_qa_task_status', 'code_qa_status'];
const LEGACY_CODE_QA_DETAIL_KEYS = new Set([
  ...LEGACY_CODE_QA_TASK_KEYS,
  ...LEGACY_CODE_QA_TRANSPORT_KEYS,
  ...LEGACY_CODE_QA_STATUS_KEYS,
  'code_qa_root_task_id',
  'code_qa_parent_task_id',
]);
const LEGACY_CODE_QA_TASK_STATE_KEYS = new Set([
  ...LEGACY_CODE_QA_TASK_KEYS,
  ...LEGACY_CODE_QA_STATUS_KEYS,
  'code_qa_root_task_id',
  'code_qa_parent_task_id',
]);
const ARTIFACT_PATHS = ['.agents/explanations', '.agents/repository-learning', '.codemaps'];
const EXCLUDE_PATTERNS = ARTIFACT_PATHS.map(item => `/${item}/`);
const WORKSPACE_STATE_PATHS = ['.workspace-learning'];
const WORKSPACE_EXCLUDE_PATTERNS = ['/.workspace-learning/'];

class StateError extends Error {}

function now() {
  return new Date().toISOString();
}

function fail(message) {
  throw new StateError(message);
}

function realDirectory(value, label) {
  const resolved = fs.realpathSync(path.resolve(value));
  if (!fs.statSync(resolved).isDirectory()) fail(`${label} is not a directory: ${resolved}`);
  return resolved;
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function gitResult(repo, args, options = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: null, ...options });
  if (result.error) fail(`git ${args.join(' ')} failed for ${repo}: ${result.error.message}`);
  return result;
}

function git(repo, args) {
  const result = gitResult(repo, args);
  if (result.status !== 0) {
    const stderr = Buffer.from(result.stderr ?? '').toString('utf8').trim();
    fail(`git ${args.join(' ')} failed for ${repo}: ${stderr}`);
  }
  return Buffer.from(result.stdout ?? '');
}

function isGitRoot(candidate) {
  const marker = path.join(candidate, '.git');
  let markerStat;
  try {
    markerStat = fs.lstatSync(marker);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  if (markerStat.isSymbolicLink() || (!markerStat.isDirectory() && !markerStat.isFile())) return false;
  const result = gitResult(candidate, ['rev-parse', '--show-toplevel']);
  if (result.status !== 0) return false;
  const reported = Buffer.from(result.stdout).toString('utf8').trim();
  try {
    return fs.realpathSync(reported) === fs.realpathSync(candidate);
  } catch {
    return false;
  }
}

function statePath(workspace) {
  return path.join(workspace, '.workspace-learning', 'state.json');
}

function stateRoot(workspace, allowMissing = false) {
  const root = path.dirname(statePath(workspace));
  let stat;
  try {
    stat = fs.lstatSync(root);
  } catch (error) {
    if (error.code === 'ENOENT' && allowMissing) return null;
    if (error.code === 'ENOENT') fail(`state root does not exist: ${root}`);
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`state root must be a physical directory: ${root}`);
  if (!inside(workspace, fs.realpathSync(root))) fail(`state root escapes workspace: ${root}`);
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
    fail(`state root must be owned by the current user: ${root}`);
  }
  if ((stat.mode & 0o777) !== 0o700) fail(`state root must have mode 0700: ${root}`);
  return root;
}

function ensureStateRoot(workspace) {
  const root = path.dirname(statePath(workspace));
  if (stateRoot(workspace, true)) return root;
  try {
    fs.mkdirSync(root, { recursive: false, mode: 0o700 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  return stateRoot(workspace);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readState(workspace, allowMissing = false) {
  const file = statePath(workspace);
  const root = stateRoot(workspace, true);
  if (!root) {
    if (allowMissing) return null;
    fail(`state does not exist; run init after an explicit start choice: ${file}`);
  }
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if (error.code === 'ENOENT' && allowMissing) return null;
    if (error.code === 'ENOENT') fail(`state does not exist; run init after an explicit start choice: ${file}`);
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`state must be a regular file: ${file}`);
  let state;
  let descriptor;
  try {
    descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    if (!fs.fstatSync(descriptor).isFile()) fail(`state must be a regular file: ${file}`);
    state = JSON.parse(fs.readFileSync(descriptor, 'utf8'));
  } catch (error) {
    if (error instanceof StateError) throw error;
    fail(`cannot read state ${file}: ${error.message}`);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  if (!isPlainObject(state)) fail(`state must be a JSON object: ${file}`);
  if (state.schema_version !== SCHEMA_VERSION) fail(`unsupported state schema: ${state.schema_version}`);
  if (state.workspace !== workspace) fail(`state workspace does not match resolved workspace: ${state.workspace}`);
  if (!Array.isArray(state.repositories)) fail('state repositories must be an array');
  return state;
}

function writeState(workspace, state) {
  const root = ensureStateRoot(workspace);
  state.updated_at = now();
  const file = statePath(workspace);
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`state must be a regular file: ${file}`);
  }
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  let descriptor;
  let renamed = false;
  try {
    descriptor = fs.openSync(
      temporary,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    fs.writeFileSync(descriptor, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    if (fs.existsSync(file)) {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink()) fail(`state must be a regular file: ${file}`);
    }
    fs.renameSync(temporary, file);
    renamed = true;
    let directoryDescriptor;
    try {
      directoryDescriptor = fs.openSync(root, fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY ?? 0));
      fs.fsyncSync(directoryDescriptor);
    } finally {
      if (directoryDescriptor !== undefined) fs.closeSync(directoryDescriptor);
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (!renamed) {
      try {
        fs.unlinkSync(temporary);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
}

function sameFileIdentity(left, right) {
  return left && right && left.dev === right.dev && left.ino === right.ino;
}

function removeLockIfOwned(lock, identity) {
  let current;
  try {
    current = fs.lstatSync(lock);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (current.isFile() && !current.isSymbolicLink() && sameFileIdentity(current, identity)) fs.unlinkSync(lock);
}

function describeExistingStateLock(lock) {
  let expected;
  try {
    expected = fs.lstatSync(lock);
  } catch (error) {
    if (error.code === 'ENOENT') return 'an unknown owner';
    throw error;
  }
  if (!expected.isFile() || expected.isSymbolicLink()) fail(`state lock entry is unsafe: ${lock}`);

  let descriptor;
  let actual;
  let raw;
  try {
    descriptor = fs.openSync(lock, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    actual = fs.fstatSync(descriptor);
    if (!actual.isFile() || !sameFileIdentity(actual, expected)) fail(`state lock changed while opening: ${lock}`);
    if (actual.size < 2 || actual.size > 4096) return 'an unknown owner';
    raw = fs.readFileSync(descriptor, 'utf8');
  } catch (error) {
    if (error instanceof StateError) throw error;
    if (error.code === 'ELOOP') fail(`state lock entry is unsafe: ${lock}`);
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }

  let metadata = null;
  try {
    metadata = JSON.parse(raw);
  } catch {}
  if (!isPlainObject(metadata)
    || metadata.version !== 1
    || !Number.isInteger(metadata.pid) || metadata.pid <= 0
    || typeof metadata.hostname !== 'string' || !metadata.hostname
    || typeof metadata.nonce !== 'string' || !metadata.nonce
    || typeof metadata.created_at !== 'string' || Number.isNaN(Date.parse(metadata.created_at))) {
    return 'an unknown owner';
  }
  return `PID ${metadata.pid} on host ${metadata.hostname}`;
}

function acquireStateLock(lock) {
  let descriptor;
  let identity;
  try {
    descriptor = fs.openSync(
      lock,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    identity = fs.fstatSync(descriptor);
    const metadata = {
      version: 1,
      hostname: os.hostname(),
      pid: process.pid,
      nonce: crypto.randomUUID(),
      created_at: now(),
    };
    fs.writeFileSync(descriptor, `${JSON.stringify(metadata)}\n`, 'utf8');
    fs.fsyncSync(descriptor);
    return { descriptor, identity };
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (identity) removeLockIfOwned(lock, identity);
    if (error.code === 'EEXIST' || error.code === 'ELOOP') {
      const owner = describeExistingStateLock(lock);
      fail(`state is locked by ${owner}: ${lock}; only an operator may remove this lock after verifying it is stale`);
    }
    throw error;
  }
}

function withStateLock(workspace, callback, createRoot = false) {
  const root = createRoot ? ensureStateRoot(workspace) : stateRoot(workspace);
  const lock = path.join(root, 'state.lock');
  const { descriptor, identity } = acquireStateLock(lock);
  try {
    return callback();
  } finally {
    fs.closeSync(descriptor);
    removeLockIfOwned(lock, identity);
  }
}

function mutateState(workspace, update) {
  return withStateLock(workspace, () => {
    const state = readState(workspace);
    const output = update(state);
    writeState(workspace, state);
    return output;
  });
}

function parseRegistry(workspace) {
  const registry = path.join(workspace, 'service-repos.txt');
  if (!fs.existsSync(registry)) return [];
  const stat = fs.lstatSync(registry);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`service registry must be a regular file: ${registry}`);
  const names = [];
  for (const raw of fs.readFileSync(registry, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const name = line.split(/\s+/)[0];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function discover(workspace) {
  const registry = parseRegistry(workspace);
  const physical = new Map();
  for (const entry of fs.readdirSync(workspace, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const candidate = path.join(workspace, entry.name);
    if (isGitRoot(candidate)) physical.set(entry.name, fs.realpathSync(candidate));
  }

  const records = [];
  for (const name of registry) {
    records.push({
      name,
      path: physical.get(name) ?? path.join(workspace, name),
      source: 'service-repos.txt',
      available: physical.has(name),
    });
    physical.delete(name);
  }
  for (const name of [...physical.keys()].sort((left, right) => left.localeCompare(right))) {
    records.push({ name, path: physical.get(name), source: 'workspace-discovery', available: true });
  }
  return records;
}

function freshRecord(entry) {
  const timestamp = now();
  return {
    ...entry,
    status: entry.available ? 'pending' : 'unavailable',
    current_phase: 1,
    phases: Object.fromEntries(Array.from({ length: PHASE_COUNT }, (_, index) => [String(index + 1), { status: 'pending' }])),
    details: {},
    workflow_contract_version: WORKFLOW_CONTRACT_VERSION,
    artifact_contract_version: ARTIFACT_CONTRACT_VERSION,
    contract_applied_at: timestamp,
    contract_restudy_required: false,
    contract_migrations: [],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function mergeState(workspace, existing, entries) {
  if (!existing) {
    const timestamp = now();
    return {
      schema_version: SCHEMA_VERSION,
      workspace,
      created_at: timestamp,
      updated_at: timestamp,
      repositories: entries.map(freshRecord),
    };
  }
  const prior = new Map(existing.repositories.map(record => [record.name, record]));
  const merged = [];
  for (const entry of entries) {
    if (!prior.has(entry.name)) {
      merged.push(freshRecord(entry));
      continue;
    }
    const record = prior.get(entry.name);
    prior.delete(entry.name);
    Object.assign(record, { path: entry.path, source: entry.source, available: entry.available });
    if (record.status === 'unavailable' && entry.available) record.status = 'pending';
    if (!entry.available && record.status === 'pending') record.status = 'unavailable';
    merged.push(record);
  }
  for (const record of prior.values()) merged.push(record);
  existing.repositories = merged;
  return existing;
}

function findRecord(state, selector) {
  if (state.repositories.some(item => !isPlainObject(item))) fail('state repository records must be objects');
  const record = state.repositories.find(item => item.name === selector || item.path === selector);
  if (!record) fail(`repository is not in the queue: ${selector}`);
  return record;
}

function legacyAuthorityReferences(record) {
  const references = [];
  const visit = (value, location) => {
    if (typeof value === 'string') {
      if (/DOMAIN-AUTHORITY\.md/i.test(value)) references.push(location);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${location}[${index}]`));
      return;
    }
    if (!isPlainObject(value)) return;
    for (const [key, item] of Object.entries(value)) {
      const itemLocation = `${location}.${key}`;
      if (/domain[-_]?authority/i.test(key)) references.push(itemLocation);
      visit(item, itemLocation);
    }
  };
  visit(record.details, 'details');
  visit(record.phases, 'phases');
  visit(record.code_qa, 'code-qa');
  return references;
}

function withoutLegacyAuthorityDetails(value) {
  if (Array.isArray(value)) {
    return value
      .filter(item => !(typeof item === 'string' && /DOMAIN-AUTHORITY\.md/i.test(item)))
      .map(withoutLegacyAuthorityDetails);
  }
  if (!isPlainObject(value)) return value;
  const retained = {};
  for (const [key, item] of Object.entries(value)) {
    if (/domain[-_]?authority/i.test(key)) continue;
    if (typeof item === 'string' && /DOMAIN-AUTHORITY\.md/i.test(item)) continue;
    retained[key] = withoutLegacyAuthorityDetails(item);
  }
  return retained;
}

function earliestIncompletePhase(record) {
  return Array.from({ length: PHASE_COUNT }, (_, index) => index + 1)
    .find(phase => record.phases?.[String(phase)]?.status !== 'completed') ?? PHASE_COUNT;
}

function legacyReachedPhaseTwo(record) {
  if (record.phases?.['1']?.status === 'completed') return true;
  if (Number.isInteger(record.current_phase) && record.current_phase >= 2) return true;
  return Array.from({ length: PHASE_COUNT - 1 }, (_, index) => index + 2)
    .some(phase => record.phases?.[String(phase)]?.status !== 'pending');
}

function legacyResumePhase(record) {
  const original = Number.isInteger(record.current_phase) && record.current_phase >= 1
    && record.current_phase <= PHASE_COUNT ? record.current_phase : earliestIncompletePhase(record);
  return legacyReachedPhaseTwo(record) ? 2 : Math.min(original, earliestIncompletePhase(record), 2);
}

function contractAssessment(record) {
  if (!isPlainObject(record)) fail('repository state must be an object');
  const workflowVersion = record.workflow_contract_version;
  const artifactVersion = record.artifact_contract_version;
  if (workflowVersion !== undefined && (!Number.isInteger(workflowVersion) || workflowVersion < 1)) {
    fail(`invalid workflow contract version: ${workflowVersion}`);
  }
  if (artifactVersion !== undefined && (!Number.isInteger(artifactVersion) || artifactVersion < 1)) {
    fail(`invalid artifact contract version: ${artifactVersion}`);
  }
  if (Number.isInteger(workflowVersion) && workflowVersion > WORKFLOW_CONTRACT_VERSION) {
    fail(`unsupported future workflow contract version: ${workflowVersion}`);
  }
  if (Number.isInteger(artifactVersion) && artifactVersion > ARTIFACT_CONTRACT_VERSION) {
    fail(`unsupported future artifact contract version: ${artifactVersion}`);
  }
  const legacyReferences = legacyAuthorityReferences(record);
  const legacyCodeQA = legacyCodeQAContractAssessment(record);
  // A schema-current lifecycle with an explicitly blocked Phase 3 and no
  // recorded rounds cannot be continued or converged. Archive it through the
  // normal migration path rather than relabelling a non-Atlas result as one.
  const strandedTypedLifecycle = typedCodeQALifecyclePresent(record)
    && record.phases?.['3']?.status === 'blocked'
    && Array.isArray(record.code_qa?.rounds)
    && record.code_qa.rounds.length === 0;
  const needsMigration = workflowVersion !== WORKFLOW_CONTRACT_VERSION
    || artifactVersion !== ARTIFACT_CONTRACT_VERSION
    || legacyReferences.length > 0
    || legacyCodeQA.needs_migration
    || strandedTypedLifecycle;
  return {
    repository: record.name,
    current_workflow_contract_version: WORKFLOW_CONTRACT_VERSION,
    current_artifact_contract_version: ARTIFACT_CONTRACT_VERSION,
    recorded_workflow_contract_version: workflowVersion ?? null,
    recorded_artifact_contract_version: artifactVersion ?? null,
    current_code_qa_schema_version: CODE_QA_SCHEMA_VERSION,
    recorded_code_qa_schema_version: isPlainObject(record.code_qa)
      && Number.isInteger(record.code_qa.schema_version) ? record.code_qa.schema_version : null,
    needs_migration: needsMigration,
    phase_2_restudy_required: record.contract_restudy_required === true,
    resume_phase: needsMigration ? legacyResumePhase(record)
      : (record.contract_restudy_required === true ? 2 : record.current_phase),
    legacy_authority_references: legacyReferences,
    legacy_code_qa_state_detected: legacyCodeQA.detected,
    canonical_artifacts: [...CANONICAL_LEARNING_ARTIFACTS],
    required_phase_2_digests: [...PHASE_TWO_CONTRACT_DIGESTS],
  };
}

function legacyCodeQADetailSources(record) {
  const sources = [];
  if (isPlainObject(record.details)) sources.push({ location: 'details', details: record.details });
  const phaseThreeDetails = record.phases?.['3']?.details;
  if (isPlainObject(phaseThreeDetails)) sources.push({ location: 'phases.3.details', details: phaseThreeDetails });
  return sources;
}

function flatLegacyCodeQAPresent(record) {
  return legacyCodeQADetailSources(record)
    .some(source => [...LEGACY_CODE_QA_TASK_STATE_KEYS].some(key => Object.hasOwn(source.details, key)));
}

function typedCodeQALifecyclePresent(record) {
  return isPlainObject(record.code_qa) && record.code_qa.schema_version === CODE_QA_SCHEMA_VERSION;
}

function legacyTypedCodeQALifecyclePresent(record) {
  return isPlainObject(record.code_qa)
    && Number.isInteger(record.code_qa.schema_version)
    && record.code_qa.schema_version >= 1
    && record.code_qa.schema_version < CODE_QA_SCHEMA_VERSION;
}

function legacyCodeQAContractAssessment(record) {
  const flat = flatLegacyCodeQAPresent(record);
  const typed = typedCodeQALifecyclePresent(record);
  const legacyTyped = legacyTypedCodeQALifecyclePresent(record);
  if (isPlainObject(record.code_qa) && Number.isInteger(record.code_qa.schema_version)
    && record.code_qa.schema_version > CODE_QA_SCHEMA_VERSION) {
    fail(`unsupported future CodeQA lifecycle schema: ${record.code_qa.schema_version}`);
  }
  const untypedCodeQA = record.code_qa !== undefined && record.code_qa !== null && !typed && !legacyTyped;
  if (typed) {
    try {
      validateCodeQaLifecycle(record.code_qa);
    } catch (error) {
      // A prior harness version could persist a schema-current but structurally
      // invalid lifecycle. Treat it as migratable audit residue so it can be
      // archived and rebuilt; leaving it authoritative makes every lifecycle
      // operation, including migration, permanently impossible.
      return { detected: true, needs_migration: true };
    }
    // Typed lifecycle state is authoritative; flat legacy mirrors are inert audit residue.
    return { detected: flat, needs_migration: false };
  }
  return {
    detected: flat || legacyTyped || untypedCodeQA,
    needs_migration: legacyTyped || (flat && !typed) || untypedCodeQA,
  };
}

function legacyCodeQAIdentity(record, includeCodeQA = true) {
  const typedAuthoritative = includeCodeQA && typedCodeQALifecyclePresent(record);
  const legacyTypedAuthoritative = includeCodeQA && legacyTypedCodeQALifecyclePresent(record);
  const sources = typedAuthoritative || legacyTypedAuthoritative ? [] : legacyCodeQADetailSources(record);
  const taskIds = [];
  const transports = [];
  const statuses = [];
  let present = false;
  for (const source of sources) {
    for (const key of LEGACY_CODE_QA_TASK_STATE_KEYS) {
      if (Object.hasOwn(source.details, key)) present = true;
    }
    for (const key of LEGACY_CODE_QA_TASK_KEYS) {
      const value = source.details[key];
      if (typeof value === 'string' && value.trim()) taskIds.push(value.trim());
    }
    for (const key of LEGACY_CODE_QA_TRANSPORT_KEYS) {
      const value = source.details[key];
      if (typeof value === 'string' && value.trim()) transports.push(value.trim().toLowerCase());
    }
    for (const key of LEGACY_CODE_QA_STATUS_KEYS) {
      const value = source.details[key];
      if (typeof value === 'string' && value.trim()) statuses.push(value.trim().toUpperCase());
    }
  }

  // Protect partially upgraded states too, while keeping legacy detail fields canonical.
  if (typedAuthoritative) {
    // Invalid schema-current lifecycles are migration candidates. Preserve only
    // their directly stored current-task identity for terminal observation; do
    // not make archival depend on a lifecycle validation that has already
    // failed.
    try {
      validateCodeQaLifecycle(record.code_qa);
    } catch (error) {
      // The guarded extraction below is intentionally limited to identity.
    }
    const current = codeQaTask(record.code_qa, record.code_qa.current_task_id);
    if (!current) fail('legacy CodeQA current task identity cannot be proven');
    present = true;
    taskIds.push(current.task_id);
    transports.push(current.transport);
    statuses.push(current.status);
  } else if (legacyTypedAuthoritative) {
    const codeQa = record.code_qa;
    present = true;
    for (const value of [codeQa.current_task_id, codeQa.task_id, codeQa.legacy_task_id]) {
      if (typeof value === 'string' && value.trim()) taskIds.push(value.trim());
    }
    for (const value of [codeQa.transport, codeQa.bound_transport]) {
      if (typeof value === 'string' && value.trim()) transports.push(value.trim().toLowerCase());
    }
    for (const value of [codeQa.status, codeQa.latest_status, codeQa.task_status]) {
      if (typeof value === 'string' && value.trim()) statuses.push(value.trim().toUpperCase());
    }
    if (codeQa.tasks !== undefined && !Array.isArray(codeQa.tasks)) fail('legacy typed CodeQA tasks must be an array');
    const currentTasks = (codeQa.tasks ?? []).filter(task => (
      isPlainObject(task) && task.task_id === codeQa.current_task_id
    ));
    if (currentTasks.length > 1) fail(`legacy CodeQA current task identity is ambiguous: ${codeQa.current_task_id}`);
    if (currentTasks.length === 1) {
      const current = currentTasks[0];
      if (typeof current.task_id === 'string' && current.task_id.trim()) taskIds.push(current.task_id.trim());
      if (typeof current.transport === 'string' && current.transport.trim()) transports.push(current.transport.trim().toLowerCase());
      if (typeof current.status === 'string' && current.status.trim()) statuses.push(current.status.trim().toUpperCase());
    }
  } else if (includeCodeQA && record.code_qa !== undefined && record.code_qa !== null) {
    if (!isPlainObject(record.code_qa)) fail('legacy CodeQA state must be an object');
    present = true;
    for (const value of [record.code_qa.current_task_id, record.code_qa.task_id, record.code_qa.legacy_task_id]) {
      if (typeof value === 'string' && value.trim()) taskIds.push(value.trim());
    }
    for (const value of [record.code_qa.transport, record.code_qa.bound_transport]) {
      if (typeof value === 'string' && value.trim()) transports.push(value.trim().toLowerCase());
    }
    for (const value of [record.code_qa.status, record.code_qa.latest_status, record.code_qa.task_status]) {
      if (typeof value === 'string' && value.trim()) statuses.push(value.trim().toUpperCase());
    }
  }

  const unique = (values, label) => {
    const distinct = [...new Set(values)];
    if (distinct.length > 1) fail(`legacy CodeQA ${label} is ambiguous: ${distinct.join(', ')}`);
    return distinct[0] ?? null;
  };
  const terminalStatuses = [...new Set(statuses.filter(status => CODE_QA_TERMINAL_STATUSES.has(status)))];
  if (terminalStatuses.length > 1) {
    fail(`legacy CodeQA terminal status is ambiguous: ${terminalStatuses.join(', ')}`);
  }
  return {
    present,
    task_id: unique(taskIds, 'current task identity'),
    transport: unique(transports, 'transport'),
    statuses: [...new Set(statuses)],
    terminal_status: terminalStatuses[0] ?? null,
  };
}

function requireTerminalLegacyCodeQAForMigration(record) {
  const identity = legacyCodeQAIdentity(record);
  if (!identity.present) return;
  if (!identity.task_id) {
    fail('contract migration refused: legacy CodeQA current task identity cannot be proven; use contract-observe-codeqa with the exact persisted task');
  }
  if (!identity.transport || !CODE_QA_TRANSPORTS.has(identity.transport)) {
    fail('contract migration refused: legacy CodeQA original transport cannot be proven; use contract-observe-codeqa with the exact persisted transport');
  }
  const active = identity.statuses.filter(status => ['CREATED', 'PENDING', 'RUNNING'].includes(status));
  if (active.length) {
    fail(`contract migration refused: legacy CodeQA state is ${active.join('/')}; use contract-observe-codeqa after observing or terminating it under its original transport`);
  }
  const unknown = identity.statuses.filter(status => !CODE_QA_TERMINAL_STATUSES.has(status));
  if (!identity.terminal_status || unknown.length) {
    fail('contract migration refused: legacy CodeQA terminal status cannot be proven; use contract-observe-codeqa after observing or terminating it under its original transport');
  }
}

function withoutLegacyCodeQADetails(details) {
  if (!isPlainObject(details)) return details;
  return Object.fromEntries(Object.entries(details).filter(([key]) => !LEGACY_CODE_QA_DETAIL_KEYS.has(key)));
}

function migrateContract(record) {
  const assessment = contractAssessment(record);
  if (!assessment.needs_migration) return { migrated: false, ...assessment };
  if (record.code_qa_dispatch_intent !== undefined) {
    const intent = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
    fail(`contract migration refused while CodeQA dispatch intent ${intent.intent_id} is unresolved`);
  }
  requireTerminalLegacyCodeQAForMigration(record);
  if (!isPlainObject(record.phases)) fail(`repository phases are invalid for contract migration: ${record.name}`);
  for (let phase = 1; phase <= PHASE_COUNT; phase += 1) {
    if (!isPlainObject(record.phases[String(phase)])) fail(`phase ${phase} is invalid for contract migration: ${record.name}`);
  }
  if (record.contract_migrations !== undefined && !Array.isArray(record.contract_migrations)) {
    fail(`contract migration history must be an array: ${record.name}`);
  }

  const timestamp = now();
  const reachedPhaseTwo = legacyReachedPhaseTwo(record);
  const invalidatedPhases = reachedPhaseTwo ? [2, 3, 4, 5, 6, 7, 8] : [];
  const legacyCheckpoint = {
    status: record.status,
    current_phase: record.current_phase,
    completed_at: record.completed_at ?? null,
    details: structuredClone(record.details ?? {}),
    phases: Object.fromEntries(Array.from({ length: PHASE_COUNT }, (_, index) => {
      const phase = String(index + 1);
      return [phase, structuredClone(record.phases[phase])];
    })),
    code_qa: record.code_qa === undefined ? null : structuredClone(record.code_qa),
    contract_terminal_observations: structuredClone(record.contract_terminal_observations ?? []),
  };
  const migration = {
    migration_id: `workflow-contract-v${WORKFLOW_CONTRACT_VERSION}-${crypto.randomUUID()}`,
    migrated_at: timestamp,
    from_workflow_contract_version: assessment.recorded_workflow_contract_version ?? 1,
    to_workflow_contract_version: WORKFLOW_CONTRACT_VERSION,
    from_artifact_contract_version: assessment.recorded_artifact_contract_version ?? 1,
    to_artifact_contract_version: ARTIFACT_CONTRACT_VERSION,
    reason: legacyTypedCodeQALifecyclePresent(record)
      ? `archive legacy CodeQA schema v${record.code_qa.schema_version} without coercion before starting schema v${CODE_QA_SCHEMA_VERSION}`
      : 'operation-specific authority and failure artifacts supersede DOMAIN-AUTHORITY.md',
    code_qa_schema_transition: legacyTypedCodeQALifecyclePresent(record) ? {
      from_code_qa_schema_version: record.code_qa.schema_version,
      to_code_qa_schema_version: CODE_QA_SCHEMA_VERSION,
      action: 'archived-not-coerced',
    } : null,
    legacy_authority_references: assessment.legacy_authority_references,
    invalidated_phases: invalidatedPhases,
    legacy_checkpoint: legacyCheckpoint,
  };

  for (let phase = 1; phase <= PHASE_COUNT; phase += 1) {
    record.phases[String(phase)] = withoutLegacyAuthorityDetails(record.phases[String(phase)]);
  }
  if (isPlainObject(record.phases['3'].details)) {
    record.phases['3'].details = withoutLegacyCodeQADetails(record.phases['3'].details);
  }
  if (reachedPhaseTwo) {
    for (let phase = 2; phase <= PHASE_COUNT; phase += 1) {
      record.phases[String(phase)] = {
        status: 'pending',
        invalidated_at: timestamp,
        invalidated_by_workflow_contract_version: WORKFLOW_CONTRACT_VERSION,
      };
    }
  }
  record.workflow_contract_version = WORKFLOW_CONTRACT_VERSION;
  record.artifact_contract_version = ARTIFACT_CONTRACT_VERSION;
  record.contract_applied_at = timestamp;
  record.contract_restudy_required = reachedPhaseTwo;
  record.contract_migrations = [...(record.contract_migrations ?? []), migration];
  record.details = withoutLegacyCodeQADetails(withoutLegacyAuthorityDetails(record.details ?? {}));
  for (const digest of PHASE_TWO_CONTRACT_DIGESTS) delete record.details[digest];
  if (isPlainObject(record.phases['2'].details)) {
    for (const digest of PHASE_TWO_CONTRACT_DIGESTS) delete record.phases['2'].details[digest];
  }
  record.current_phase = reachedPhaseTwo ? 2 : legacyResumePhase(record);
  if (record.available && reachedPhaseTwo) record.status = record.status === 'pending' ? 'pending' : 'in_progress';
  else record.status = 'unavailable';
  if (record.available && !reachedPhaseTwo) {
    record.status = ['pending', 'in_progress', 'blocked'].includes(legacyCheckpoint.status)
      ? legacyCheckpoint.status : 'pending';
  }
  delete record.completed_at;
  delete record.contract_restudy_completed_at;
  delete record.contract_terminal_observations;
  delete record.code_qa;
  record.updated_at = timestamp;

  return {
    migrated: true,
    migration,
    ...contractAssessment(record),
  };
}

function observeLegacyCodeQAForContract(record, { taskId, transport, status, evidenceId }) {
  const assessment = contractAssessment(record);
  if (!assessment.needs_migration) fail(`contract-observe-codeqa is only valid before a required contract migration: ${record.name}`);
  const identity = legacyCodeQAIdentity(record);
  if (!identity.present) fail(`legacy CodeQA state does not exist for ${record.name}`);
  if (!identity.task_id) fail('legacy CodeQA current task identity cannot be proven');
  if (!identity.transport || !CODE_QA_TRANSPORTS.has(identity.transport)) fail('legacy CodeQA original transport cannot be proven');
  if (identity.task_id !== taskId) fail(`legacy CodeQA current task mismatch: expected ${identity.task_id}, received ${taskId}`);
  if (identity.transport !== transport) fail(`legacy CodeQA transport mismatch: expected ${identity.transport}, received ${transport}`);
  if (!CODE_QA_TERMINAL_STATUSES.has(status)) fail('contract-observe-codeqa accepts only terminal COMPLETED, FAILED, or CANCELLED status');
  if (identity.terminal_status && identity.terminal_status !== status) {
    fail(`legacy CodeQA terminal status is immutable: ${identity.terminal_status} -> ${status}`);
  }
  const observations = record.contract_terminal_observations;
  if (observations !== undefined && !Array.isArray(observations)) fail('legacy CodeQA terminal observations must be an array');
  if (observations?.some(observation => observation.evidence_id === evidenceId)) {
    fail(`duplicate legacy CodeQA observation evidence ID: ${evidenceId}`);
  }
  const timestamp = now();
  if (!isPlainObject(record.details)) fail('legacy repository details must be an object');
  if (!isPlainObject(record.phases?.['3'])) fail('legacy Phase 3 checkpoint must be an object');
  if (!isPlainObject(record.phases['3'].details)) record.phases['3'].details = {};
  for (const source of [record.details, record.phases['3'].details]) {
    for (const key of LEGACY_CODE_QA_STATUS_KEYS) {
      if (Object.hasOwn(source, key)) source[key] = status;
    }
    source.code_qa_task_status = status;
  }
  if (isPlainObject(record.code_qa)) {
    record.code_qa.status = status;
    if (Object.hasOwn(record.code_qa, 'latest_status')) record.code_qa.latest_status = status;
    if (Object.hasOwn(record.code_qa, 'task_status')) record.code_qa.task_status = status;
  }
  if (Array.isArray(record.code_qa?.tasks)) {
    const current = record.code_qa.tasks.find(task => isPlainObject(task) && task.task_id === taskId);
    if (current) {
      current.status = status;
      current.observed_at = timestamp;
      current.updated_at = timestamp;
    }
  }
  const observation = {
    task_id: taskId,
    transport,
    observed_terminal_status: status,
    evidence_id: evidenceId,
    observed_at: timestamp,
  };
  record.contract_terminal_observations = [...(observations ?? []), observation];
  record.updated_at = timestamp;
  return { repository: record.name, migration_ready: true, observation };
}

function requireCurrentContract(record, operation) {
  const assessment = contractAssessment(record);
  if (assessment.needs_migration) {
    fail(`${operation} requires workflow/artifact contract migration; run contract-status then contract-migrate for ${record.name}`);
  }
  if (record.contract_restudy_required === true) {
    fail(`${operation} requires Phase 2 restudy under workflow contract v${WORKFLOW_CONTRACT_VERSION}`);
  }
}

function requireCodeQaPhaseContext(record, operation, allowCompleted = false) {
  const incompletePrerequisites = [1, 2].filter(phase => record.phases?.[String(phase)]?.status !== 'completed');
  if (incompletePrerequisites.length) {
    fail(`${operation} requires completed Phases 1 and 2; incomplete: ${incompletePrerequisites.join(', ')}`);
  }
  const allowed = allowCompleted ? new Set(['in_progress', 'completed']) : new Set(['in_progress']);
  if (!allowed.has(record.phases?.['3']?.status)) {
    fail(`${operation} requires Phase 3 ${allowCompleted ? 'in_progress or completed' : 'in_progress'}; explicitly checkpoint Phase 3 before continuing`);
  }
}

function invalidateDownstreamPhases(record, phase, timestamp, invalidatesPhaseThree = false) {
  for (let dependent = phase + 1; dependent <= PHASE_COUNT; dependent += 1) {
    const checkpoint = record.phases[String(dependent)];
    if (checkpoint.status === 'pending') continue;
    checkpoint.status = 'pending';
    checkpoint.invalidated_at = timestamp;
    checkpoint.invalidated_by_phase = phase;
    checkpoint.updated_at = timestamp;
  }
  if (phase <= 3 && isPlainObject(record.code_qa)) {
    record.code_qa.convergence = null;
    if (invalidatesPhaseThree) record.code_qa.convergence_floor_round = record.code_qa.rounds.length;
    record.code_qa.updated_at = timestamp;
  }
}

function activeRecord(state) {
  for (const desired of ['blocked', 'in_progress', 'pending']) {
    const record = state.repositories.find(item => item.available && item.status === desired);
    if (record) return record;
  }
  return state.repositories.find(record => record.available && (
    contractAssessment(record).needs_migration || record.contract_restudy_required === true
  )) ?? null;
}

function resolveRepo(workspace, state, selector) {
  const record = findRecord(state, selector);
  if (!record.available) fail(`repository is unavailable: ${record.name}`);
  const repo = realDirectory(record.path, 'repository');
  if (!inside(workspace, repo)) fail(`repository escapes workspace: ${repo}`);
  if (!isGitRoot(repo)) fail(`repository is no longer a Git root: ${repo}`);
  return { repo, record };
}

function requiredText(value, label) {
  if (typeof value !== 'string') fail(`${label} is required`);
  const result = value.trim();
  if (!result) fail(`${label} must not be empty`);
  if (result.length > 1024) fail(`${label} is too long`);
  if (/\p{Cc}/u.test(result)) fail(`${label} must not contain control characters`);
  return result;
}

function codeQaTransport(value) {
  const transport = requiredText(value, '--transport').toLowerCase();
  if (!CODE_QA_TRANSPORTS.has(transport)) fail(`unsupported CodeQA transport: ${value}`);
  return transport;
}

function codeQaStatus(value) {
  const status = requiredText(value, '--status').toUpperCase();
  if (!CODE_QA_STATUSES.has(status)) fail(`unsupported CodeQA status: ${value}`);
  return status;
}

function codeQaNovelty(value) {
  const novelty = requiredText(value, '--novelty').toLowerCase();
  if (!CODE_QA_NOVELTY.has(novelty)) fail(`unsupported CodeQA novelty: ${value}`);
  return novelty;
}

function explicitBoolean(value, label) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`${label} must be true or false`);
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || String(number) !== String(value).trim()) {
    fail(`${label} must be a positive integer`);
  }
  return number;
}

function normalizeRoundName(value) {
  const label = requiredText(value, '--round-name');
  const normalized = label.toLowerCase().replace(/[\s_/]+/g, '-').replace(/-+/g, '-');
  const aliases = new Map([
    ['source-challenge-round', 'source-challenge'],
    ['invariants-and-failure', 'invariants-failure'],
    ['invariants-failures', 'invariants-failure'],
    ['history-and-misunderstanding', 'history-misunderstanding'],
    ['history-misunderstandings', 'history-misunderstanding'],
  ]);
  return aliases.get(normalized) ?? normalized;
}

function sha256Digest(value, label) {
  const digest = requiredText(value, label).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(digest)) fail(`${label} must be a 64-hex SHA-256 digest`);
  return digest;
}

function codeQaIntentKind(value) {
  const kind = requiredText(value, '--kind').toLowerCase();
  if (!CODE_QA_INTENT_KINDS.has(kind)) fail(`unsupported CodeQA dispatch intent kind: ${value}`);
  return kind;
}

function validateCodeQaDispatchIntent(intent, expectedStatus = 'reserved') {
  if (!isPlainObject(intent) || intent.schema_version !== 1 || intent.status !== expectedStatus) {
    fail(`CodeQA dispatch intent is malformed or is not ${expectedStatus}`);
  }
  requiredText(intent.intent_id, 'CodeQA dispatch intent ID');
  if (!CODE_QA_INTENT_KINDS.has(intent.kind)) fail(`invalid CodeQA dispatch intent kind: ${intent.kind}`);
  if (intent.transport !== 'mcp') fail('CodeQA dispatch intent transport must be native MCP');
  sha256Digest(intent.prompt_sha256, 'CodeQA dispatch prompt SHA-256');
  if (!Number.isSafeInteger(intent.expected_generation) || intent.expected_generation < 1) {
    fail('CodeQA dispatch intent expected generation must be a positive integer');
  }
  if (intent.parent_task_id !== null) requiredText(intent.parent_task_id, 'CodeQA dispatch intent parent task ID');
  if (intent.from_task_id !== null) requiredText(intent.from_task_id, 'CodeQA dispatch intent recovery source task ID');
  requiredText(intent.reason, 'CodeQA dispatch intent reason');
  requiredText(intent.reserved_at, 'CodeQA dispatch intent reserved_at');
  return intent;
}

function assertContinuationReady(codeQa, parent) {
  if (parent.status === 'FAILED' || parent.status === 'CANCELLED') {
    fail(`CodeQA ${parent.status.toLowerCase()} task cannot auto-continue; use explicit codeqa-recover after a user-authorized recovery decision`);
  }
  if (parent.status !== 'COMPLETED') fail(`CodeQA continuation requires a successfully completed current task: ${parent.task_id}`);
  if (!parent.result_checkpoint || parent.result_checkpoint.semantic_success !== true
    || parent.result_checkpoint.round_number === null
    || !codeQaRoundForTask(codeQa, parent.task_id)?.locally_reconciled) {
    fail(`CodeQA continuation requires the parent result to be semantically successful and locally reconciled in a round: ${parent.task_id}`);
  }
}

function assertRecoveryReady(codeQa, prior) {
  if (!CODE_QA_TERMINAL_STATUSES.has(prior.status)) {
    fail(`nonterminal CodeQA task cannot be replaced: ${prior.task_id} is ${prior.status}`);
  }
  if (prior.status === 'COMPLETED' && !prior.result_checkpoint) {
    fail(`completed CodeQA task must have an ingested semantic result before recovery: ${prior.task_id}`);
  }
  if (prior.status === 'COMPLETED' && prior.result_checkpoint.semantic_success === true
    && (prior.result_checkpoint.round_number === null
      || !codeQaRoundForTask(codeQa, prior.task_id)?.locally_reconciled)) {
    fail(`semantically successful CodeQA task must have a locally reconciled round before recovery: ${prior.task_id}`);
  }
}

function reserveCodeQADispatchIntent(record, {
  intentId, kind, transport, promptSha256, expectedGeneration, parentTaskId, fromTaskId, reason,
}) {
  if (record.code_qa_dispatch_intent !== undefined) {
    const pending = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
    fail(`unresolved CodeQA dispatch intent ${pending.intent_id} blocks another reservation`);
  }
  if (record.code_qa?.dispatch_intents !== undefined && !Array.isArray(record.code_qa.dispatch_intents)) {
    fail('CodeQA bound dispatch intents must be an array');
  }
  if (record.code_qa_dispatch_resolutions !== undefined && !Array.isArray(record.code_qa_dispatch_resolutions)) {
    fail('CodeQA dispatch intent resolutions must be an array');
  }
  const usedIntentIds = [
    ...(record.code_qa?.dispatch_intents ?? []).map(intent => intent.intent_id),
    ...(record.code_qa_dispatch_resolutions ?? []).map(resolution => resolution.intent?.intent_id),
  ];
  if (usedIntentIds.includes(intentId)) fail(`duplicate CodeQA dispatch intent ID: ${intentId}`);
  if (transport !== 'mcp') fail('CodeQA dispatch reservations require native MCP transport');

  let parent = null;
  let prior = null;
  if (kind === 'start') {
    if (record.code_qa !== undefined) fail(`CodeQA lifecycle already exists for ${record.name}; reserve a continuation or recovery`);
    if (expectedGeneration !== 1) fail('CodeQA start intent must expect generation 1');
    if (parentTaskId !== undefined || fromTaskId !== undefined) fail('CodeQA start intent must not declare a parent or recovery source');
  } else {
    if (!isPlainObject(record.code_qa)) fail(`CodeQA lifecycle does not exist for ${record.name}; reserve a start`);
    validateCodeQaLifecycle(record.code_qa);
    const current = currentCodeQATask(
      record.code_qa,
      kind === 'continue' ? parentTaskId : fromTaskId,
      `CodeQA ${kind} intent reservation`,
    );
    if (kind === 'continue') {
      if (fromTaskId !== undefined) fail('CodeQA continuation intent must not declare a recovery source');
      if (record.code_qa.transport !== 'mcp') fail('CodeQA continuation reservation requires a native MCP-bound generation');
      if (expectedGeneration !== record.code_qa.generation) fail(`CodeQA continuation intent must expect generation ${record.code_qa.generation}`);
      assertContinuationReady(record.code_qa, current);
      parent = current.task_id;
    } else {
      if (parentTaskId !== undefined) fail('CodeQA recovery intent must not declare a parent task');
      if (expectedGeneration !== record.code_qa.generation + 1) {
        fail(`CodeQA recovery intent must expect generation ${record.code_qa.generation + 1}`);
      }
      assertRecoveryReady(record.code_qa, current);
      prior = current.task_id;
    }
  }

  const intent = {
    schema_version: 1,
    intent_id: intentId,
    kind,
    transport: 'mcp',
    prompt_sha256: promptSha256,
    expected_generation: expectedGeneration,
    parent_task_id: parent,
    from_task_id: prior,
    reason,
    status: 'reserved',
    reserved_at: now(),
  };
  record.code_qa_dispatch_intent = intent;
  record.updated_at = intent.reserved_at;
  return intent;
}

function bindCodeQADispatchIntent(record, {
  intentId, kind, taskId, expectedGeneration, parentTaskId = null, fromTaskId = null, reason = null,
}) {
  if (record.code_qa_dispatch_intent === undefined) fail(`CodeQA ${kind} requires a prior dispatch reservation`);
  const intent = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
  if (intent.intent_id !== intentId) fail(`CodeQA dispatch intent mismatch: expected ${intent.intent_id}, received ${intentId}`);
  if (intent.kind !== kind || intent.expected_generation !== expectedGeneration
    || intent.parent_task_id !== parentTaskId || intent.from_task_id !== fromTaskId) {
    fail(`CodeQA dispatch intent ${intentId} does not match the ${kind} lifecycle transition`);
  }
  if (reason !== null && intent.reason !== reason) fail(`CodeQA dispatch intent ${intentId} reason does not match`);
  const bound = {
    ...intent,
    status: 'bound',
    bound_task_id: taskId,
    bound_at: now(),
  };
  delete record.code_qa_dispatch_intent;
  return bound;
}

function attachBoundCodeQAIntent(codeQa, task, bound) {
  if (codeQa.dispatch_intents === undefined) {
    codeQa.dispatch_intents = [];
    codeQa.intent_enforcement_task_index = codeQa.tasks.length;
  }
  task.dispatch_intent_id = bound.intent_id;
  codeQa.dispatch_intents.push(bound);
}

function resolveCodeQADispatchIntent(record, {
  intentId, resolution, evidenceId, reason, userAuthorized,
}) {
  if (record.code_qa_dispatch_intent === undefined) fail('no unresolved CodeQA dispatch intent exists');
  const intent = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
  if (intent.intent_id !== intentId) fail(`CodeQA dispatch intent mismatch: expected ${intent.intent_id}, received ${intentId}`);
  if (!CODE_QA_INTENT_RESOLUTIONS.has(resolution)) fail(`unsupported CodeQA dispatch intent resolution: ${resolution}`);
  if (userAuthorized !== true) fail('CodeQA dispatch intent resolution requires --user-authorized true');
  const resolutions = record.code_qa_dispatch_resolutions;
  if (resolutions !== undefined && !Array.isArray(resolutions)) fail('CodeQA dispatch intent resolutions must be an array');
  if (resolutions?.some(entry => entry.evidence_id === evidenceId)) {
    fail(`duplicate CodeQA dispatch intent resolution evidence ID: ${evidenceId}`);
  }
  const resolved = {
    intent: structuredClone(intent),
    resolution,
    evidence_id: evidenceId,
    reason,
    user_authorized: true,
    resolved_at: now(),
  };
  record.code_qa_dispatch_resolutions = [...(resolutions ?? []), resolved];
  delete record.code_qa_dispatch_intent;
  record.updated_at = resolved.resolved_at;
  return resolved;
}

function codeQaRecord(state, selector, requireLifecycle = true) {
  const record = findRecord(state, requiredText(selector, '--repo'));
  if (!record.available) fail(`repository is unavailable: ${record.name}`);
  requireCurrentContract(record, 'CodeQA lifecycle mutation or inspection');
  if (requireLifecycle && record.code_qa === undefined) fail(`CodeQA lifecycle does not exist for ${record.name}; run codeqa-start`);
  if (record.code_qa !== undefined) validateCodeQaLifecycle(record.code_qa);
  return record;
}

function codeQaTask(codeQa, taskId) {
  return codeQa.tasks.find(task => task.task_id === taskId);
}

function currentCodeQATask(codeQa, taskId, operation) {
  const id = requiredText(taskId, '--task-id');
  if (id !== codeQa.current_task_id) {
    fail(`${operation} is allowed only for current CodeQA task ${codeQa.current_task_id}; received ${id}`);
  }
  const task = codeQaTask(codeQa, id);
  if (!task) fail(`current CodeQA task is missing from lifecycle: ${id}`);
  return task;
}

function requireTaskTransport(codeQa, task, value) {
  const transport = codeQaTransport(value);
  if (transport !== codeQa.transport || transport !== task.transport) {
    fail(`CodeQA transport is immutable within generation ${codeQa.generation}: expected ${codeQa.transport}, received ${transport}`);
  }
  return transport;
}

function codeQaRoundForTask(codeQa, taskId) {
  return codeQa.rounds.find(round => round.task_id === taskId);
}

function validateCodeQaLifecycle(codeQa) {
  if (!isPlainObject(codeQa)) fail('CodeQA lifecycle must be an object');
  if (codeQa.schema_version !== CODE_QA_SCHEMA_VERSION) fail(`unsupported CodeQA lifecycle schema: ${codeQa.schema_version}`);
  if (!Number.isSafeInteger(codeQa.generation) || codeQa.generation < 1) fail('CodeQA generation must be a positive integer');
  if (!CODE_QA_TRANSPORTS.has(codeQa.transport)) fail(`invalid persisted CodeQA transport: ${codeQa.transport}`);
  requiredText(codeQa.root_task_id, 'persisted CodeQA root_task_id');
  requiredText(codeQa.current_task_id, 'persisted CodeQA current_task_id');
  if (codeQa.parent_task_id !== null) requiredText(codeQa.parent_task_id, 'persisted CodeQA parent_task_id');
  if (!CODE_QA_STATUSES.has(codeQa.status)) fail(`invalid persisted CodeQA status: ${codeQa.status}`);
  if (!Array.isArray(codeQa.generations) || codeQa.generations.length !== codeQa.generation) {
    fail('CodeQA generations must contain exactly one record for every generation');
  }
  if (!Array.isArray(codeQa.tasks) || codeQa.tasks.length < 1) fail('CodeQA tasks must be a nonempty array');
  if (!Array.isArray(codeQa.rounds)) fail('CodeQA rounds must be an array');
  if (codeQa.convergence_floor_round !== undefined
    && (!Number.isSafeInteger(codeQa.convergence_floor_round)
      || codeQa.convergence_floor_round < 0
      || codeQa.convergence_floor_round > codeQa.rounds.length)) {
    fail('CodeQA convergence floor round must be an integer within the recorded round range');
  }
  if (!Array.isArray(codeQa.recoveries) || codeQa.recoveries.length !== codeQa.generation - 1) {
    fail('CodeQA recoveries must account for every generation transition');
  }

  const generations = new Map();
  for (let index = 0; index < codeQa.generations.length; index += 1) {
    const generation = codeQa.generations[index];
    if (!isPlainObject(generation) || generation.generation !== index + 1) fail('CodeQA generation records must be contiguous and ordered');
    if (!CODE_QA_TRANSPORTS.has(generation.transport)) fail(`invalid transport for CodeQA generation ${generation.generation}`);
    requiredText(generation.root_task_id, `CodeQA generation ${generation.generation} root_task_id`);
    requiredText(generation.reason, `CodeQA generation ${generation.generation} reason`);
    generations.set(generation.generation, generation);
  }

  const tasks = new Map();
  for (const task of codeQa.tasks) {
    if (!isPlainObject(task)) fail('each CodeQA task must be an object');
    const taskId = requiredText(task.task_id, 'persisted CodeQA task_id');
    if (tasks.has(taskId)) fail(`duplicate persisted CodeQA task ID: ${taskId}`);
    if (!Number.isSafeInteger(task.generation) || !generations.has(task.generation)) fail(`invalid generation for CodeQA task ${taskId}`);
    const generation = generations.get(task.generation);
    if (task.transport !== generation.transport) fail(`CodeQA task ${taskId} switches transport within generation ${task.generation}`);
    if (!CODE_QA_STATUSES.has(task.status)) fail(`invalid persisted status for CodeQA task ${taskId}: ${task.status}`);
    if (!['start', 'continuation', 'recovery'].includes(task.kind)) fail(`invalid lifecycle kind for CodeQA task ${taskId}`);
    if (task.parent_task_id !== null) requiredText(task.parent_task_id, `parent_task_id for CodeQA task ${taskId}`);
    if (task.result_checkpoint !== null) {
      if (!isPlainObject(task.result_checkpoint)) fail(`result checkpoint for CodeQA task ${taskId} must be an object or null`);
      requiredText(task.result_checkpoint.id, `result checkpoint ID for CodeQA task ${taskId}`);
      if (task.status !== 'COMPLETED') fail(`only a completed CodeQA task may have a result checkpoint: ${taskId}`);
      if (task.result_checkpoint.ingested !== true) fail(`CodeQA result checkpoint is not marked ingested: ${taskId}`);
      if (typeof task.result_checkpoint.semantic_success !== 'boolean') {
        fail(`CodeQA result checkpoint lacks an explicit semantic success boolean: ${taskId}`);
      }
      if (task.result_checkpoint.round_number !== null
        && (!Number.isSafeInteger(task.result_checkpoint.round_number) || task.result_checkpoint.round_number < 1)) {
        fail(`invalid round number on CodeQA result checkpoint: ${taskId}`);
      }
    }
    tasks.set(taskId, task);
  }

  const hasDispatchMetadata = codeQa.dispatch_intents !== undefined
    || codeQa.intent_enforcement_task_index !== undefined;
  if (hasDispatchMetadata) {
    if (!Array.isArray(codeQa.dispatch_intents)) fail('CodeQA bound dispatch intents must be an array');
    if (!Number.isSafeInteger(codeQa.intent_enforcement_task_index)
      || codeQa.intent_enforcement_task_index < 0
      || codeQa.intent_enforcement_task_index > codeQa.tasks.length) {
      fail('CodeQA intent enforcement task index is invalid');
    }
    const boundById = new Map();
    const boundTasks = new Set();
    const taskKinds = { start: 'start', continue: 'continuation', recover: 'recovery' };
    for (const bound of codeQa.dispatch_intents) {
      validateCodeQaDispatchIntent(bound, 'bound');
      const intentId = bound.intent_id;
      if (boundById.has(intentId)) fail(`duplicate bound CodeQA dispatch intent ID: ${intentId}`);
      const taskId = requiredText(bound.bound_task_id, `bound task for CodeQA dispatch intent ${intentId}`);
      requiredText(bound.bound_at, `bound_at for CodeQA dispatch intent ${intentId}`);
      const task = tasks.get(taskId);
      if (!task || boundTasks.has(taskId) || task.dispatch_intent_id !== intentId
        || task.kind !== taskKinds[bound.kind] || task.transport !== 'mcp'
        || task.generation !== bound.expected_generation
        || (bound.kind === 'continue' && task.parent_task_id !== bound.parent_task_id)
        || (bound.kind !== 'continue' && bound.parent_task_id !== null)
        || (bound.kind !== 'recover' && bound.from_task_id !== null)) {
        fail(`bound CodeQA dispatch intent ${intentId} does not match exactly one task`);
      }
      boundById.set(intentId, bound);
      boundTasks.add(taskId);
    }
    for (let index = 0; index < codeQa.tasks.length; index += 1) {
      const task = codeQa.tasks[index];
      if (index >= codeQa.intent_enforcement_task_index && !boundById.has(task.dispatch_intent_id)) {
        fail(`CodeQA task ${task.task_id} lacks a bound dispatch intent`);
      }
      if (task.dispatch_intent_id !== undefined && !boundById.has(task.dispatch_intent_id)) {
        fail(`CodeQA task ${task.task_id} references an unknown dispatch intent`);
      }
    }
    if (boundById.size !== codeQa.tasks.length - codeQa.intent_enforcement_task_index) {
      fail('CodeQA bound dispatch intents must map bijectively to post-enforcement tasks');
    }
  }

  const generationTails = new Map();
  for (const generation of generations.values()) {
    const members = [...tasks.values()].filter(task => task.generation === generation.generation);
    const roots = members.filter(task => task.parent_task_id === null);
    if (roots.length !== 1 || roots[0].task_id !== generation.root_task_id) {
      fail(`CodeQA generation ${generation.generation} must have exactly one declared root task`);
    }
    if (generation.generation === 1 && roots[0].kind !== 'start') fail('first CodeQA generation root must be a start task');
    if (generation.generation > 1 && roots[0].kind !== 'recovery') fail(`CodeQA generation ${generation.generation} root must be a recovery task`);
    const childByParent = new Map();
    for (const task of members) {
      if (task.parent_task_id === null) continue;
      const parent = tasks.get(task.parent_task_id);
      if (!parent || parent.generation !== task.generation) fail(`CodeQA task ${task.task_id} has an invalid parent`);
      if (parent.status !== 'COMPLETED') fail(`CodeQA task ${task.task_id} does not descend from a successfully completed task`);
      if (task.kind !== 'continuation') fail(`non-root CodeQA task ${task.task_id} must be a continuation`);
      if (!parent.result_checkpoint || parent.result_checkpoint.round_number === null) {
        fail(`CodeQA continuation parent ${parent.task_id} lacks an ingested, reconciled round`);
      }
      if (childByParent.has(parent.task_id)) fail(`CodeQA task lineage branches at ${parent.task_id}`);
      childByParent.set(parent.task_id, task);
      const visited = new Set([task.task_id]);
      let ancestor = parent;
      while (ancestor.parent_task_id !== null) {
        if (visited.has(ancestor.task_id)) fail(`cycle in CodeQA task lineage at ${ancestor.task_id}`);
        visited.add(ancestor.task_id);
        ancestor = tasks.get(ancestor.parent_task_id);
        if (!ancestor) fail(`CodeQA task lineage is incomplete for ${task.task_id}`);
      }
      if (ancestor.task_id !== generation.root_task_id) fail(`CodeQA task ${task.task_id} does not descend from its generation root`);
    }
    const tails = members.filter(task => !childByParent.has(task.task_id));
    if (tails.length !== 1) fail(`CodeQA generation ${generation.generation} must have one linear tail`);
    let traversed = 0;
    let cursor = roots[0];
    while (cursor) {
      traversed += 1;
      cursor = childByParent.get(cursor.task_id);
    }
    if (traversed !== members.length) fail(`CodeQA generation ${generation.generation} is not one linear lineage`);
    generationTails.set(generation.generation, tails[0]);
    if (generation.generation === codeQa.generation && tails[0].task_id !== codeQa.current_task_id) {
      fail('current CodeQA task must be the sole tail of its generation');
    }
  }

  const roundTasks = new Set();
  for (let index = 0; index < codeQa.rounds.length; index += 1) {
    const round = codeQa.rounds[index];
    if (!isPlainObject(round) || round.number !== index + 1) fail('CodeQA round numbers must be contiguous and ordered');
    const name = requiredText(round.name, `CodeQA round ${round.number} name`);
    requiredText(round.lens, `CodeQA round ${round.number} lens`);
    if (!CODE_QA_NOVELTY.has(round.novelty)) fail(`invalid novelty for CodeQA round ${round.number}`);
    if (round.material_novelty !== (round.novelty === 'material')) fail(`inconsistent material novelty for CodeQA round ${round.number}`);
    if (round.represented_only !== (round.novelty === 'represented')) fail(`inconsistent represented-only flag for CodeQA round ${round.number}`);
    if (round.represented_locally_verified !== (round.novelty === 'represented')) {
      fail(`represented novelty is not explicitly locally verified for CodeQA round ${round.number}`);
    }
    if (round.locally_reconciled !== true || round.terminal_successful !== true
      || round.semantic_success !== true || round.status !== 'COMPLETED') {
      fail(`CodeQA round ${round.number} is not terminal, successful, and locally reconciled`);
    }
    const task = tasks.get(requiredText(round.task_id, `CodeQA round ${round.number} task_id`));
    if (!task || task.status !== 'COMPLETED') fail(`CodeQA round ${round.number} does not reference a completed task`);
    if (round.transport !== task.transport || round.generation !== task.generation) fail(`CodeQA round ${round.number} task identity is inconsistent`);
    if (roundTasks.has(task.task_id)) fail(`CodeQA task ${task.task_id} is recorded in more than one round`);
    roundTasks.add(task.task_id);
    if (!task.result_checkpoint || task.result_checkpoint.semantic_success !== true
      || task.result_checkpoint.id !== round.result_checkpoint_id
      || task.result_checkpoint.round_number !== round.number) {
      fail(`CodeQA round ${round.number} does not consume its task result checkpoint exactly once`);
    }
    if (index < CODE_QA_CORE_ROUNDS.length && name !== CODE_QA_CORE_ROUNDS[index]) {
      fail(`first four CodeQA rounds must be exact and ordered: expected ${CODE_QA_CORE_ROUNDS[index]}, received ${name}`);
    }
    if (index >= CODE_QA_CORE_ROUNDS.length && CODE_QA_CORE_ROUNDS.includes(name)) fail(`duplicate core CodeQA round: ${name}`);
  }

  for (const task of tasks.values()) {
    const roundNumber = task.result_checkpoint?.round_number;
    if (roundNumber !== null && roundNumber !== undefined) {
      const round = codeQa.rounds[roundNumber - 1];
      if (!round || round.task_id !== task.task_id) fail(`CodeQA task ${task.task_id} has an invalid consumed result checkpoint`);
    }
  }

  if (codeQa.convergence !== null) {
    const convergence = codeQa.convergence;
    if (!isPlainObject(convergence) || convergence.eligible !== true) fail('persisted CodeQA convergence must be an eligible result or null');
    requiredText(convergence.checked_at, 'persisted CodeQA convergence checked_at');
    if (convergence.round_count !== codeQa.rounds.length) fail('persisted CodeQA convergence is stale for the current rounds');
    if (!isPlainObject(convergence.core_rounds)) fail('persisted CodeQA convergence core_rounds must be an object');
    for (const name of CODE_QA_CORE_ROUNDS) {
      const round = codeQa.rounds.find(candidate => candidate.name === name);
      if (!round || convergence.core_rounds[name] !== round.number) fail(`persisted CodeQA convergence is missing core round ${name}`);
    }
    if (!Array.isArray(convergence.novelty_rounds) || convergence.novelty_rounds.length !== 2) {
      fail('persisted CodeQA convergence must identify its last two novelty rounds');
    }
    const lastTwo = codeQa.rounds.slice(-2);
    const convergenceFloor = codeQa.convergence_floor_round ?? 0;
    if (lastTwo.some(round => round.number <= convergenceFloor)) {
      fail(`persisted CodeQA convergence novelty rounds must be recorded after convergence floor ${convergenceFloor}`);
    }
    for (let index = 0; index < lastTwo.length; index += 1) {
      const round = lastTwo[index];
      const persisted = convergence.novelty_rounds[index];
      if (!isPlainObject(persisted) || persisted.number !== round.number || persisted.task_id !== round.task_id
        || persisted.lens !== round.lens || persisted.novelty !== round.novelty) {
        fail('persisted CodeQA convergence novelty window does not match the last two rounds');
      }
    }
    if (new Set(lastTwo.map(round => round.task_id)).size !== 2
      || new Set(lastTwo.map(round => round.lens.trim().toLowerCase())).size !== 2
      || lastTwo[1].task_id !== codeQa.current_task_id
      || tasks.get(lastTwo[1].task_id)?.parent_task_id !== lastTwo[0].task_id
      || lastTwo.some(round => round.material_novelty || !['represented', 'none'].includes(round.novelty))) {
      fail('persisted CodeQA convergence no longer satisfies the novelty gate');
    }
  }

  for (let index = 0; index < codeQa.recoveries.length; index += 1) {
    const recovery = codeQa.recoveries[index];
    const fromGeneration = index + 1;
    const toGeneration = index + 2;
    if (!isPlainObject(recovery) || recovery.explicit !== true
      || recovery.from_generation !== fromGeneration || recovery.to_generation !== toGeneration) {
      fail('CodeQA recovery records must be explicit, contiguous generation transitions');
    }
    const from = tasks.get(requiredText(recovery.from_task_id, `CodeQA recovery ${toGeneration} from_task_id`));
    const to = tasks.get(requiredText(recovery.to_task_id, `CodeQA recovery ${toGeneration} to_task_id`));
    if (!from || from.generation !== fromGeneration || !CODE_QA_TERMINAL_STATUSES.has(from.status)) {
      fail(`CodeQA recovery ${toGeneration} does not replace a terminal task from the prior generation`);
    }
    if (from.status === 'COMPLETED') {
      if (!from.result_checkpoint) fail(`completed CodeQA recovery source ${from.task_id} lacks an ingested semantic checkpoint`);
      if (from.result_checkpoint.semantic_success === true && from.result_checkpoint.round_number === null) {
        fail(`semantically successful CodeQA recovery source ${from.task_id} lacks a reconciled round`);
      }
      if (from.result_checkpoint.semantic_success === false && from.result_checkpoint.round_number !== null) {
        fail(`semantically unsuccessful CodeQA recovery source ${from.task_id} cannot have a successful round`);
      }
    }
    if (generationTails.get(fromGeneration)?.task_id !== from.task_id) {
      fail(`CodeQA recovery ${toGeneration} does not replace the prior generation tail`);
    }
    if (!to || to.generation !== toGeneration || to.parent_task_id !== null
      || to.task_id !== generations.get(toGeneration).root_task_id) {
      fail(`CodeQA recovery ${toGeneration} does not open a fresh generation root`);
    }
    if (recovery.from_transport !== from.transport || recovery.to_transport !== to.transport) {
      fail(`CodeQA recovery ${toGeneration} transport record is inconsistent`);
    }
    const boundRecovery = codeQa.dispatch_intents?.find(intent => intent.bound_task_id === to.task_id);
    if (boundRecovery && (boundRecovery.kind !== 'recover' || boundRecovery.from_task_id !== from.task_id)) {
      fail(`CodeQA recovery ${toGeneration} does not match its bound dispatch intent`);
    }
    requiredText(recovery.reason, `CodeQA recovery ${toGeneration} reason`);
  }

  const current = tasks.get(codeQa.current_task_id);
  if (!current) fail(`current CodeQA task is absent: ${codeQa.current_task_id}`);
  if (current.generation !== codeQa.generation || current.transport !== codeQa.transport
    || current.status !== codeQa.status || current.parent_task_id !== codeQa.parent_task_id) {
    fail('current CodeQA task does not match lifecycle generation, transport, parent, and status mirrors');
  }
  if (generations.get(codeQa.generation).root_task_id !== codeQa.root_task_id) {
    fail('CodeQA root_task_id does not match the current generation root');
  }
  return codeQa;
}

function touchCodeQA(codeQa, task) {
  const timestamp = now();
  task.updated_at = timestamp;
  codeQa.updated_at = timestamp;
  codeQa.status = task.status;
  codeQa.parent_task_id = task.parent_task_id;
  codeQa.convergence = null;
}

function newCodeQATask({ taskId, generation, transport, parentTaskId, kind, status }) {
  const timestamp = now();
  return {
    task_id: taskId,
    generation,
    transport,
    parent_task_id: parentTaskId,
    kind,
    status,
    result_checkpoint: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function validateCodeQAUnavailable(attestation) {
  if (!isPlainObject(attestation)) fail('CodeQA unavailability attestation must be an object');
  if (attestation.schema_version !== CODE_QA_UNAVAILABLE_SCHEMA_VERSION) {
    fail(`unsupported CodeQA unavailability schema: ${attestation.schema_version}`);
  }
  if (!CODE_QA_UNAVAILABLE_CAUSES.has(attestation.cause)) {
    fail(`unsupported CodeQA unavailability cause: ${attestation.cause}`);
  }
  requiredText(attestation.evidence_id, 'CodeQA unavailability evidence_id');
  requiredText(attestation.reason, 'CodeQA unavailability reason');
  requiredText(attestation.attested_at, 'CodeQA unavailability attested_at');
  return attestation;
}

function validateCodeQANonconvergentClose(attestation) {
  if (!isPlainObject(attestation)) fail('CodeQA nonconvergent-close attestation must be an object');
  if (attestation.schema_version !== CODE_QA_NONCONVERGENT_CLOSE_SCHEMA_VERSION) {
    fail(`unsupported CodeQA nonconvergent-close schema: ${attestation.schema_version}`);
  }
  if (!Number.isSafeInteger(attestation.rounds_run) || attestation.rounds_run < CODE_QA_NONCONVERGENT_CLOSE_MIN_ROUNDS) {
    fail(`CodeQA nonconvergent-close rounds_run must be a safe integer >= ${CODE_QA_NONCONVERGENT_CLOSE_MIN_ROUNDS}`);
  }
  requiredText(attestation.clean_rounds, 'CodeQA nonconvergent-close clean_rounds');
  requiredText(attestation.evidence_id, 'CodeQA nonconvergent-close evidence_id');
  requiredText(attestation.authorized_by, 'CodeQA nonconvergent-close authorized_by');
  requiredText(attestation.reason, 'CodeQA nonconvergent-close reason');
  requiredText(attestation.attested_at, 'CodeQA nonconvergent-close attested_at');
  return attestation;
}

// Attest that no CodeQA lineage can exist for this repository. Fail closed: the
// attestation is refused whenever the provider demonstrably did reach the
// repository, so it can never launder a failed, cancelled, or skipped
// interrogation into an absent one.
function attestCodeQAUnavailable(record, { cause, evidenceId, reason }) {
  if (!CODE_QA_UNAVAILABLE_CAUSES.has(cause)) {
    fail(`unsupported CodeQA unavailability cause: ${cause}; expected one of ${[...CODE_QA_UNAVAILABLE_CAUSES].join(', ')}`);
  }
  if (record.code_qa_unavailable !== undefined) {
    fail(`CodeQA unavailability is already attested for ${record.name} and is immutable`);
  }
  if (record.code_qa_dispatch_intent !== undefined) {
    const intent = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
    fail(`resolve dispatch intent ${intent.intent_id} before attesting CodeQA unavailability for ${record.name}`);
  }
  // Any recorded task or round proves the provider reached this repository.
  if (isPlainObject(record.code_qa)) {
    const tasks = Array.isArray(record.code_qa.tasks) ? record.code_qa.tasks.length : 0;
    const rounds = Array.isArray(record.code_qa.rounds) ? record.code_qa.rounds.length : 0;
    if (tasks > 0 || rounds > 0) {
      fail(`CodeQA reached ${record.name} (${tasks} task(s), ${rounds} round(s)); a reachable provider cannot be attested unavailable`);
    }
  }
  const timestamp = now();
  record.code_qa_unavailable = {
    schema_version: CODE_QA_UNAVAILABLE_SCHEMA_VERSION,
    cause,
    evidence_id: evidenceId,
    reason,
    attested_at: timestamp,
  };
  record.updated_at = timestamp;
  return validateCodeQAUnavailable(record.code_qa_unavailable);
}

function attestCodeQANonconvergentClose(record, {
  roundsRun, cleanRounds, evidenceId, authorizedBy, reason,
}) {
  if (record.code_qa_nonconvergent_close !== undefined) {
    fail(`CodeQA nonconvergent-close is already attested for ${record.name} and is immutable`);
  }
  if (record.code_qa_unavailable !== undefined) {
    validateCodeQAUnavailable(record.code_qa_unavailable);
    fail(`CodeQA unavailability is already attested for ${record.name}; nonconvergent-close is mutually exclusive`);
  }
  if (record.code_qa_dispatch_intent !== undefined) {
    const intent = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
    fail(`resolve dispatch intent ${intent.intent_id} before attesting CodeQA nonconvergent-close for ${record.name}`);
  }
  if (!isPlainObject(record.code_qa)) {
    fail(`CodeQA lifecycle does not exist for ${record.name}; use CodeQA unavailability attestation instead`);
  }
  validateCodeQaLifecycle(record.code_qa);
  if (record.code_qa.convergence?.eligible === true) {
    fail(`CodeQA convergence is already satisfied for ${record.name}; use codeqa-convergence instead`);
  }
  const names = new Set(record.code_qa.rounds.map(round => round.name));
  const missingCoreRounds = CODE_QA_CORE_ROUNDS.filter(name => !names.has(name));
  if (missingCoreRounds.length) {
    fail(`CodeQA nonconvergent-close requires core rounds: ${missingCoreRounds.join(', ')}`);
  }
  if (!Number.isSafeInteger(roundsRun) || roundsRun < CODE_QA_NONCONVERGENT_CLOSE_MIN_ROUNDS) {
    fail(`CodeQA nonconvergent-close rounds_run must be a safe integer >= ${CODE_QA_NONCONVERGENT_CLOSE_MIN_ROUNDS}`);
  }
  if (roundsRun !== record.code_qa.rounds.length) {
    fail(`CodeQA nonconvergent-close rounds_run must equal recorded CodeQA rounds (${record.code_qa.rounds.length}); received ${roundsRun}`);
  }
  const timestamp = now();
  record.code_qa_nonconvergent_close = {
    schema_version: CODE_QA_NONCONVERGENT_CLOSE_SCHEMA_VERSION,
    rounds_run: roundsRun,
    clean_rounds: cleanRounds,
    evidence_id: evidenceId,
    authorized_by: authorizedBy,
    reason,
    attested_at: timestamp,
  };
  record.updated_at = timestamp;
  return validateCodeQANonconvergentClose(record.code_qa_nonconvergent_close);
}

// Convergence substitute for an attested-unavailable lane. It satisfies the
// same downstream gate as a typed CodeQA convergence because the lane has done
// everything the environment permits, and it records the cause so provenance
// is never lost.
function codeQaUnavailableConvergence(record) {
  const attestation = validateCodeQAUnavailable(record.code_qa_unavailable);
  return {
    eligible: true,
    checked_at: now(),
    mode: 'codeqa-unavailable',
    cause: attestation.cause,
    evidence_id: attestation.evidence_id,
    round_count: 0,
    core_rounds: Object.fromEntries(CODE_QA_CORE_ROUNDS.map(name => [name, null])),
    novelty_rounds: [],
    note: 'No CodeQA lineage is possible for this repository; convergence rests on the local-source model alone.',
  };
}

function codeQaConvergenceSatisfied(record) {
  if (record.code_qa_unavailable !== undefined) {
    validateCodeQAUnavailable(record.code_qa_unavailable);
    return true;
  }
  if (record.code_qa_nonconvergent_close !== undefined) {
    validateCodeQANonconvergentClose(record.code_qa_nonconvergent_close);
    return true;
  }
  return isPlainObject(record.code_qa)
    && record.code_qa.convergence !== null
    && record.code_qa.convergence !== undefined;
}

function codeQaConvergence(codeQa) {
  validateCodeQaLifecycle(codeQa);
  const names = new Set(codeQa.rounds.map(round => round.name));
  const missingCoreRounds = CODE_QA_CORE_ROUNDS.filter(name => !names.has(name));
  const lastTwo = codeQa.rounds.slice(-2);
  const convergenceFloor = codeQa.convergence_floor_round ?? 0;
  const failures = [];
  if (missingCoreRounds.length) failures.push(`missing core rounds: ${missingCoreRounds.join(', ')}`);
  if (lastTwo.length !== 2) failures.push('fewer than two terminal successful locally reconciled rounds are recorded');
  if (lastTwo.length === 2) {
    if (lastTwo.some(round => round.number <= convergenceFloor)) {
      failures.push(`last two novelty rounds must be recorded after convergence floor ${convergenceFloor}`);
    }
    const tasks = lastTwo.map(round => codeQaTask(codeQa, round.task_id));
    if (new Set(lastTwo.map(round => round.task_id)).size !== 2) failures.push('last two rounds must use distinct task IDs');
    if (new Set(lastTwo.map(round => round.lens.trim().toLowerCase())).size !== 2) failures.push('last two rounds must use distinct nonempty lens labels');
    if (lastTwo[1].task_id !== codeQa.current_task_id) failures.push('current task must be the latest terminal successful locally reconciled round');
    if (tasks[1]?.parent_task_id !== tasks[0]?.task_id) failures.push('last two rounds must be consecutive parent/child tasks in the persisted lineage');
    if (lastTwo.some(round => round.locally_reconciled !== true || round.terminal_successful !== true
      || round.semantic_success !== true || round.status !== 'COMPLETED')
      || tasks.some(task => !task || task.status !== 'COMPLETED' || task.result_checkpoint?.semantic_success !== true)) {
      failures.push('last two rounds must be terminal, successful, and locally reconciled');
    }
    if (lastTwo.some(round => round.material_novelty || !['represented', 'none'].includes(round.novelty))) {
      failures.push('last two rounds must have no material novelty or represented-only novelty');
    }
  }
  if (failures.length) fail(`CodeQA convergence rejected: ${failures.join('; ')}`);
  const timestamp = now();
  return {
    eligible: true,
    checked_at: timestamp,
    round_count: codeQa.rounds.length,
    core_rounds: Object.fromEntries(CODE_QA_CORE_ROUNDS.map(name => {
      const round = codeQa.rounds.find(candidate => candidate.name === name);
      return [name, round.number];
    })),
    novelty_rounds: lastTwo.map(round => ({
      number: round.number,
      task_id: round.task_id,
      lens: round.lens,
      novelty: round.novelty,
    })),
  };
}

function readRegularFileNoFollow(root, relative, label) {
  const candidate = path.resolve(root, relative);
  if (!inside(root, candidate)) fail(`${label} escapes repository: ${candidate}`);
  const parent = path.dirname(candidate);
  const parentRelative = path.relative(root, parent);
  let cursor = root;
  for (const component of parentRelative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    let componentStat;
    try {
      componentStat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code === 'ENOENT') fail(`${label} parent does not exist: ${cursor}`);
      throw error;
    }
    if (!componentStat.isDirectory() || componentStat.isSymbolicLink()) fail(`${label} parent must be a physical directory: ${cursor}`);
  }
  if (!inside(root, fs.realpathSync(parent))) fail(`${label} parent escapes repository: ${parent}`);
  let expected;
  try {
    expected = fs.lstatSync(candidate);
  } catch (error) {
    if (error.code === 'ENOENT') fail(`${label} does not exist: ${candidate}`);
    throw error;
  }
  if (!expected.isFile() || expected.isSymbolicLink()) fail(`${label} must be a regular no-follow file: ${candidate}`);
  let descriptor;
  try {
    descriptor = fs.openSync(candidate, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const actual = fs.fstatSync(descriptor);
    if (!actual.isFile() || actual.dev !== expected.dev || actual.ino !== expected.ino) fail(`${label} changed while opening: ${candidate}`);
    return fs.readFileSync(descriptor);
  } catch (error) {
    if (error instanceof StateError) throw error;
    if (error.code === 'ELOOP') fail(`${label} must not be a symlink: ${candidate}`);
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function canonicalPhaseTwoDigests(repo) {
  return Object.fromEntries(Object.entries(PHASE_TWO_CONTRACT_FILES).map(([key, relative]) => [
    key,
    crypto.createHash('sha256').update(readRegularFileNoFollow(repo, relative, key)).digest('hex'),
  ]));
}

function snapshot(repo) {
  const bytes = git(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  return {
    digest: crypto.createHash('sha256').update(bytes).digest('hex'),
    entries: bytes.toString('utf8').split('\0').filter(Boolean),
    captured_at: now(),
  };
}

function verifySnapshot(record, repo, label) {
  const expected = record.snapshots?.[label];
  if (!isPlainObject(expected)) fail(`snapshot label does not exist for ${record.name}: ${label}`);
  const actual = snapshot(repo);
  const result = {
    repo,
    label,
    matches: actual.digest === expected.digest,
    expected_digest: expected.digest,
    actual_digest: actual.digest,
    expected_entries: expected.entries,
    actual_entries: actual.entries,
  };
  if (!result.matches) fail('repository Git status changed since the baseline snapshot');
  const receipt = {
    schema_version: 1,
    label,
    snapshot_digest: expected.digest,
    snapshot_captured_at: expected.captured_at,
    current_digest: actual.digest,
    verified_at: actual.captured_at,
  };
  record.verification_receipt = receipt;
  record.updated_at = receipt.verified_at;
  return { ...result, verification_receipt: receipt };
}

function requireFreshVerificationReceipt(record, repo, label) {
  const receipt = record.verification_receipt;
  const expected = record.snapshots?.[label];
  if (!isPlainObject(receipt) || receipt.schema_version !== 1 || receipt.label !== label
    || !isPlainObject(expected) || receipt.snapshot_digest !== expected.digest
    || receipt.snapshot_captured_at !== expected.captured_at
    || receipt.current_digest !== receipt.snapshot_digest) {
    fail(`Phase 8 completion requires a fresh successful verify receipt for snapshot label ${label}`);
  }
  const actual = snapshot(repo);
  if (actual.digest !== receipt.current_digest) {
    fail(`Phase 8 completion requires a fresh successful verify receipt; repository Git status changed after verify for ${label}`);
  }
  return receipt;
}

function ensurePhysicalDirectoryPath(root, target, label) {
  if (!inside(root, target)) fail(`${label} escapes its trusted root: ${target}`);
  const relative = path.relative(root, target);
  let cursor = root;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try {
        fs.mkdirSync(cursor, { recursive: false, mode: 0o700 });
      } catch (mkdirError) {
        if (mkdirError.code !== 'EEXIST') throw mkdirError;
      }
      stat = fs.lstatSync(cursor);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`${label} must use physical directories: ${cursor}`);
  }
  if (!inside(root, fs.realpathSync(target))) fail(`${label} escapes its trusted root: ${target}`);
}

function ensureLocalExcludes(repo, relativePaths, patterns, label) {
  const tracked = git(repo, ['ls-files', '-z', '--', ...relativePaths]).toString('utf8').split('\0').filter(Boolean);
  if (tracked.length) fail(`${label} paths contain tracked files; refusing to hide or overwrite:\n${tracked.join('\n')}`);

  const excludeRaw = git(repo, ['rev-parse', '--git-path', 'info/exclude']).toString('utf8').trim();
  const commonRaw = git(repo, ['rev-parse', '--git-common-dir']).toString('utf8').trim();
  const commonCandidate = path.resolve(repo, commonRaw);
  const excludeCandidate = path.resolve(repo, excludeRaw);
  if (!inside(commonCandidate, excludeCandidate)) fail(`local exclude escapes Git common directory: ${excludeCandidate}`);
  const common = fs.realpathSync(commonCandidate);
  if (!fs.statSync(common).isDirectory()) fail(`Git common directory is not a directory: ${common}`);
  const exclude = path.resolve(common, path.relative(commonCandidate, excludeCandidate));
  if (!inside(common, exclude)) fail(`local exclude escapes Git common directory: ${exclude}`);
  const excludeParent = path.dirname(exclude);
  ensurePhysicalDirectoryPath(common, excludeParent, 'local exclude parent');
  const parentBefore = fs.lstatSync(excludeParent);

  let expected = null;
  try {
    expected = fs.lstatSync(exclude);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (expected && (!expected.isFile() || expected.isSymbolicLink())) {
    fail(`local exclude must be a regular no-follow file: ${exclude}`);
  }

  let descriptor;
  try {
    descriptor = fs.openSync(
      exclude,
      fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    const actual = fs.fstatSync(descriptor);
    if (!actual.isFile() || (expected && !sameFileIdentity(actual, expected))) {
      fail(`local exclude changed while opening: ${exclude}`);
    }
    const parentAfter = fs.lstatSync(excludeParent);
    if (!parentAfter.isDirectory() || parentAfter.isSymbolicLink()
      || !sameFileIdentity(parentBefore, parentAfter)
      || !inside(common, fs.realpathSync(excludeParent))) {
      fail(`local exclude parent changed while opening: ${excludeParent}`);
    }
    const pathStat = fs.lstatSync(exclude);
    if (!pathStat.isFile() || pathStat.isSymbolicLink() || !sameFileIdentity(actual, pathStat)) {
      fail(`local exclude path changed while opening: ${exclude}`);
    }
    const existing = fs.readFileSync(descriptor, 'utf8');
    const lines = new Set(existing.split(/\r?\n/));
    const additions = patterns.filter(pattern => !lines.has(pattern));
    if (additions.length) {
      const prefix = existing === '' || existing.endsWith('\n') ? '' : '\n';
      fs.writeSync(descriptor, `${prefix}${additions.join('\n')}\n`, null, 'utf8');
      fs.fsyncSync(descriptor);
    }
  } catch (error) {
    if (error instanceof StateError) throw error;
    if (error.code === 'ELOOP') fail(`local exclude must be a regular no-follow file: ${exclude}`);
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  const failed = [];
  for (const relative of relativePaths) {
    const marker = path.join(repo, relative, '.learning-ignore-check');
    const result = gitResult(repo, ['check-ignore', '--no-index', '-q', marker]);
    if (result.status !== 0) failed.push(relative);
  }
  if (failed.length) fail(`${label} paths are not ignored after local exclude update: ${failed.join(', ')}`);
  return { repo, exclude, patterns };
}

function parseDetails(values) {
  const details = {};
  for (const value of values ?? []) {
    const separator = value.indexOf('=');
    if (separator < 1) fail(`detail must be key=value: ${value}`);
    details[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return details;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return 'usage: workspace-learning-state.mjs <inventory|init|status|next|checkpoint|ensure-ignored|snapshot|verify|contract-status|contract-observe-codeqa|contract-migrate|codeqa-status|codeqa-reserve|codeqa-resolve-intent|codeqa-nonconvergent-close|codeqa-start|codeqa-observe|codeqa-result|codeqa-round|codeqa-continue|codeqa-recover|codeqa-convergence> --workspace <path> [options]';
}

const command = process.argv[2];
if (!command) {
  console.error(usage());
  process.exit(2);
}

let values;
try {
  ({ values } = parseArgs({
    args: process.argv.slice(3),
    strict: true,
    options: {
      workspace: { type: 'string' },
      repo: { type: 'string' },
      phase: { type: 'string' },
      status: { type: 'string' },
      note: { type: 'string' },
      detail: { type: 'string', multiple: true, default: [] },
      label: { type: 'string', default: 'baseline' },
      transport: { type: 'string' },
      'task-id': { type: 'string' },
      'parent-task-id': { type: 'string' },
      'from-task-id': { type: 'string' },
      'result-id': { type: 'string' },
      round: { type: 'string' },
      'round-name': { type: 'string' },
      lens: { type: 'string' },
      novelty: { type: 'string' },
      'locally-reconciled': { type: 'string' },
      'semantic-success': { type: 'string' },
      'evidence-id': { type: 'string' },
      'intent-id': { type: 'string' },
      kind: { type: 'string' },
      'prompt-sha256': { type: 'string' },
      'expected-generation': { type: 'string' },
      resolution: { type: 'string' },
      'user-authorized': { type: 'string' },
      cause: { type: 'string' },
      reason: { type: 'string' },
      'rounds-run': { type: 'string' },
      'clean-rounds': { type: 'string' },
      'authorized-by': { type: 'string' },
    },
  }));
} catch (error) {
  console.error(`error: ${error.message}`);
  console.error(usage());
  process.exit(2);
}

try {
  if (!values.workspace) fail('--workspace is required');
  const workspace = realDirectory(values.workspace, 'workspace');

  switch (command) {
    case 'inventory': {
      print({ workspace, repositories: discover(workspace) });
      break;
    }
    case 'init': {
      if (isGitRoot(workspace)) ensureLocalExcludes(workspace, WORKSPACE_STATE_PATHS, WORKSPACE_EXCLUDE_PATTERNS, 'workspace state');
      const entries = discover(workspace);
      const state = withStateLock(workspace, () => {
        const merged = mergeState(workspace, readState(workspace, true), entries);
        writeState(workspace, merged);
        return merged;
      }, true);
      print(state);
      break;
    }
    case 'status': {
      const state = readState(workspace, true);
      if (!state) {
        print({ initialized: false, workspace, current: null, counts: {}, repositories: [] });
        break;
      }
      const counts = {};
      for (const record of state.repositories) counts[record.status] = (counts[record.status] ?? 0) + 1;
      print({
        initialized: true,
        workspace,
        updated_at: state.updated_at,
        current: activeRecord(state),
        counts,
        repositories: state.repositories.map(record => ({
          name: record.name,
          available: record.available,
          status: record.status,
          phase: record.current_phase,
        })),
      });
      break;
    }
    case 'next': {
      const state = readState(workspace, true);
      print(!state ? { initialized: false, workspace, current: null } : (activeRecord(state) ?? { status: 'workspace_complete' }));
      break;
    }
    case 'checkpoint': {
      if (!values.repo || !values.phase || !values.status) fail('checkpoint requires --repo, --phase, and --status');
      const phase = Number(values.phase);
      if (!Number.isInteger(phase) || phase < 1 || phase > PHASE_COUNT) fail(`phase must be 1-${PHASE_COUNT}`);
      if (!PHASE_STATUSES.has(values.status)) fail(`unsupported phase status: ${values.status}`);
      const details = parseDetails(values.detail);
      const record = mutateState(workspace, state => {
        const current = findRecord(state, values.repo);
        const contract = contractAssessment(current);
        const forbiddenLegacyDetails = Object.keys(details).filter(key => LEGACY_CODE_QA_TASK_STATE_KEYS.has(key));
        if (forbiddenLegacyDetails.length) {
          fail(`workflow contract v${WORKFLOW_CONTRACT_VERSION} reserves typed CodeQA task details; use CodeQA lifecycle commands instead of: ${forbiddenLegacyDetails.join(', ')}`);
        }
        if (phase >= 2 && contract.needs_migration) {
          fail(`checkpoint requires workflow/artifact contract migration; run contract-status then contract-migrate for ${current.name}`);
        }
        if (phase > 2 && current.contract_restudy_required === true) {
          fail(`Phase ${phase} cannot resume until Phase 2 is completed under workflow contract v${WORKFLOW_CONTRACT_VERSION}`);
        }
        if (!isPlainObject(current.phases) || !isPlainObject(current.phases[String(phase)])) {
          fail(`phase ${phase} checkpoint is invalid for ${current.name}`);
        }
        if (phase === 3 && values.status === 'blocked' && current.code_qa_nonconvergent_close !== undefined) {
          fail(`Phase 3 has a code_qa_nonconvergent_close terminal attestation for ${current.name}; it cannot be downgraded to blocked`);
        }
        const checkpoint = current.phases[String(phase)];
        const completedReplay = values.status === 'completed' && checkpoint.status === 'completed';
        if (completedReplay) {
          const changedDetails = Object.entries(details)
            .filter(([key, value]) => checkpoint.details?.[key] !== value)
            .map(([key]) => key);
          if ((values.note !== undefined && values.note !== checkpoint.note) || changedDetails.length) {
            fail(`completed Phase ${phase} checkpoint is immutable; explicitly reopen it before changing evidence`);
          }
        }
        if (phase > 1 && values.status !== 'pending') {
          const incompletePrior = Array.from({ length: phase - 1 }, (_, index) => index + 1)
            .filter(prior => current.phases[String(prior)]?.status !== 'completed');
          if (incompletePrior.length) {
            fail(`Phase ${phase} requires all prior phases completed; incomplete: ${incompletePrior.join(', ')}`);
          }
        }
        const requiresConvergence = (phase === 3 && values.status === 'completed')
          || (phase >= 4 && values.status !== 'pending');
        if (phase === 3 && values.status === 'completed' && current.code_qa_dispatch_intent !== undefined) {
          const intent = validateCodeQaDispatchIntent(current.code_qa_dispatch_intent);
          fail(`Phase 3 completion is blocked by unresolved CodeQA dispatch intent ${intent.intent_id}`);
        }
        if (requiresConvergence) {
          if (!codeQaConvergenceSatisfied(current)) {
            fail(`Phase ${phase} ${values.status} requires a current typed CodeQA convergence checkpoint, or an attested CodeQA unavailability for this repository`);
          }
          // An attested-unavailable lane has no lineage to validate; a lane that
          // did run CodeQA must still satisfy the full lifecycle contract.
          if (current.code_qa_unavailable === undefined) validateCodeQaLifecycle(current.code_qa);
        }
        if (phase === 2 && values.status === 'completed') {
          const missingDigests = PHASE_TWO_CONTRACT_DIGESTS.filter(key => (
            !Object.hasOwn(details, key) || !/^[a-f0-9]{64}$/i.test(details[key])
          ));
          if (missingDigests.length) {
            fail(`Phase 2 completion requires SHA-256 details in this checkpoint: ${missingDigests.join(', ')}`);
          }
          const { repo } = resolveRepo(workspace, state, values.repo);
          const actualDigests = canonicalPhaseTwoDigests(repo);
          const mismatches = PHASE_TWO_CONTRACT_DIGESTS.filter(key => details[key].toLowerCase() !== actualDigests[key]);
          if (mismatches.length) fail(`Phase 2 completion digest mismatch: ${mismatches.join(', ')}`);
        }
        if (phase === 8 && values.status === 'completed') {
          if (values.label !== 'baseline') fail('Phase 8 completion requires the immutable baseline snapshot label');
          const { repo } = resolveRepo(workspace, state, values.repo);
          requireFreshVerificationReceipt(current, repo, values.label);
        }
        if (completedReplay) return current;
        const checkpointTime = now();
        if (values.status !== 'completed') {
          const invalidatesPhaseThree = (phase < 3 && current.phases['3'].status !== 'pending')
            || (phase === 3 && checkpoint.status === 'completed');
          invalidateDownstreamPhases(current, phase, checkpointTime, invalidatesPhaseThree);
        }
        checkpoint.status = values.status;
        checkpoint.updated_at = checkpointTime;
        if (values.note) checkpoint.note = values.note;
        checkpoint.details = { ...(checkpoint.details ?? {}), ...details };
        current.details = { ...(current.details ?? {}), ...details };
        current.updated_at = checkpointTime;
        if (!(phase === 8 && values.status === 'completed')) delete current.verification_receipt;
        if (values.status !== 'completed') delete current.completed_at;
        if (values.status === 'pending') {
          current.current_phase = Array.from({ length: PHASE_COUNT }, (_, index) => index + 1)
            .find(number => current.phases[String(number)].status !== 'completed');
          if (!current.available) current.status = 'unavailable';
          else current.status = Object.values(current.phases).every(item => item.status === 'pending') ? 'pending' : 'in_progress';
        } else if (values.status === 'blocked') {
          current.status = 'blocked';
          current.current_phase = phase;
        } else if (values.status === 'in_progress') {
          current.status = 'in_progress';
          current.current_phase = phase;
        } else if (values.status === 'completed') {
          if (phase === 2 && current.contract_restudy_required === true) {
            current.contract_restudy_required = false;
            current.contract_restudy_completed_at = now();
          }
          const complete = Object.values(current.phases).every(item => item.status === 'completed');
          if (complete) {
            current.status = 'completed';
            current.current_phase = PHASE_COUNT;
            current.completed_at = now();
          } else {
            current.status = 'in_progress';
            current.current_phase = Array.from({ length: PHASE_COUNT }, (_, index) => index + 1)
              .find(number => current.phases[String(number)].status !== 'completed');
          }
        }
        return current;
      });
      print(record);
      break;
    }
    case 'ensure-ignored': {
      if (!values.repo) fail('ensure-ignored requires --repo');
      const state = readState(workspace);
      const { repo } = resolveRepo(workspace, state, values.repo);
      print(ensureLocalExcludes(repo, ARTIFACT_PATHS, EXCLUDE_PATTERNS, 'artifact'));
      break;
    }
    case 'snapshot': {
      if (!values.repo) fail('snapshot requires --repo');
      const captured = mutateState(workspace, state => {
        const { repo, record } = resolveRepo(workspace, state, values.repo);
        if (record.snapshots?.[values.label] !== undefined) {
          fail(`snapshot is immutable once captured for ${record.name}: ${values.label}`);
        }
        record.snapshots = { ...(record.snapshots ?? {}), [values.label]: snapshot(repo) };
        if (record.verification_receipt?.label === values.label) delete record.verification_receipt;
        return record.snapshots[values.label];
      });
      print(captured);
      break;
    }
    case 'verify': {
      if (!values.repo) fail('verify requires --repo');
      const result = mutateState(workspace, state => {
        const { repo, record } = resolveRepo(workspace, state, values.repo);
        return verifySnapshot(record, repo, values.label);
      });
      print(result);
      break;
    }
    case 'contract-status': {
      if (!values.repo) fail('contract-status requires --repo');
      const state = readState(workspace);
      print(contractAssessment(findRecord(state, values.repo)));
      break;
    }
    case 'contract-observe-codeqa': {
      if (!values.repo || !values['task-id'] || !values.transport || !values.status || !values['evidence-id']) {
        fail('contract-observe-codeqa requires --repo, --task-id, --transport, --status, and --evidence-id');
      }
      const observation = mutateState(workspace, state => observeLegacyCodeQAForContract(findRecord(state, values.repo), {
        taskId: requiredText(values['task-id'], '--task-id'),
        transport: codeQaTransport(values.transport),
        status: codeQaStatus(values.status),
        evidenceId: requiredText(values['evidence-id'], '--evidence-id'),
      }));
      print(observation);
      break;
    }
    case 'contract-migrate': {
      if (!values.repo) fail('contract-migrate requires --repo');
      const result = mutateState(workspace, state => migrateContract(findRecord(state, values.repo)));
      print(result);
      break;
    }
    case 'codeqa-reserve': {
      if (!values.repo || !values['intent-id'] || !values.kind || !values.transport
        || !values['prompt-sha256'] || !values['expected-generation'] || !values.reason) {
        fail('codeqa-reserve requires --repo, --intent-id, --kind, --transport mcp, --prompt-sha256, --expected-generation, and --reason');
      }
      const intent = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo, false);
        requireCodeQaPhaseContext(record, 'CodeQA dispatch reservation');
        return reserveCodeQADispatchIntent(record, {
          intentId: requiredText(values['intent-id'], '--intent-id'),
          kind: codeQaIntentKind(values.kind),
          transport: codeQaTransport(values.transport),
          promptSha256: sha256Digest(values['prompt-sha256'], '--prompt-sha256'),
          expectedGeneration: positiveInteger(values['expected-generation'], '--expected-generation'),
          parentTaskId: values['parent-task-id'] === undefined ? undefined : requiredText(values['parent-task-id'], '--parent-task-id'),
          fromTaskId: values['from-task-id'] === undefined ? undefined : requiredText(values['from-task-id'], '--from-task-id'),
          reason: requiredText(values.reason, '--reason'),
        });
      });
      print(intent);
      break;
    }
    case 'codeqa-resolve-intent': {
      if (!values.repo || !values['intent-id'] || !values.resolution || !values['evidence-id']
        || !values.reason || values['user-authorized'] === undefined) {
        fail('codeqa-resolve-intent requires --repo, --intent-id, --resolution no-task-created, --evidence-id, --reason, and --user-authorized true');
      }
      const resolved = mutateState(workspace, state => {
        const record = findRecord(state, requiredText(values.repo, '--repo'));
        if (!record.available) fail(`repository is unavailable: ${record.name}`);
        requireCurrentContract(record, 'CodeQA dispatch intent resolution');
        return resolveCodeQADispatchIntent(record, {
          intentId: requiredText(values['intent-id'], '--intent-id'),
          resolution: requiredText(values.resolution, '--resolution').toLowerCase(),
          evidenceId: requiredText(values['evidence-id'], '--evidence-id'),
          reason: requiredText(values.reason, '--reason'),
          userAuthorized: explicitBoolean(values['user-authorized'], '--user-authorized'),
        });
      });
      print(resolved);
      break;
    }
    case 'codeqa-status': {
      if (!values.repo) fail('codeqa-status requires --repo');
      const state = readState(workspace);
      const record = findRecord(state, values.repo);
      if (!record.available) fail(`repository is unavailable: ${record.name}`);
      requireCurrentContract(record, 'CodeQA lifecycle inspection');
      const pendingIntent = record.code_qa_dispatch_intent === undefined
        ? null : validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
      // Surface the unavailability attestation wherever it exists. The lane is
      // not second-class, but a reader must always be able to tell whether a
      // CodeQA lineage actually ran.
      const unavailable = record.code_qa_unavailable === undefined
        ? null : validateCodeQAUnavailable(record.code_qa_unavailable);
      if (record.code_qa === undefined) {
        const empty = { initialized: false, repository: record.name, lifecycle: null };
        const withIntent = pendingIntent === null ? empty : { ...empty, dispatch_intent: pendingIntent };
        print(unavailable === null ? withIntent : { ...withIntent, code_qa_unavailable: unavailable });
      } else {
        const lifecycle = codeQaRecord(state, values.repo).code_qa;
        print(pendingIntent === null ? lifecycle : { ...lifecycle, dispatch_intent: pendingIntent });
      }
      break;
    }
    case 'codeqa-start': {
      if (!values.repo || !values['task-id'] || !values['intent-id'] || !values.transport || !values.status || !values.reason) {
        fail('codeqa-start requires --repo, --task-id, --intent-id, --transport, --status, and --reason');
      }
      const taskId = requiredText(values['task-id'], '--task-id');
      const transport = codeQaTransport(values.transport);
      if (transport !== 'mcp') fail('new CodeQA lifecycles require native MCP transport');
      const status = codeQaStatus(values.status);
      const reason = requiredText(values.reason, '--reason');
      const codeQa = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo, false);
        requireCodeQaPhaseContext(record, 'CodeQA lifecycle creation');
        if (record.code_qa !== undefined) {
          fail(`CodeQA lifecycle already exists for ${record.name}; inspect codeqa-status or use explicit codeqa-recover`);
        }
        const boundIntent = bindCodeQADispatchIntent(record, {
          intentId: requiredText(values['intent-id'], '--intent-id'),
          kind: 'start',
          taskId,
          expectedGeneration: 1,
          reason,
        });
        const task = newCodeQATask({
          taskId,
          generation: 1,
          transport,
          parentTaskId: null,
          kind: 'start',
          status,
        });
        task.dispatch_intent_id = boundIntent.intent_id;
        const timestamp = now();
        record.code_qa = {
          schema_version: CODE_QA_SCHEMA_VERSION,
          generation: 1,
          transport,
          root_task_id: taskId,
          current_task_id: taskId,
          parent_task_id: null,
          status,
          generations: [{ generation: 1, transport, root_task_id: taskId, reason, started_at: timestamp }],
          tasks: [task],
          rounds: [],
          recoveries: [],
          intent_enforcement_task_index: 0,
          dispatch_intents: [boundIntent],
          convergence: null,
          created_at: timestamp,
          updated_at: timestamp,
        };
        record.updated_at = timestamp;
        return validateCodeQaLifecycle(record.code_qa);
      });
      print(codeQa);
      break;
    }
    case 'codeqa-observe': {
      if (!values.repo || !values['task-id'] || !values.transport || !values.status) {
        fail('codeqa-observe requires --repo, --task-id, --transport, and --status');
      }
      const status = codeQaStatus(values.status);
      const codeQa = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo);
        requireCodeQaPhaseContext(record, 'CodeQA status observation');
        const task = currentCodeQATask(record.code_qa, values['task-id'], 'CodeQA status observation');
        requireTaskTransport(record.code_qa, task, values.transport);
        if (!CODE_QA_STATUS_TRANSITIONS.get(task.status).has(status)) {
          fail(`invalid CodeQA status transition for ${task.task_id}: ${task.status} -> ${status}`);
        }
        task.status = status;
        task.observed_at = now();
        touchCodeQA(record.code_qa, task);
        record.updated_at = record.code_qa.updated_at;
        return validateCodeQaLifecycle(record.code_qa);
      });
      print(codeQa);
      break;
    }
    case 'codeqa-result': {
      if (!values.repo || !values['task-id'] || !values.transport || !values['result-id']
        || values['semantic-success'] === undefined) {
        fail('codeqa-result requires --repo, --task-id, --transport, --result-id, and --semantic-success true|false');
      }
      const resultId = requiredText(values['result-id'], '--result-id');
      const semanticSuccess = explicitBoolean(values['semantic-success'], '--semantic-success');
      const codeQa = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo);
        requireCodeQaPhaseContext(record, 'CodeQA result ingestion');
        const task = currentCodeQATask(record.code_qa, values['task-id'], 'CodeQA result ingestion');
        requireTaskTransport(record.code_qa, task, values.transport);
        if (task.status !== 'COMPLETED') fail(`CodeQA result may be ingested only after provider COMPLETED status: ${task.task_id}`);
        if (task.result_checkpoint !== null) fail(`CodeQA result was already ingested for task ${task.task_id}`);
        task.result_checkpoint = {
          id: resultId,
          ingested: true,
          semantic_success: semanticSuccess,
          ingested_at: now(),
          round_number: null,
        };
        touchCodeQA(record.code_qa, task);
        record.updated_at = record.code_qa.updated_at;
        return validateCodeQaLifecycle(record.code_qa);
      });
      print(codeQa);
      break;
    }
    case 'codeqa-round': {
      if (!values.repo || !values['task-id'] || !values.transport || !values.round || !values['round-name']
        || !values.lens || !values.novelty || values['locally-reconciled'] === undefined) {
        fail('codeqa-round requires --repo, --task-id, --transport, --round, --round-name, --lens, --novelty, and --locally-reconciled true');
      }
      const roundNumber = positiveInteger(values.round, '--round');
      const roundName = normalizeRoundName(values['round-name']);
      const lens = requiredText(values.lens, '--lens');
      const novelty = codeQaNovelty(values.novelty);
      if (explicitBoolean(values['locally-reconciled'], '--locally-reconciled') !== true) {
        fail('codeqa-round requires --locally-reconciled true');
      }
      const round = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo);
        requireCodeQaPhaseContext(record, 'CodeQA round recording');
        const task = currentCodeQATask(record.code_qa, values['task-id'], 'CodeQA round recording');
        requireTaskTransport(record.code_qa, task, values.transport);
        if (task.status !== 'COMPLETED') fail(`CodeQA round requires a successfully completed task: ${task.task_id}`);
        if (!task.result_checkpoint) fail(`CodeQA round requires an ingested result checkpoint: ${task.task_id}`);
        if (task.result_checkpoint.semantic_success !== true) {
          fail(`CodeQA round requires explicit semantic success: ${task.task_id}`);
        }
        if (task.result_checkpoint.round_number !== null || codeQaRoundForTask(record.code_qa, task.task_id)) {
          fail(`CodeQA task result is already recorded in a round: ${task.task_id}`);
        }
        const expectedRound = record.code_qa.rounds.length + 1;
        if (roundNumber !== expectedRound) fail(`CodeQA round must be the next contiguous number ${expectedRound}; received ${roundNumber}`);
        const timestamp = now();
        const nextRound = {
          number: roundNumber,
          name: roundName,
          lens,
          task_id: task.task_id,
          generation: task.generation,
          transport: task.transport,
          status: 'COMPLETED',
          terminal_successful: true,
          semantic_success: true,
          result_checkpoint_id: task.result_checkpoint.id,
          locally_reconciled: true,
          novelty,
          material_novelty: novelty === 'material',
          represented_only: novelty === 'represented',
          represented_locally_verified: novelty === 'represented',
          recorded_at: timestamp,
        };
        task.result_checkpoint.round_number = roundNumber;
        record.code_qa.rounds.push(nextRound);
        touchCodeQA(record.code_qa, task);
        record.updated_at = record.code_qa.updated_at;
        validateCodeQaLifecycle(record.code_qa);
        return nextRound;
      });
      print(round);
      break;
    }
    case 'codeqa-continue': {
      if (!values.repo || !values['task-id'] || !values['parent-task-id'] || !values['intent-id'] || !values.transport || !values.status) {
        fail('codeqa-continue requires --repo, --task-id, --parent-task-id, --intent-id, --transport, and --status');
      }
      const taskId = requiredText(values['task-id'], '--task-id');
      const parentTaskId = requiredText(values['parent-task-id'], '--parent-task-id');
      const status = codeQaStatus(values.status);
      const codeQa = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo);
        requireCodeQaPhaseContext(record, 'CodeQA continuation');
        if (record.code_qa.transport !== 'mcp') fail('CodeQA continuation requires a native MCP-bound generation');
        const parent = currentCodeQATask(record.code_qa, parentTaskId, 'CodeQA continuation');
        requireTaskTransport(record.code_qa, parent, values.transport);
        assertContinuationReady(record.code_qa, parent);
        if (record.code_qa.tasks.some(task => task.task_id === taskId)) fail(`duplicate CodeQA task ID: ${taskId}`);
        const boundIntent = bindCodeQADispatchIntent(record, {
          intentId: requiredText(values['intent-id'], '--intent-id'),
          kind: 'continue',
          taskId,
          expectedGeneration: record.code_qa.generation,
          parentTaskId: parent.task_id,
        });
        const task = newCodeQATask({
          taskId,
          generation: record.code_qa.generation,
          transport: record.code_qa.transport,
          parentTaskId: parent.task_id,
          kind: 'continuation',
          status,
        });
        attachBoundCodeQAIntent(record.code_qa, task, boundIntent);
        record.code_qa.tasks.push(task);
        record.code_qa.current_task_id = taskId;
        record.code_qa.parent_task_id = parent.task_id;
        record.code_qa.status = status;
        touchCodeQA(record.code_qa, task);
        record.updated_at = record.code_qa.updated_at;
        return validateCodeQaLifecycle(record.code_qa);
      });
      print(codeQa);
      break;
    }
    case 'codeqa-recover': {
      if (!values.repo || !values['task-id'] || !values['from-task-id'] || !values['intent-id']
        || !values.transport || !values.status || !values.reason) {
        fail('codeqa-recover requires --repo, --task-id, --from-task-id, --intent-id, --transport, --status, and --reason');
      }
      const taskId = requiredText(values['task-id'], '--task-id');
      const fromTaskId = requiredText(values['from-task-id'], '--from-task-id');
      const transport = codeQaTransport(values.transport);
      if (transport !== 'mcp') fail('CodeQA recovery must open a native MCP generation');
      const status = codeQaStatus(values.status);
      const reason = requiredText(values.reason, '--reason');
      const codeQa = mutateState(workspace, state => {
        const record = codeQaRecord(state, values.repo);
        requireCodeQaPhaseContext(record, 'CodeQA recovery');
        const prior = currentCodeQATask(record.code_qa, fromTaskId, 'CodeQA recovery');
        assertRecoveryReady(record.code_qa, prior);
        if (record.code_qa.tasks.some(task => task.task_id === taskId)) fail(`duplicate CodeQA task ID: ${taskId}`);
        const priorGeneration = record.code_qa.generation;
        const generation = priorGeneration + 1;
        const boundIntent = bindCodeQADispatchIntent(record, {
          intentId: requiredText(values['intent-id'], '--intent-id'),
          kind: 'recover',
          taskId,
          expectedGeneration: generation,
          fromTaskId: prior.task_id,
          reason,
        });
        const task = newCodeQATask({
          taskId,
          generation,
          transport,
          parentTaskId: null,
          kind: 'recovery',
          status,
        });
        attachBoundCodeQAIntent(record.code_qa, task, boundIntent);
        const timestamp = now();
        record.code_qa.generations.push({ generation, transport, root_task_id: taskId, reason, started_at: timestamp });
        record.code_qa.tasks.push(task);
        record.code_qa.recoveries.push({
          explicit: true,
          from_generation: priorGeneration,
          to_generation: generation,
          from_task_id: prior.task_id,
          to_task_id: taskId,
          from_transport: prior.transport,
          to_transport: transport,
          reason,
          recovered_at: timestamp,
        });
        record.code_qa.generation = generation;
        record.code_qa.transport = transport;
        record.code_qa.root_task_id = taskId;
        record.code_qa.current_task_id = taskId;
        record.code_qa.parent_task_id = null;
        record.code_qa.status = status;
        touchCodeQA(record.code_qa, task);
        record.updated_at = record.code_qa.updated_at;
        return validateCodeQaLifecycle(record.code_qa);
      });
      print(codeQa);
      break;
    }
    case 'codeqa-unavailable': {
      if (!values.repo || !values.cause || !values['evidence-id'] || !values.reason) {
        fail(`codeqa-unavailable requires --repo, --cause <${[...CODE_QA_UNAVAILABLE_CAUSES].join('|')}>, --evidence-id, and --reason`);
      }
      const attested = mutateState(workspace, state => {
        const record = findRecord(state, requiredText(values.repo, '--repo'));
        if (!record.available) fail(`repository is unavailable: ${record.name}`);
        requireCurrentContract(record, 'CodeQA unavailability attestation');
        requireCodeQaPhaseContext(record, 'CodeQA unavailability attestation');
        return attestCodeQAUnavailable(record, {
          cause: requiredText(values.cause, '--cause').toLowerCase(),
          evidenceId: requiredText(values['evidence-id'], '--evidence-id'),
          reason: requiredText(values.reason, '--reason'),
        });
      });
      print(attested);
      break;
    }
    case 'codeqa-nonconvergent-close': {
      if (!values.repo || values['rounds-run'] === undefined || values['clean-rounds'] === undefined
        || !values['evidence-id'] || !values['authorized-by'] || !values.reason) {
        fail('codeqa-nonconvergent-close requires --repo, --rounds-run, --clean-rounds, --evidence-id, --authorized-by, and --reason');
      }
      const attested = mutateState(workspace, state => {
        const record = findRecord(state, requiredText(values.repo, '--repo'));
        if (!record.available) fail(`repository is unavailable: ${record.name}`);
        requireCurrentContract(record, 'CodeQA nonconvergent-close attestation');
        const incompletePrerequisites = [1, 2].filter(phase => record.phases?.[String(phase)]?.status !== 'completed');
        if (incompletePrerequisites.length) {
          fail(`CodeQA nonconvergent-close attestation requires completed Phases 1 and 2; incomplete: ${incompletePrerequisites.join(', ')}`);
        }
        if (!['in_progress', 'blocked'].includes(record.phases?.['3']?.status)) {
          fail(`CodeQA nonconvergent-close attestation requires Phase 3 in_progress or blocked; got ${record.phases?.['3']?.status}`);
        }
        return attestCodeQANonconvergentClose(record, {
          roundsRun: Number(values['rounds-run']),
          cleanRounds: requiredText(values['clean-rounds'], '--clean-rounds'),
          evidenceId: requiredText(values['evidence-id'], '--evidence-id'),
          authorizedBy: requiredText(values['authorized-by'], '--authorized-by'),
          reason: requiredText(values.reason, '--reason'),
        });
      });
      print(attested);
      break;
    }
    case 'codeqa-convergence': {
      if (!values.repo) fail('codeqa-convergence requires --repo');
      const convergence = mutateState(workspace, state => {
        // An attested-unavailable lane legitimately has no lifecycle, so the
        // lifecycle requirement is deferred until the attestation is checked.
        const record = codeQaRecord(state, values.repo, false);
        if (record.code_qa_unavailable === undefined && record.code_qa === undefined) {
          fail(`CodeQA lifecycle does not exist for ${record.name}; run codeqa-start`);
        }
        requireCodeQaPhaseContext(record, 'CodeQA convergence', true);
        if (record.code_qa_dispatch_intent !== undefined) {
          const intent = validateCodeQaDispatchIntent(record.code_qa_dispatch_intent);
          fail(`CodeQA convergence is blocked by unresolved dispatch intent ${intent.intent_id}`);
        }
        if (record.code_qa_unavailable !== undefined) {
          const attestedResult = codeQaUnavailableConvergence(record);
          record.updated_at = attestedResult.checked_at;
          return attestedResult;
        }
        const result = codeQaConvergence(record.code_qa);
        record.code_qa.convergence = result;
        record.code_qa.updated_at = result.checked_at;
        record.updated_at = result.checked_at;
        validateCodeQaLifecycle(record.code_qa);
        return result;
      });
      print(convergence);
      break;
    }
    default:
      fail(`unknown command: ${command}`);
  }
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(error instanceof StateError ? 1 : 2);
}
