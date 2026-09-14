import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { digestBytes, digestValue } from './lib/digests.mjs';
import { assertRelativePath, canonicalRoot } from './lib/repository-paths.mjs';
import { readFileNoFollow } from './lib/review-safety.mjs';

const MAX_FILE_BYTES = 1024 * 1024;
const SECRET_PATH = /(^|\/)(?:\.env(?:\..*)?|\.ssh|\.aws|\.netrc|credentials?|secrets?)(?:\/|$)|\.(?:pem|key|p12|pfx|keystore|tfstate)$/i;
const SKIP_DIRECTORIES = new Set(['.git', '.hg', '.svn', 'node_modules', 'vendor', 'dist', 'build', 'coverage', '.next', '.nuxt', '.cache', '__pycache__', 'target']);

function controlledGitEnvironment() {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  return {
    ...inherited,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_EXTERNAL_DIFF: '',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    PAGER: 'cat',
  };
}

function git(repositoryRoot, args) {
  return execFileSync('git', ['-C', repositoryRoot, '-c', 'core.fsmonitor=false', ...args], {
    encoding: 'utf8',
    env: controlledGitEnvironment(),
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function normalizeRelative(value) {
  return value.split(path.sep).join('/').replace(/^\.\//, '');
}

function assertGitRoot(repositoryRoot) {
  const root = canonicalRoot(repositoryRoot);
  const reported = git(root, ['rev-parse', '--show-toplevel']).trim();
  if (canonicalRoot(reported) !== root) throw new Error('repository path must be the physical Git root');
  return root;
}

function isExcluded(relativePath, artifactRelative) {
  const normalized = normalizeRelative(relativePath);
  if (artifactRelative && artifactRelative.length > 0 && (normalized === artifactRelative || normalized.startsWith(`${artifactRelative}/`))) return 'artifact-root';
  if (SECRET_PATH.test(normalized)) return 'secret-path';
  if (normalized.split('/').some((part) => SKIP_DIRECTORIES.has(part))) return 'generated-or-vendor';
  return null;
}

function untrackedFingerprint(repositoryRoot, artifactRelative) {
  const raw = git(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
  const untracked = [];
  const excluded = [];
  for (const relativePath of raw.split('\0').filter(Boolean).sort()) {
    const normalized = normalizeRelative(relativePath);
    const exclusion = isExcluded(normalized, artifactRelative);
    if (exclusion) {
      excluded.push({ path: normalized, reason: exclusion });
      continue;
    }
    const absolute = path.join(repositoryRoot, normalized);
    let stat;
    try { stat = fs.lstatSync(absolute); } catch {
      excluded.push({ path: normalized, reason: 'missing' });
      continue;
    }
    if (stat.isSymbolicLink()) {
      excluded.push({ path: normalized, reason: 'symlink' });
      continue;
    }
    if (!stat.isFile()) {
      excluded.push({ path: normalized, reason: 'not-regular-file' });
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) {
      excluded.push({ path: normalized, reason: 'oversized' });
      continue;
    }
    untracked.push({ path: normalized, sha256: digestBytes(readFileNoFollow(repositoryRoot, normalized, MAX_FILE_BYTES)) });
  }
  return { untracked, excluded };
}

function fingerprintOneRepository({ repositoryRoot, artifactRelative, repoId, role }) {
  const root = assertGitRoot(repositoryRoot);
  let head = 'unborn';
  try { head = git(root, ['rev-parse', '--verify', 'HEAD']).trim(); } catch { head = 'unborn'; }
  const exclusion = artifactRelative
    ? ['--', '.', `:(exclude)${artifactRelative}`, `:(exclude)${artifactRelative}/**`]
    : ['--', '.'];
  const staged = git(root, ['diff', '--binary', '--no-ext-diff', '--cached', ...exclusion]);
  const unstaged = git(root, ['diff', '--binary', '--no-ext-diff', ...exclusion]);
  const { untracked, excluded } = untrackedFingerprint(root, artifactRelative);
  return {
    repo_id: repoId,
    role,
    head,
    staged_sha256: digestBytes(staged),
    unstaged_sha256: digestBytes(unstaged),
    untracked,
    excluded,
  };
}

export function fingerprintArchitecture({ repositoryRoot, artifactRelative = null, additionalRepositories = [] }) {
  if (artifactRelative) assertRelativePath(artifactRelative);
  const primary = fingerprintOneRepository({
    repositoryRoot,
    artifactRelative,
    repoId: 'primary',
    role: 'primary',
  });
  const seen = new Set([canonicalRoot(repositoryRoot)]);
  const repositories = [primary];
  for (const [index, candidate] of additionalRepositories.entries()) {
    const extraRoot = canonicalRoot(candidate);
    if (seen.has(extraRoot)) continue;
    seen.add(extraRoot);
    repositories.push(fingerprintOneRepository({
      repositoryRoot: extraRoot,
      artifactRelative: null,
      repoId: `read-only-${index + 1}`,
      role: 'read-only-evidence',
    }));
  }
  const fingerprint = {
    schema_version: 'architecture-pro/source-fingerprint@1',
    artifact_exclusion: artifactRelative,
    repositories,
  };
  return {
    fingerprint,
    digest: digestValue(fingerprint),
    repositories: repositories.map(({ repo_id, role, head }) => ({ repo_id, role, head })),
  };
}
