#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fingerprintRepository } from './explainer-source.mjs';
import { canonicalRoot, containedPath, ensureContainedDirectory } from './lib/repository-paths.mjs';

const MAX_FILE_BYTES = 1024 * 1024;
const SECRET_PATH = /(^|\/)(?:\.env(?:\..*)?|\.ssh|\.aws|\.netrc|credentials?|secrets?)(?:\/|$)|\.(?:pem|key|p12|pfx|keystore|tfstate)$/i;
const GENERATED_PARTS = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', 'coverage', '.next', '.nuxt', '.cache', '__pycache__', 'target']);

function controlledEnvironment() {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  return { ...inherited, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_EXTERNAL_DIFF: '', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0', PAGER: 'cat' };
}

function git(repositoryRoot, args, encoding = 'utf8') {
  return execFileSync('git', ['-C', repositoryRoot, ...args], { encoding, env: controlledEnvironment(), maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function contextFor(repositoryInput, artifactInput) {
  const repositoryRoot = canonicalRoot(repositoryInput);
  const artifactRoot = canonicalRoot(path.isAbsolute(artifactInput) ? artifactInput : path.join(repositoryRoot, artifactInput));
  const artifactRelative = path.relative(repositoryRoot, artifactRoot).split(path.sep).join('/');
  if (!/^\.agents\/explanations\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(artifactRelative)) throw new Error('artifact root must match .agents/explanations/<slug>');
  return { repositoryRoot, artifactRoot, artifactRelative };
}

function verifyRef(repositoryRoot, ref) {
  if (!ref || /[\u0000-\u001f\u007f]/.test(ref) || ref.startsWith('-')) throw new Error('Git ref is missing or unsafe');
  return git(repositoryRoot, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
}

function discoverBase(repositoryRoot, explicitBase) {
  if (explicitBase) return { source: 'explicit', sha: verifyRef(repositoryRoot, explicitBase), ref: explicitBase };
  try {
    const upstream = git(repositoryRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']).trim();
    return { source: 'upstream', sha: verifyRef(repositoryRoot, upstream), ref: upstream };
  } catch {}
  try {
    const remoteDefault = git(repositoryRoot, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']).trim();
    return { source: 'remote-default', sha: verifyRef(repositoryRoot, remoteDefault), ref: remoteDefault };
  } catch {}
  throw new Error('comparison base could not be discovered; ask the user for --base rather than guessing');
}

function excluded(relativePath, artifactRelative) {
  const normalized = relativePath.split(path.sep).join('/');
  if (normalized === artifactRelative || normalized.startsWith(`${artifactRelative}/`)) return 'artifact-root';
  if (SECRET_PATH.test(normalized)) return 'secret-path';
  if (normalized.split('/').some((part) => GENERATED_PARTS.has(part))) return 'generated-or-vendor';
  const absolute = path.join('/', normalized);
  if (path.normalize(absolute).includes(`${path.sep}..${path.sep}`)) return 'unsafe-path';
  return null;
}

function redact(value) {
  return value
    .replace(/AKIA[0-9A-Z]{16}/g, '«redacted:access-key»')
    .replace(/\b(?:sk-|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{12,}\b/g, '«redacted:token»')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '«redacted:private-key»')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer «redacted:token»')
    .replace(/:\/\/([^\s:@/]+):([^\s@/]+)@/g, '://$1:«redacted:password»@')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '«redacted:jwt»');
}

function nullList(value) {
  return value.split('\0').filter(Boolean);
}

function collectChangedPaths(repositoryRoot, baseSha, headSha, working) {
  const sources = new Map();
  const add = (label, paths) => {
    for (const file of paths) {
      const normalized = file.split(path.sep).join('/');
      if (!sources.has(normalized)) sources.set(normalized, new Set());
      sources.get(normalized).add(label);
    }
  };
  const mergeBase = git(repositoryRoot, ['merge-base', baseSha, headSha]).trim();
  add('committed', nullList(git(repositoryRoot, ['diff', '--name-only', '-z', '--no-ext-diff', `${mergeBase}..${headSha}`, '--'])));
  if (working) {
    add('staged', nullList(git(repositoryRoot, ['diff', '--name-only', '-z', '--no-ext-diff', '--cached', '--'])));
    add('unstaged', nullList(git(repositoryRoot, ['diff', '--name-only', '-z', '--no-ext-diff', '--'])));
    add('untracked', nullList(git(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z'])));
  }
  return { mergeBase, sources };
}

function inspectPath(context, relativePath, labels, baseSha, headSha) {
  const reason = excluded(relativePath, context.artifactRelative);
  if (reason) return { path: relativePath, sources: [...labels].sort(), excluded: reason };
  const absolute = path.join(context.repositoryRoot, relativePath);
  if (fs.existsSync(absolute)) {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) return { path: relativePath, sources: [...labels].sort(), excluded: 'symlink' };
    if (!stat.isFile()) return { path: relativePath, sources: [...labels].sort(), excluded: 'not-regular-file' };
    if (stat.size > MAX_FILE_BYTES) return { path: relativePath, sources: [...labels].sort(), excluded: 'oversized' };
    if (fs.readFileSync(absolute).subarray(0, 8192).includes(0)) return { path: relativePath, sources: [...labels].sort(), excluded: 'binary' };
  }
  const patches = [];
  if (labels.has('committed')) patches.push(git(context.repositoryRoot, ['diff', '--no-ext-diff', '--unified=3', `${baseSha}..${headSha}`, '--', relativePath]));
  if (labels.has('staged')) patches.push(git(context.repositoryRoot, ['diff', '--no-ext-diff', '--unified=3', '--cached', '--', relativePath]));
  if (labels.has('unstaged')) patches.push(git(context.repositoryRoot, ['diff', '--no-ext-diff', '--unified=3', '--', relativePath]));
  if (labels.has('untracked') && fs.existsSync(absolute)) patches.push(`untracked file: ${relativePath}\n${fs.readFileSync(absolute, 'utf8')}`);
  return { path: relativePath, sources: [...labels].sort(), excluded: null, patch: redact(patches.join('\n')).slice(0, MAX_FILE_BYTES) };
}

function main() {
  const args = process.argv.slice(2);
  const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const repository = valueFor('--repo');
  const artifactRoot = valueFor('--artifact-root');
  if (!repository || !artifactRoot) throw new Error('usage: explainer-change-intake.mjs --repo <path> --artifact-root <path> [--base <ref>] [--head <ref>] [--working] [--out <relative.json>]');
  const context = contextFor(repository, artifactRoot);
  const base = discoverBase(context.repositoryRoot, valueFor('--base'));
  const headRef = valueFor('--head') ?? 'HEAD';
  const headSha = verifyRef(context.repositoryRoot, headRef);
  const working = args.includes('--working');
  const changed = collectChangedPaths(context.repositoryRoot, base.sha, headSha, working);
  const files = [...changed.sources.entries()]
    .filter(([file]) => file !== context.artifactRelative && !file.startsWith(`${context.artifactRelative}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, labels]) => inspectPath(context, file, labels, changed.mergeBase, headSha));
  const fingerprint = fingerprintRepository({ repositoryRoot: context.repositoryRoot, artifactRoot: context.artifactRoot });
  const result = {
    schema_version: 'explainer-pro/change-intake@1',
    generated_at: new Date().toISOString(),
    mode: working ? 'working' : 'committed',
    base: { ...base, merge_base: changed.mergeBase },
    head: { ref: headRef, sha: headSha },
    source_fingerprint_sha256: fingerprint.worktree_sha256,
    files,
    coverage: { surrounding_context_required: true, external_pull_request_metadata_included: false },
  };
  const outputRelative = valueFor('--out') ?? 'work/change-intake.json';
  const outputDirectory = path.posix.dirname(outputRelative);
  if (outputDirectory !== '.') ensureContainedDirectory(context.artifactRoot, outputDirectory);
  const output = containedPath(context.artifactRoot, outputRelative, { allowMissingLeaf: true });
  writeFileSyncPrivate(output, result);
  return { status: 'success', summary: `captured ${files.filter(({ excluded: reason }) => !reason).length} eligible changed files`, artifacts: [output], excluded: files.filter(({ excluded: reason }) => reason).map(({ path: file, excluded: reason }) => ({ path: file, reason })), next_actions: ['Explore surrounding code before making background or intent claims.'] };
}

function writeFileSyncPrivate(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

try { console.log(JSON.stringify(main(), null, 2)); } catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Supply a verified comparison base or correct the repository and artifact boundary.'] }, null, 2));
  process.exit(1);
}
