#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertJsonSchema } from './lib/json-schema.mjs';
import { assertRelativePath, canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { contentDigest, hasDirectiveContent, hasSensitiveContent, readJsonNoFollow } from './lib/review-safety.mjs';
import { digestValue } from './lib/digests.mjs';
import { captureInitialWorkingTree, currentHead, digestInitialWorkingTree, repositoryIdentity, runReadOnlyGit } from './review-source.mjs';
import { captureLocalDirectory, digestLocalDirectory, localRepositoryIdentity, normalizeLocalScope, resolveLocalProjectRoot } from './lib/local-directory.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const bareDigest = (value) => value?.replace(/^sha256:/, '');
const sameDigest = (left, right) => bareDigest(left) === bareDigest(right);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const slug = '[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?';
const gitEnvironment = () => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
  GIT_OPTIONAL_LOCKS: '0',
});

function gitArgs(repository, args) {
  return ['-C', repository, '-c', 'core.fsmonitor=false', ...args];
}
function runGit(repository, args, encoding = null) {
  return runReadOnlyGit(repository, args, { encoding, maxBuffer: 32 * 1024 * 1024 });
}
export function gitText(repository, args) { return runGit(repository, args, 'utf8').trim(); }
export function isAncestor(repository, before, after) {
  const result = spawnSync('git', gitArgs(repository, ['merge-base', '--is-ancestor', before, after]), {
    env: gitEnvironment(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert(!result.error && [0, 1].includes(result.status), 'unable to verify resolution lineage');
  return result.status === 0;
}
function safeRelative(input) {
  assert(typeof input === 'string' && !/[\u0000-\u001f\u007f]/.test(input), 'unsafe path control characters');
  assertRelativePath(input);
  return input;
}
function within(relative, root) { return relative === root || relative.startsWith(root + '/'); }

// Keep lexical components until containment checks have rejected symlinks.
// Only the caller's repository alias (e.g. macOS /var) and its physical root are allowed.
function repositoryRelative(repository, repositoryInput, input) {
  assert(typeof input === 'string' && input.length > 0, 'artifact path is required');
  assert(!/[\u0000-\u001f\u007f\\]/.test(input), 'unsafe artifact path');
  assert(!input.split('/').some((part) => part === '..' || part === '.'), 'dot and parent artifact paths are forbidden');
  if (!path.isAbsolute(input)) return safeRelative(input);
  for (const root of [repository, path.resolve(repositoryInput)]) {
    const relative = path.relative(root, input).split(path.sep).join('/');
    if (relative && relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative)) return safeRelative(relative);
  }
  throw new Error('artifact path escapes the authorized repository');
}
export function resolutionRoot(repository, repositoryInput, input, kind = 'reviews') {
  assert(['reviews', 'debug'].includes(kind), 'unknown resolution artifact kind');
  const relative = repositoryRelative(repository, repositoryInput, input);
  assert(new RegExp('^\\.agents/' + kind + '/' + slug + '$').test(relative), `artifact root must be repository-owned .agents/${kind}/<slug>`);
  return { relative, root: containedPath(repository, relative, { expectedType: 'directory' }) };
}
const reviewRoot = (repository, repositoryInput, input) => resolutionRoot(repository, repositoryInput, input);

export function resolutionRepository(input, { local = false } = {}) {
  if (local) return resolveLocalProjectRoot(input);
  const repository = canonicalRoot(input);
  assert(canonicalRoot(gitText(repository, ['rev-parse', '--show-toplevel'])) === repository, '--repo-root must be the actual Git repository root');
  return repository;
}

export function readResolutionHandoff(repository, repositoryInput, rootInput, handoffRelative, { local = false, localScope } = {}) {
  const original = reviewRoot(repository, repositoryInput, rootInput);
  assert(/^debug-handoffs\/[A-Za-z0-9._-]+\.json$/.test(handoffRelative ?? ''), 'original handoff is required as a direct JSON child of debug-handoffs');
  execFileSync(process.execPath, [path.join(harnessRoot, 'scripts/validate-review-handoff.mjs'), '--repo-root', repository,
    '--artifact-root', original.root, '--handoff', handoffRelative,
    ...(local ? ['--local', '--scope', JSON.stringify(normalizeLocalScope(localScope))] : [])], { stdio: ['ignore', 'pipe', 'pipe'], env: gitEnvironment() });
  return { original, state: readJsonNoFollow(original.root, 'state.json'), handoff: readJsonNoFollow(original.root, handoffRelative) };
}

function untrackedEvidence(repository, exclusions, nested) {
  const raw = runGit(repository, ['ls-files', '--others', '--exclude-standard', '-z'], 'utf8');
  assert(!raw.includes('\uFFFD'), 'untracked path list contains invalid UTF-8');
  return raw.split('\0').filter(Boolean).sort().filter((relative) => !exclusions.some((root) => within(relative, root))).map((relative) => {
    safeRelative(relative);
    const parent = path.posix.dirname(relative);
    if (parent !== '.') containedPath(repository, parent, { expectedType: 'directory' });
    const file = path.join(repository, relative);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() && !nested) return { path: relative, kind: 'symlink', digest: 'sha256:' + hash(fs.readlinkSync(file)) };
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4 * 1024 * 1024, 'untracked resolution evidence must be a regular file no larger than 4 MiB');
    const digest = hash(fs.readFileSync(containedPath(repository, relative, { expectedType: 'file' })));
    return nested ? { path: relative, sha256: digest } : { path: relative, kind: 'file', digest: 'sha256:' + digest };
  });
}

export function diffEvidence(repository, resolution, exclusions, nested = true) {
  if (resolution.diff_mode === 'local-directory') {
    assert(nested && resolution.pre_fix_sha === null && resolution.post_fix_sha === null, 'local snapshot requires a nested packet with null commit SHAs');
    const snapshot = captureLocalDirectory(repository, resolution.local_scope, exclusions);
    assert(snapshot.evidence_gaps.length === 0, `local snapshot evidence is incomplete: ${snapshot.evidence_gaps.join('; ')}`);
    assert(snapshot.entries.every((entry) => entry.kind === 'file' || entry.kind === 'missing'), 'Debug local snapshot requires regular files or missing selected paths');
    return snapshot;
  }
  if (resolution.diff_mode === 'initial-working-tree') {
    assert(nested && resolution.pre_fix_sha === null && resolution.post_fix_sha === null, 'initial snapshot requires a nested packet with null commit SHAs');
    const snapshot = captureInitialWorkingTree(repository, exclusions);
    assert(snapshot.evidence_gaps.length === 0, `initial snapshot evidence is incomplete: ${snapshot.evidence_gaps.join('; ')}`);
    assert(snapshot.entries.every((entry) => entry.kind === 'file' || entry.kind === 'missing'), 'Debug initial snapshot requires regular files or missing tracked paths');
    return snapshot;
  }
  const working = resolution.diff_mode === 'working-tree';
  const comparison = working ? [resolution.pre_fix_sha] : [resolution.pre_fix_sha, resolution.post_fix_sha];
  // Literal, exact run subtrees only. Other .agents skills, rules and runs are source evidence.
  const pathspec = [':(top)**', ...exclusions.map((root) => ':(exclude,top,literal)' + root + '/')];
  const diff = runGit(repository, ['diff', '--binary', '--no-ext-diff', '--no-textconv', ...comparison, '--', ...pathspec]);
  const names = runGit(repository, ['diff', '--name-only', '-z', '--no-ext-diff', '--no-textconv', ...comparison, '--', ...pathspec], 'utf8');
  assert(!names.includes('\uFFFD'), 'resolution changed path list contains invalid UTF-8');
  const tracked = names.split('\0').filter(Boolean).map(safeRelative);
  const untracked = untrackedEvidence(repository, exclusions, nested);
  let digest;
  if (working && nested) {
    digest = digestValue({ tracked_diff_sha256: hash(diff), untracked });
  } else {
    // Preserve the existing flat wire format's digest algorithm.
    const hasher = crypto.createHash('sha256').update(diff);
    if (working) for (const entry of untracked) hasher.update('\0').update(JSON.stringify(entry));
    digest = 'sha256:' + hasher.digest('hex');
  }
  if (!working) {
    const workspace = runGit(repository, ['diff', '--binary', '--no-ext-diff', '--no-textconv', resolution.post_fix_sha, '--', ...pathspec]);
    assert(workspace.length === 0 && untracked.length === 0, 'committed resolution has uncommitted source changes outside the exact artifact roots');
  }
  return { digest, files: [...new Set([...tracked, ...(working ? untracked.map((entry) => entry.path) : [])])].sort() };
}

function validateInitialBaseline(target, exclusions, repository) {
  const local = target.diff_mode === 'local-directory';
  const scope = local ? normalizeLocalScope(target.local_scope) : null;
  if (local) assert(same(scope, target.local_scope), 'local scope must use canonical ordered selectors');
  const entries = target.initial_snapshot_entries;
  const paths = entries.map((entry) => safeRelative(entry.path));
  assert(new Set(paths).size === paths.length && same(paths, [...paths].sort()), 'initial snapshot entries must have unique canonical ordered paths');
  for (const entry of entries) {
    assert(!exclusions.some((root) => within(entry.path, root)), 'initial snapshot includes an excluded artifact root');
    if (local) assert(scope.some((selector) => within(entry.path, selector)), 'local baseline path is outside the selected scope');
    assert(entry.kind === 'file' || entry.kind === 'missing', 'Debug initial baseline requires regular files or missing tracked paths');
    assert(entry.kind === 'file' ? /^sha256:[0-9a-f]{64}$/.test(entry.digest) && ['100644', '100755'].includes(entry.mode)
      : entry.digest === null && entry.mode === null, 'initial snapshot file kind, mode and digest disagree');
    const stages = entry.index.map((item) => item.stage);
    assert(new Set(stages).size === stages.length && same(stages, [...stages].sort((a, b) => a - b)), 'initial snapshot index stages must be unique and ordered');
    assert(stages.every((stage) => stage === 0), 'initial snapshot baseline cannot contain unresolved index conflicts');
    if (local) assert(entry.index.length === 0, 'local snapshot cannot claim Git index evidence');
  }
  const digest = local ? digestLocalDirectory(entries, scope, repository) : digestInitialWorkingTree(entries);
  assert(sameDigest(digest, target.pre_fix_snapshot_digest), 'initial snapshot digest does not bind the retained baseline entries and scope');
  const baseline = target.baseline_files.map((entry) => ({ path: entry.path, sha256: bareDigest(entry.sha256) ?? null }));
  const expected = entries.map((entry) => ({ path: entry.path, sha256: bareDigest(entry.digest) ?? null }));
  assert(same(baseline, expected), 'baseline files differ from the retained initial snapshot');
}

function resolutionView(packet) {
  if (!Object.hasOwn(packet, 'source')) return { ...packet, source_kind: 'review-pro' };
  return {
    source_kind: packet.source.kind, review_id: packet.source.review_id, finding_id: packet.source.finding_id,
    original_handoff_digest: packet.source.handoff_digest, repository: packet.target.repo,
    ...packet.target, resolution_status: packet.status, review_acceptance_criteria: packet.review_acceptance_criteria,
    logs_and_traces: packet.proof.logs_and_traces,
  };
}

function validateReturnRoute(route, repository, repositoryInput, resolutionRelative, nested, local = false) {
  if (route === undefined && !nested) return;
  assert(typeof route === 'string' && !/[;&|`$<>\u0000-\u001f\u007f]/.test(route), 'reverification command must be a single non-shell command route');
  const match = route.match(/^\/review-pro ("(?:[^"\\]|\\["\\])*"|[^\s"\\]+)( --local)? --reverify ("(?:[^"\\]|\\["\\])*"|[^\s"\\]+)$/);
  assert(match, 'reverification command must be a single non-shell command route');
  const decode = (value) => value.startsWith('"') ? JSON.parse(value) : value;
  const target = decode(match[1]);
  const artifact = decode(match[3]);
  assert(Boolean(match[2]) === local, 'local reverification recommendation requires the explicit --local marker');
  if (local) assert(path.isAbsolute(target) && target === repository, 'local reverification target must equal the explicitly selected physical project root');
  assert(target.length > 0 && (!nested || path.isAbsolute(artifact)), 'reverification route requires a target and an absolute resolution path');
  assert(repositoryRelative(repository, repositoryInput, artifact) === resolutionRelative, 'reverification route points to a different resolution artifact');
  // Display-only route: a fresh caller must independently authorize root and scope.
  // Git targets may be a PR, branch or working tree. No route is executable input.
  return { command: 'review-pro', target, ...(local ? { local: true } : {}), flag: '--reverify', artifact_path: path.join(repository, resolutionRelative) };
}

function scanEvidence(repository, repositoryInput, references, debugRelative, reviewRelatives) {
  assert(references.length <= 128, 'too many referenced evidence files');
  let total = 0;
  const seen = new Set();
  return references.map((reference) => {
    let relative;
    if (path.isAbsolute(reference) || reference.startsWith('.agents/')) {
      relative = repositoryRelative(repository, repositoryInput, reference);
    } else {
      relative = debugRelative + '/' + safeRelative(reference);
    }
    assert([debugRelative, ...reviewRelatives].some((root) => within(relative, root)), 'referenced evidence escapes the authorized artifact roots');
    assert(!seen.has(relative), 'duplicate referenced evidence file');
    seen.add(relative);
    const file = containedPath(repository, relative, { expectedType: 'file' });
    const descriptor = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    let bytes;
    try {
      const stat = fs.fstatSync(descriptor);
      assert(stat.isFile() && stat.size <= 2 * 1024 * 1024, 'referenced evidence exceeds 2 MiB or is not a file');
      total += stat.size;
      assert(total <= 16 * 1024 * 1024, 'referenced evidence exceeds the total byte limit');
      bytes = fs.readFileSync(descriptor);
      assert(bytes.length === stat.size, 'referenced evidence changed while being read');
    } finally { fs.closeSync(descriptor); }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const structured = [];
    try { structured.push(JSON.parse(text)); } catch {
      // Runtime logs are commonly JSONL. Inspect each structured record, too.
      for (const line of text.split(/\r?\n/)) {
        if (!/^\s*[\[{]/.test(line)) continue;
        try { structured.push(JSON.parse(line)); } catch { /* Still scanned as plaintext below. */ }
      }
    }
    const sensitiveAssignment = /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*[^\s,;]+/i;
    assert(!hasSensitiveContent(text) && !structured.some(hasSensitiveContent)
      && !sensitiveAssignment.test(text) && !/\b\d{3}-\d{2}-\d{4}\b/.test(text), 'referenced evidence contains sensitive content; redact it before retrying');
    assert(!hasDirectiveContent(text) && !structured.some(hasDirectiveContent), 'referenced evidence contains directive-shaped content');
    // Observed digests bind the bytes inspected now, not the producer's earlier collection.
    return { path: relative, observed_digest: 'sha256:' + hash(bytes) };
  });
}

export function resolutionArguments(args, flags = ['--repo-root', '--artifact-root', '--review-root', '--handoff', '--resolution', '--local', '--scope']) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    assert(flags.includes(flag) && !Object.hasOwn(options, flag), 'expected unique named path arguments');
    if (flag === '--local') { options[flag] = true; continue; }
    assert(args[index + 1] && !args[index + 1].startsWith('--'), 'expected unique named path arguments');
    options[flag] = args[++index];
  }
  return options;
}

// Both consumers share source, provenance and evidence validation. Debug's
// stricter completion gates are additional checks, not a second intake engine.
export function validateResolutionInput(options, { consumer = 'review' } = {}) {
  assert(['review', 'debug'].includes(consumer), 'unknown resolution consumer');
  const repositoryInput = options['--repo-root'];
  const local = options['--local'] === true;
  assert(local || options['--scope'] === undefined, '--scope requires explicit --local mode');
  assert(!local || options['--scope'] !== undefined, 'local validation requires independent caller --scope JSON selectors');
  const localScope = local ? normalizeLocalScope(JSON.parse(options['--scope'])) : null;
  const repository = resolutionRepository(repositoryInput, { local });
  const active = resolutionRoot(repository, repositoryInput, options['--artifact-root'], consumer === 'debug' ? 'debug' : 'reviews');
  const resolutionRelative = repositoryRelative(repository, repositoryInput, options['--resolution']);
  const debugRelative = resolutionRelative.split('/').slice(0, 3).join('/');
  assert(new RegExp('^\\.agents/debug/' + slug + '$').test(debugRelative), 'resolution must belong to one repository-owned .agents/debug/<slug> root');
  const packet = readJsonNoFollow(repository, resolutionRelative);
  assertJsonSchema(packet, path.join(harnessRoot, 'schemas/review-pro/debug-resolution-input.schema.json'), 'Debug Pro resolution');
  assert(sameDigest(packet.content_digest, contentDigest(packet)), 'resolution content digest does not bind the canonical packet');
  assert(!hasSensitiveContent(packet), 'resolution contains secret- or personal-data-shaped content');
  assert(!hasDirectiveContent(packet), 'resolution contains directive-shaped untrusted prose');
  const nested = Object.hasOwn(packet, 'source');
  if (consumer === 'debug') {
    assert(nested, 'Debug Pro produces only the canonical nested resolution shape');
    assert(active.relative === debugRelative, 'resolution differs from the explicit Debug artifact root');
  }
  const resolution = resolutionView(packet);
  const direct = resolution.source_kind === 'direct';
  const initial = resolution.diff_mode === 'initial-working-tree';
  const snapshotMode = initial || resolution.diff_mode === 'local-directory';
  assert(local === (resolution.diff_mode === 'local-directory'), 'local snapshot validation requires explicit matching --local authority');
  if (local) assert(same(localScope, resolution.local_scope), 'explicit local scope differs from the retained resolution scope');
  const reviewRelatives = consumer === 'review' ? [active.relative] : [];
  const artifacts = [resolutionRelative];
  for (const relative of resolution.changed_files) safeRelative(relative);

  if (nested) {
    assert(packet.target.repo_root === repository, 'resolution repository root differs from the canonical repository');
    assert(packet.target.run_relative_path === debugRelative, 'declared Debug root differs from the resolution artifact root');
    for (const entry of packet.target.baseline_files) safeRelative(entry.path);
    for (const key of ['regression_test_paths', 'production_paths', 'data_repair_paths']) packet.repair[key].forEach(safeRelative);
    if (local) for (const file of [...packet.repair.regression_test_paths, ...packet.repair.production_paths, ...packet.repair.data_repair_paths]) {
      assert(resolution.local_scope.some((selector) => within(file, selector)), 'repair path is outside the selected local scope');
    }
    if (packet.repair.repair_plan_path) safeRelative(packet.repair.repair_plan_path);
    if (resolution.resolution_status === 'RESOLVED') {
      assert(packet.proof.red.argv.length > 0 && Number.isInteger(packet.proof.red.exit_code) && packet.proof.red.exit_code !== 0
        && packet.proof.green.argv.length > 0 && packet.proof.green.exit_code === 0, 'RESOLVED requires both RED and GREEN evidence');
    }
  }
  assert(resolution.repository === (local ? localRepositoryIdentity(repository) : repositoryIdentity(repository)), 'resolution repository identity differs from the actual repository');
  if (direct) {
    assert(!options['--handoff'] && !options['--review-root']
      && ['review_id', 'finding_id', 'handoff_digest', 'handoff_path', 'review_workspace_root'].every((key) => packet.source[key] == null),
    'direct-origin resolution must not claim a Review handoff identity');
  } else {
    const handoffRelative = options['--handoff'];
    const { original, state, handoff } = readResolutionHandoff(repository, repositoryInput,
      options['--review-root'] ?? (consumer === 'review' ? active.root : undefined), handoffRelative, { local, localScope });
    assert(resolution.review_id === handoff.review.review_id && resolution.finding_id === handoff.review.finding_id, 'resolution review or finding identity differs from the handoff');
    assert(sameDigest(resolution.original_handoff_digest, handoff.content_digest), 'resolution does not bind the original handoff digest');
    assert(resolution.repository === state.target.repository_identity && resolution.repository === handoff.target.repository_identity, 'resolution repository identity differs from the review');
    assert(resolution.pre_fix_sha === handoff.target.reviewed_head_sha, 'resolution pre-fix SHA differs from the reviewed head');
    if (snapshotMode) {
      const intake = readJsonNoFollow(original.root, 'intake.json');
      assert(handoff.target.comparison === resolution.diff_mode && state.target.comparison === resolution.diff_mode
        && intake.comparison === resolution.diff_mode && intake.base_sha === null && intake.reviewed_head_sha === null,
      'resolution requires an authenticated original matching content snapshot');
      if (local) assert([handoff.target, state.target, intake].every((target) => same(target.local_scope, resolution.local_scope)), 'resolution local scope differs from the original Review scope');
      assert(sameDigest(resolution.pre_fix_snapshot_digest, handoff.target.diff_digest)
        && sameDigest(resolution.pre_fix_snapshot_digest, intake.diff_digest), 'resolution initial snapshot differs from the original Review snapshot');
    }
    assert(same(resolution.review_acceptance_criteria, handoff.acceptance_criteria), 'resolution changed the Review Pro acceptance criteria');
    if (nested && packet.source.review_workspace_root != null) assert(repositoryRelative(repository, repositoryInput, packet.source.review_workspace_root) === original.relative, 'packet original review root differs from supplied context');
    if (nested && packet.source.handoff_path != null) {
      const hinted = packet.source.handoff_path.startsWith('debug-handoffs/') ? original.relative + '/' + safeRelative(packet.source.handoff_path)
        : repositoryRelative(repository, repositoryInput, packet.source.handoff_path);
      assert(hinted === original.relative + '/' + handoffRelative, 'packet handoff path differs from supplied context');
    }
    reviewRelatives.push(original.relative);
    artifacts.unshift(original.relative + '/' + handoffRelative);
  }
  const head = local ? null : currentHead(repository);
  assert(resolution.post_fix_sha === head, 'current HEAD differs from the resolution post-fix SHA');
  if (snapshotMode) assert(head === null && resolution.pre_fix_sha === null, 'content snapshot requires null commit SHAs throughout the repair');
  else assert(head !== null && isAncestor(repository, resolution.pre_fix_sha, resolution.post_fix_sha), 'resolution post-fix SHA is not a descendant of the pre-fix head');
  const exclusions = [...new Set([...reviewRelatives, debugRelative])];
  if (snapshotMode) validateInitialBaseline(packet.target, exclusions, repository);
  const actual = diffEvidence(repository, resolution, exclusions, nested);
  assert(sameDigest(resolution.diff_digest, actual.digest), 'resolution diff digest differs from trusted source evidence');
  assert(same([...resolution.changed_files].sort(), actual.files), 'resolution changed files differ from trusted source evidence');
  if (!nested && resolution.resolution_status === 'RESOLVED') assert(resolution.red_evidence.length > 0 && resolution.green_evidence.length > 0, 'RESOLVED requires both RED and GREEN evidence');
  const route = validateReturnRoute(nested ? packet.recommended_command : packet.recommended_reverification_command, repository, repositoryInput, resolutionRelative, nested, local);
  const evidence = scanEvidence(repository, repositoryInput, resolution.logs_and_traces?.artifact_paths ?? [], debugRelative, reviewRelatives);
  const final = diffEvidence(repository, resolution, exclusions, nested);
  assert(sameDigest(final.digest, actual.digest) && same(final.files, actual.files), 'source changed during resolution validation');
  if (local) resolveLocalProjectRoot(repository);
  else assert(currentHead(repository) === head, 'HEAD changed during resolution validation');
  const result = {
    status: 'success', summary: 'validated resolution input',
    source_kind: resolution.source_kind, debug_run_id: nested ? packet.debug_run_id : null,
    reverification_status: 'READY_FOR_INDEPENDENT_REVERIFICATION', artifacts,
    referenced_evidence: evidence, ...(route ? { return_route: route } : {}),
    next_actions: ['Use a fresh reviewer to rerun the reproduction, acceptance criteria and failure stories; validation alone never clears a finding.'],
  };
  return { result, packet, snapshot: snapshotMode ? actual : null };
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
 try {
  console.log(JSON.stringify(validateResolutionInput(resolutionArguments(process.argv.slice(2))).result, null, 2));
 } catch (error) {
  console.log(JSON.stringify({
    status: 'error', summary: error.message, reverification_status: 'REVERIFICATION_BLOCKED', artifacts: [],
    next_actions: ['Repair the resolution packet, referenced evidence or explicit source context, then retry without changing the original review evidence.'],
  }, null, 2));
  process.exitCode = 1;
 }
}
