#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertRelativePath, canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { atomicWriteJson, readFileNoFollow } from './lib/review-safety.mjs';
import { digestBytes, digestValue } from './lib/digests.mjs';
import { captureLocalDirectory, localRepositoryIdentity, resolveLocalProjectRoot } from './lib/local-directory.mjs';

function gitEnvironment() {
  return { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))), GIT_OPTIONAL_LOCKS: '0' };
}

function runGit(repositoryRoot, argumentsList, options = {}) {
  const overrides = [];
  // Diff can invoke clean/process filters even with --no-ext-diff/--no-textconv.
  // Disable executable conversions per invocation; never edit repository config.
  if (argumentsList[0] === 'diff') {
    let keys = '';
    try { keys = runGit(repositoryRoot, ['config', '--name-only', '--get-regexp', '^filter\\..*\\.(clean|process)$'], { encoding: 'utf8' }); }
    catch (error) { if (error.status !== 1) throw error; }
    for (const key of keys.split('\n').filter(Boolean)) {
      if (!/^filter\.[^\u0000-\u001f\u007f]+\.(clean|process)$/.test(key)) throw new Error('unsafe Git filter configuration key');
      overrides.push('-c', `${key}=`, '-c', `${key.replace(/\.(clean|process)$/, '.required')}=false`);
    }
  }
  return execFileSync('git', ['-C', repositoryRoot, '-c', 'core.fsmonitor=false', ...overrides, ...argumentsList], {
    encoding: options.encoding ?? null,
    env: gitEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
  });
}

export { runGit as runReadOnlyGit };

function textGit(repositoryRoot, argumentsList) {
  return runGit(repositoryRoot, argumentsList, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).trim();
}

export function repositoryIdentity(repositoryRoot) {
  try {
    const origin = textGit(repositoryRoot, ['remote', 'get-url', 'origin']).replace(/\.git$/, '').replace(/\/$/, '');
    const scp = origin.match(/^[^@\s]+@[^:\s]+:(.+)$/);
    if (scp) return scp[1].replace(/^\//, '');
    const parsed = new URL(origin);
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return path.basename(repositoryRoot);
  }
}

function resolveCommit(repositoryRoot, reference, label) {
  if (typeof reference !== 'string' || !reference || reference.startsWith('-')) throw new Error(`${label} must be a commit reference`);
  try {
    return textGit(repositoryRoot, ['rev-parse', '--verify', `${reference}^{commit}`]);
  } catch {
    throw new Error(`${label} does not resolve to a commit: ${reference}`);
  }
}

// null means a verified unborn branch, never a broken repository or invalid ref.
export function currentHead(repositoryRoot) {
  const root = canonicalRoot(repositoryRoot);
  if (canonicalRoot(textGit(root, ['rev-parse', '--show-toplevel'])) !== root) throw new Error('repository root must be the actual Git root');
  try { return resolveCommit(root, 'HEAD', 'HEAD'); } catch {
    const branch = textGit(root, ['symbolic-ref', '-q', 'HEAD']);
    if (!branch.startsWith('refs/heads/')) throw new Error('HEAD is not a valid unborn branch');
    try { runGit(root, ['show-ref', '--verify', '--quiet', branch]); } catch (error) {
      if (error.status === 1) return null;
      throw new Error('HEAD reference could not be verified');
    }
    throw new Error('HEAD exists but does not resolve to a commit');
  }
}

export function digestInitialWorkingTree(entries) {
  return digestValue({ schema_version: 'pro-harness/initial-working-tree@1', entries });
}

function snapshotPaths(repositoryRoot, args) {
  const raw = runGit(repositoryRoot, ['ls-files', ...args, '-z']);
  return new TextDecoder('utf-8', { fatal: true }).decode(raw).split('\0').filter(Boolean);
}

function snapshotExclusions(repositoryRoot, exclusions) {
  return exclusions.map((relative) => {
    if (!/^\.agents\/(?:reviews|debug)\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(relative)) throw new Error('snapshot exclusion must be one exact review or Debug artifact root');
    let cursor = repositoryRoot;
    for (const part of relative.split('/')) {
      cursor = path.join(cursor, part);
      try {
        const stat = fs.lstatSync(cursor);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('snapshot exclusion must be a contained real directory');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    return relative;
  });
}

function initialSnapshotPass(repositoryRoot, exclusions) {
  const index = new Map();
  for (const record of snapshotPaths(repositoryRoot, ['--stage'])) {
    const match = record.match(/^(\d{6}) ([0-9a-f]{40,64}) ([0-3])\t([\s\S]+)$/);
    if (!match) throw new Error('invalid Git index entry');
    const relative = safeChangedPath(match[4]);
    if (!index.has(relative)) index.set(relative, []);
    index.get(relative).push({ mode: match[1], oid: match[2], stage: Number(match[3]) });
  }
  const untracked = snapshotPaths(repositoryRoot, ['--others', '--exclude-standard']).map(safeChangedPath);
  const files = [...new Set([...index.keys(), ...untracked])].filter((relative) => !exclusions.some((excluded) => relative === excluded || relative.startsWith(`${excluded}/`))).sort();
  if (files.length > 50000) throw new Error('initial snapshot exceeds 50000 files; narrow eligible scope before reviewing');
  const gaps = [];
  const entries = files.map((relative) => {
    const entry = { path: relative, kind: 'missing', digest: null, mode: null, index: index.get(relative) ?? [] };
    if (entry.index.some(({ stage }) => stage !== 0)) gaps.push(`${relative}: unresolved index conflict`);
    // Inspect parents even for missing staged files; never traverse a symlink.
    let cursor = repositoryRoot;
    for (const part of relative.split('/').slice(0, -1)) {
      cursor = path.join(cursor, part);
      try {
        const parent = fs.lstatSync(cursor);
        if (parent.isSymbolicLink() || !parent.isDirectory()) throw new Error(`symlink or non-directory snapshot parent: ${relative}`);
      } catch (error) { if (error.code === 'ENOENT') return entry; throw error; }
    }
    const absolute = path.join(repositoryRoot, relative);
    let stat;
    try { stat = fs.lstatSync(absolute); } catch (error) { if (error.code === 'ENOENT') return entry; throw error; }
    if (stat.isSymbolicLink()) {
      const link = fs.readlinkSync(absolute, { encoding: 'buffer' });
      const after = fs.lstatSync(absolute);
      if (!after.isSymbolicLink() || after.dev !== stat.dev || after.ino !== stat.ino || !link.equals(fs.readlinkSync(absolute, { encoding: 'buffer' }))) throw new Error('symlink changed during snapshot');
      Object.assign(entry, { kind: 'symlink', digest: digestBytes(link), mode: '120000' });
    } else if (stat.isFile() && stat.size <= 4 * 1024 * 1024) {
      Object.assign(entry, { kind: 'file', digest: digestBytes(readFileNoFollow(repositoryRoot, relative, 4 * 1024 * 1024)), mode: stat.mode & 0o111 ? '100755' : '100644' });
    } else {
      Object.assign(entry, { kind: stat.isFile() ? 'oversized-file' : 'unsupported', size: stat.size });
      gaps.push(`${relative}: initial content was not hashed`);
    }
    return entry;
  });
  return { digest: digestInitialWorkingTree(entries), files, entries, untracked: entries.filter(({ path: relative }) => !index.has(relative)), evidence_gaps: gaps };
}

export function captureInitialWorkingTree(repositoryRoot, exclusions = []) {
  const root = canonicalRoot(repositoryRoot);
  if (currentHead(root) !== null) throw new Error('initial working-tree snapshot requires an unborn HEAD');
  const excluded = snapshotExclusions(root, exclusions);
  const first = initialSnapshotPass(root, excluded);
  const second = initialSnapshotPass(root, excluded);
  if (first.digest !== second.digest || currentHead(root) !== null) throw new Error('initial working tree or HEAD changed during snapshot; recapture before continuing');
  return second;
}

function defaultBase(repositoryRoot, headSha) {
  let upstream;
  try {
    upstream = textGit(repositoryRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  } catch {
    throw new Error('base is required when the current branch has no verified upstream');
  }
  return textGit(repositoryRoot, ['merge-base', upstream, headSha]);
}

function reviewContext(repositoryInput, artifactInput) {
  const repositoryRoot = canonicalRoot(repositoryInput);
  const artifactRoot = canonicalRoot(path.isAbsolute(artifactInput) ? artifactInput : path.join(repositoryRoot, artifactInput));
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  if (!/^\.agents\/reviews\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative)) throw new Error('artifact root must match .agents/reviews/<slug> inside the repository');
  return { repositoryRoot, artifactRoot, artifactRelative };
}

function safeChangedPath(value) {
  assertRelativePath(value);
  if (/[\u0000-\u001f\u007f\uFFFD]/u.test(value)) throw new Error('source path contains control characters or invalid UTF-8');
  return value;
}

function untrackedEvidence(repositoryRoot, artifactRelative, extraExclusion = null) {
  const raw = runGit(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (raw.includes('\uFFFD')) throw new Error('untracked path list contains invalid UTF-8');
  const entries = [];
  const gaps = [];
  for (const relative of raw.split('\0').filter(Boolean).sort()) {
    safeChangedPath(relative);
    if (relative === artifactRelative || relative.startsWith(`${artifactRelative}/`)) continue;
    if (extraExclusion && (relative === extraExclusion || relative.startsWith(`${extraExclusion}/`))) continue;
    const parent = path.posix.dirname(relative);
    if (parent !== '.') containedPath(repositoryRoot, parent, { expectedType: 'directory' });
    const absolute = path.join(repositoryRoot, ...relative.split('/'));
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      entries.push({ path: relative, kind: 'symlink', digest: digestBytes(fs.readlinkSync(absolute, { encoding: 'buffer' })), mode: '120000' });
    } else if (stat.isFile() && stat.size <= 4 * 1024 * 1024) {
      entries.push({ path: relative, kind: 'file', digest: digestBytes(readFileNoFollow(repositoryRoot, relative, 4 * 1024 * 1024)), mode: stat.mode & 0o111 ? '100755' : '100644' });
    } else {
      entries.push({ path: relative, kind: stat.isFile() ? 'oversized-file' : 'unsupported' });
      gaps.push(`${relative}: untracked content was not hashed`);
    }
  }
  return { entries, gaps };
}

export function captureReviewSource({ repositoryRoot: repositoryInput, artifactRoot: artifactInput, base, head = 'HEAD', working = false, local = false, localScope, write = true, excludeDebugRoot = null }) {
  const context = reviewContext(repositoryInput, artifactInput);
  if (!local && localScope !== undefined) throw new Error('local scope requires explicit local directory selection');
  let debugRelative = null;
  if (excludeDebugRoot !== null) {
    if (write) throw new Error('Debug exclusion is restricted to read-only handoff recapture');
    debugRelative = path.relative(context.repositoryRoot, excludeDebugRoot).split(path.sep).join('/');
    if (!/^\.agents\/debug\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(debugRelative)) throw new Error('Debug exclusion must be one exact repository-owned run');
    containedPath(context.repositoryRoot, debugRelative, { expectedType: 'directory' });
  }
  if (local) {
    if (working || base != null || (head !== null && head !== 'HEAD')) throw new Error('local directory review cannot use working-tree or base/head comparisons');
    resolveLocalProjectRoot(context.repositoryRoot);
    const snapshot = captureLocalDirectory(context.repositoryRoot, localScope, [context.artifactRelative, ...(debugRelative ? [debugRelative] : [])]);
    const manifest = {
      schema_version: 'review-pro/intake@1', repository_identity: localRepositoryIdentity(context.repositoryRoot),
      repository_root: context.repositoryRoot, artifact_root: context.artifactRoot, artifact_relative: context.artifactRelative,
      comparison: 'local-directory', local_scope: snapshot.local_scope, base_sha: null, reviewed_head_sha: null,
      diff_digest: snapshot.digest, changed_files: snapshot.files, untracked: snapshot.untracked,
      workspace_digest: snapshot.digest, workspace_changed_files: snapshot.files,
      evidence_gaps: snapshot.evidence_gaps, captured_at: new Date().toISOString(),
    };
    if (write) atomicWriteJson(context.artifactRoot, 'intake.json', manifest);
    return manifest;
  }
  const liveHead = currentHead(context.repositoryRoot);
  if (head === null && liveHead !== null) throw new Error('initial snapshot is stale: HEAD now exists');
  if (liveHead === null) {
    if (!working) throw new Error('no commits exist; use --working for an initial content-hashed review');
    if (base != null) throw new Error('base cannot be specified for an initial working-tree snapshot');
    if (head !== null && head !== 'HEAD') throw new Error('head cannot name a commit in an unborn repository');
    const snapshot = captureInitialWorkingTree(context.repositoryRoot, [context.artifactRelative, ...(debugRelative ? [debugRelative] : [])]);
    const manifest = {
      schema_version: 'review-pro/intake@1', repository_identity: repositoryIdentity(context.repositoryRoot),
      repository_root: context.repositoryRoot, artifact_root: context.artifactRoot, artifact_relative: context.artifactRelative,
      comparison: 'initial-working-tree', base_sha: null, reviewed_head_sha: null,
      diff_digest: snapshot.digest, changed_files: snapshot.files, untracked: snapshot.untracked,
      workspace_digest: snapshot.digest, workspace_changed_files: snapshot.files,
      evidence_gaps: snapshot.evidence_gaps, captured_at: new Date().toISOString(),
    };
    if (write) atomicWriteJson(context.artifactRoot, 'intake.json', manifest);
    return manifest;
  }
  const reviewedHeadSha = resolveCommit(context.repositoryRoot, head, 'head');
  const baseSha = base != null ? resolveCommit(context.repositoryRoot, base, 'base') : working ? liveHead : defaultBase(context.repositoryRoot, reviewedHeadSha);
  const comparison = working ? [baseSha] : [baseSha, reviewedHeadSha];
  const pathspec = [':(top)**', `:(exclude,top,glob)${context.artifactRelative}/**`];
  if (debugRelative) pathspec.push(`:(exclude,top,literal)${debugRelative}/`);
  const diff = runGit(context.repositoryRoot, ['diff', '--binary', '--no-ext-diff', '--no-textconv', ...comparison, '--', ...pathspec]);
  const rawNames = runGit(context.repositoryRoot, ['diff', '--name-only', '-z', '--no-ext-diff', ...comparison, '--', ...pathspec], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (rawNames.includes('\uFFFD')) throw new Error('changed path list contains invalid UTF-8');
  const trackedFiles = rawNames.split('\0').filter(Boolean).map(safeChangedPath);
  const stagedDiff = runGit(context.repositoryRoot, ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv', reviewedHeadSha, '--', ...pathspec]);
  const stagedNames = runGit(context.repositoryRoot, ['diff', '--cached', '--name-only', '-z', '--no-ext-diff', '--no-textconv', reviewedHeadSha, '--', ...pathspec], { encoding: 'utf8' }).split('\0').filter(Boolean).map(safeChangedPath);
  const untracked = untrackedEvidence(context.repositoryRoot, context.artifactRelative, debugRelative);
  const comparisonUntracked = working ? untracked.entries : [];
  const digest = crypto.createHash('sha256').update(diff);
  if (working && stagedDiff.length) digest.update('\0index\0').update(stagedDiff);
  for (const entry of comparisonUntracked) digest.update('\0').update(JSON.stringify(entry));
  const workspaceDiff = runGit(context.repositoryRoot, ['diff', '--binary', '--no-ext-diff', '--no-textconv', reviewedHeadSha, '--', ...pathspec]);
  const workspaceDigest = crypto.createHash('sha256').update(workspaceDiff);
  if (stagedDiff.length) workspaceDigest.update('\0index\0').update(stagedDiff);
  for (const entry of untracked.entries) workspaceDigest.update('\0').update(JSON.stringify(entry));
  const workspaceTrackedNames = runGit(context.repositoryRoot, ['diff', '--name-only', '-z', '--no-ext-diff', reviewedHeadSha, '--', ...pathspec], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (workspaceTrackedNames.includes('\uFFFD')) throw new Error('workspace path list contains invalid UTF-8');
  const manifest = {
    schema_version: 'review-pro/intake@1',
    repository_identity: repositoryIdentity(context.repositoryRoot),
    repository_root: context.repositoryRoot,
    artifact_root: context.artifactRoot,
    artifact_relative: context.artifactRelative,
    comparison: working ? 'working-tree' : 'committed-range',
    base_sha: baseSha,
    reviewed_head_sha: reviewedHeadSha,
    diff_digest: `sha256:${digest.digest('hex')}`,
    changed_files: [...new Set([...trackedFiles, ...(working ? stagedNames : []), ...comparisonUntracked.map(({ path: relative }) => relative)])].sort(),
    untracked: untracked.entries,
    workspace_digest: `sha256:${workspaceDigest.digest('hex')}`,
    workspace_changed_files: [...new Set([...workspaceTrackedNames.split('\0').filter(Boolean).map(safeChangedPath), ...stagedNames, ...untracked.entries.map(({ path: relative }) => relative)])].sort(),
    evidence_gaps: untracked.gaps,
    captured_at: new Date().toISOString(),
  };
  if (write) atomicWriteJson(context.artifactRoot, 'intake.json', manifest);
  return manifest;
}

function parseArguments(argv) {
  const values = new Map();
  const booleans = new Set(['--working', '--local', '--no-write']);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith('--')) throw new Error(`unexpected argument ${flag}`);
    if (booleans.has(flag)) { values.set(flag, true); continue; }
    if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
    values.set(flag, argv[index + 1]); index += 1;
  }
  return { value: (flag) => values.get(flag), has: (flag) => values.has(flag) };
}

const isMain = process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArguments(process.argv.slice(2));
    if (!args.value('--repo-root') || !args.value('--artifact-root')) throw new Error('usage: review-source.mjs --repo-root <path> --artifact-root <path> [--base <ref>] [--head <ref>] [--working | --local --scope <JSON array>] [--no-write]');
    if (args.has('--local') && args.has('--head')) throw new Error('local directory review cannot specify --head');
    const manifest = captureReviewSource({
      repositoryRoot: args.value('--repo-root'), artifactRoot: args.value('--artifact-root'), base: args.value('--base'),
      head: args.value('--head') ?? 'HEAD', working: args.has('--working'), local: args.has('--local'),
      localScope: args.has('--scope') ? JSON.parse(args.value('--scope')) : undefined, write: !args.has('--no-write'),
    });
    console.log(JSON.stringify({ status: 'success', summary: `captured ${manifest.comparison} review evidence`, intake: manifest, artifacts: args.has('--no-write') ? [] : ['intake.json'], next_actions: manifest.evidence_gaps.length ? ['Resolve evidence gaps before an approval verdict.'] : ['Continue to Review Pro scope routing.'] }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Use --working for Git work or explicit --local with a named --scope for a local directory; provide verified refs only for a committed-range review.'] }, null, 2));
    process.exit(1);
  }
}
