#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';

const MAX_FILE_BYTES = 1024 * 1024;
const SOURCE_EXTENSIONS = new Set(['.c', '.cc', '.cpp', '.cs', '.dart', '.go', '.h', '.hpp', '.java', '.js', '.jsx', '.kt', '.kts', '.mjs', '.mts', '.php', '.py', '.rb', '.rs', '.scala', '.sh', '.sql', '.swift', '.ts', '.tsx', '.vue']);
const SKIP_DIRECTORIES = new Set(['.git', '.hg', '.svn', 'node_modules', 'vendor', 'dist', 'build', 'coverage', '.next', '.nuxt', '.cache', '__pycache__', 'target']);
const SECRET_PATH = /(^|\/)(?:\.env(?:\..*)?|\.ssh|\.aws|\.netrc|credentials?|secrets?)(?:\/|$)|\.(?:pem|key|p12|pfx|keystore|tfstate)$/i;

function controlledGitEnvironment() {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  return {
    ...inherited,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_EXTERNAL_DIFF: '',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_PAGER: 'cat',
    GIT_TERMINAL_PROMPT: '0',
    PAGER: 'cat',
  };
}

function git(repositoryRoot, args, options = {}) {
  return execFileSync('git', ['-C', repositoryRoot, ...args], {
    encoding: options.encoding ?? 'utf8',
    env: controlledGitEnvironment(),
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function normalizeRelative(value) {
  return value.split(path.sep).join('/').replace(/^\.\//, '');
}

function artifactContext(repositoryInput, artifactInput) {
  const repositoryRoot = canonicalRoot(repositoryInput);
  const artifactCandidate = path.isAbsolute(artifactInput) ? artifactInput : path.join(repositoryRoot, artifactInput);
  const artifactRoot = canonicalRoot(artifactCandidate);
  const relative = normalizeRelative(path.relative(repositoryRoot, artifactRoot));
  if (relative === '' || relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('artifact root must be inside the repository');
  if (!/^\.agents\/explanations\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(relative)) throw new Error('artifact root must match .agents/explanations/<slug>');
  return { repositoryRoot, artifactRoot, artifactRelative: relative };
}

function isExcluded(relativePath, artifactRelative) {
  const normalized = normalizeRelative(relativePath);
  if (normalized === artifactRelative || normalized.startsWith(`${artifactRelative}/`)) return 'artifact-root';
  if (SECRET_PATH.test(normalized)) return 'secret-path';
  if (normalized.split('/').some((part) => SKIP_DIRECTORIES.has(part))) return 'generated-or-vendor';
  return null;
}

function eligibleFile(repositoryRoot, relativePath, artifactRelative) {
  const exclusion = isExcluded(relativePath, artifactRelative);
  if (exclusion) return { eligible: false, reason: exclusion };
  const absolute = path.join(repositoryRoot, relativePath);
  let stat;
  try { stat = fs.lstatSync(absolute); } catch { return { eligible: false, reason: 'missing' }; }
  if (stat.isSymbolicLink()) return { eligible: false, reason: 'symlink' };
  if (!stat.isFile()) return { eligible: false, reason: 'not-regular-file' };
  if (stat.size > MAX_FILE_BYTES) return { eligible: false, reason: 'oversized' };
  const sample = fs.readFileSync(absolute).subarray(0, 8192);
  if (sample.includes(0)) return { eligible: false, reason: 'binary' };
  return { eligible: true, absolute, stat };
}

export function fingerprintRepository({ repositoryRoot: repositoryInput, artifactRoot: artifactInput }) {
  const { repositoryRoot, artifactRelative } = artifactContext(repositoryInput, artifactInput);
  let head = 'unborn';
  try { head = git(repositoryRoot, ['rev-parse', '--verify', 'HEAD']).trim(); } catch {}
  const exclusion = `:(exclude)${artifactRelative}/**`;
  const staged = git(repositoryRoot, ['diff', '--binary', '--no-ext-diff', '--cached', '--', '.', exclusion]);
  const unstaged = git(repositoryRoot, ['diff', '--binary', '--no-ext-diff', '--', '.', exclusion]);
  const untrackedRaw = git(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
  const untracked = [];
  const excluded = [];
  for (const relativePath of untrackedRaw.split('\0').filter(Boolean).sort()) {
    const eligibility = eligibleFile(repositoryRoot, relativePath, artifactRelative);
    if (!eligibility.eligible) {
      excluded.push({ path: normalizeRelative(relativePath), reason: eligibility.reason });
      continue;
    }
    untracked.push({ path: normalizeRelative(relativePath), sha256: sha256(fs.readFileSync(eligibility.absolute)) });
  }
  const identity = JSON.stringify({ head, staged_sha256: sha256(staged), unstaged_sha256: sha256(unstaged), untracked });
  return {
    schema_version: 'explainer-pro/source-fingerprint@1',
    head,
    worktree_sha256: sha256(identity),
    captured_at: new Date().toISOString(),
    artifact_exclusion: artifactRelative,
    untracked,
    excluded,
  };
}

function walkSourceFiles(repositoryRoot, artifactRelative) {
  const files = [];
  const visit = (absoluteDirectory, relativeDirectory = '') => {
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = normalizeRelative(path.posix.join(relativeDirectory, entry.name));
      if (isExcluded(relativePath, artifactRelative)) continue;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { visit(absolutePath, relativePath); continue; }
      if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const stat = fs.statSync(absolutePath);
      if (stat.size <= MAX_FILE_BYTES) files.push({ relativePath, absolutePath });
    }
  };
  visit(repositoryRoot);
  return files;
}

function referencesFor(file, content) {
  const references = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    /^\s*from\s+([.\w]+)\s+import\s+/gm,
    /^\s*import\s+([\w.]+)(?:\s+as\s+\w+)?\s*$/gm,
    /^\s*use\s+([\w:]+)(?:::\{[^}]+\})?;/gm,
    /^\s*import\s+([\w.]+);\s*$/gm,
    /^\s*#include\s*[<"]([^>"]+)[>"]/gm,
    /^\s*require\s+['"]([^'"]+)['"]/gm,
  ];
  const lineOffsets = [0];
  for (let index = 0; index < content.length; index += 1) if (content[index] === '\n') lineOffsets.push(index + 1);
  const lineFor = (offset) => {
    let low = 0; let high = lineOffsets.length;
    while (low < high) { const mid = Math.floor((low + high) / 2); if (lineOffsets[mid] <= offset) low = mid + 1; else high = mid; }
    return low;
  };
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      references.push({ specifier: match[1], line: lineFor(match.index), dynamic: pattern.source.includes('import\\(') });
    }
  }
  return references;
}

function resolveLocalReference(sourceRelative, specifier, fileSet) {
  if (!specifier.startsWith('.')) return null;
  const base = normalizeRelative(path.posix.normalize(path.posix.join(path.posix.dirname(sourceRelative), specifier)));
  const candidates = [base, ...[...SOURCE_EXTENSIONS].map((extension) => `${base}${extension}`), ...[...SOURCE_EXTENSIONS].map((extension) => `${base}/index${extension}`)];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

export function buildDependencyGraph({ repositoryRoot: repositoryInput, artifactRoot: artifactInput }) {
  const { repositoryRoot, artifactRelative } = artifactContext(repositoryInput, artifactInput);
  const files = walkSourceFiles(repositoryRoot, artifactRelative);
  const fileSet = new Set(files.map(({ relativePath }) => relativePath));
  const edges = [];
  for (const file of files) {
    const content = fs.readFileSync(file.absolutePath, 'utf8');
    for (const reference of referencesFor(file.relativePath, content)) {
      const target = resolveLocalReference(file.relativePath, reference.specifier, fileSet);
      edges.push({
        source: file.relativePath,
        target: target ?? reference.specifier,
        line: reference.line,
        kind: target ? 'local' : 'external-or-unresolved',
        dynamic: reference.dynamic,
      });
    }
  }
  const localEdges = edges.filter(({ kind }) => kind === 'local');
  const indegree = Object.fromEntries(files.map(({ relativePath }) => [relativePath, 0]));
  const outgoing = new Map(files.map(({ relativePath }) => [relativePath, []]));
  for (const edge of localEdges) {
    outgoing.get(edge.source)?.push(edge.target);
    indegree[edge.target] = (indegree[edge.target] ?? 0) + 1;
  }
  const queue = Object.keys(indegree).filter((node) => indegree[node] === 0).sort();
  const topologicalOrder = [];
  while (queue.length) {
    const node = queue.shift();
    topologicalOrder.push(node);
    for (const target of (outgoing.get(node) ?? []).sort()) {
      indegree[target] -= 1;
      if (indegree[target] === 0) { queue.push(target); queue.sort(); }
    }
  }
  const cyclicNodes = Object.keys(indegree).filter((node) => indegree[node] > 0).sort();
  return {
    schema_version: 'explainer-pro/dependency-graph@1',
    generated_at: new Date().toISOString(),
    repository_root: repositoryRoot,
    artifact_exclusion: artifactRelative,
    nodes: files.map(({ relativePath }) => relativePath),
    edges,
    topological_order: topologicalOrder,
    cyclic_nodes: cyclicNodes,
    coverage: { static_literal_references_only: true, dynamic_and_alias_limitations: true },
  };
}

function writePrivate(artifactRoot, relativePath, value) {
  const output = containedPath(artifactRoot, relativePath, { allowMissingLeaf: true });
  fs.writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  return output;
}

function cli() {
  const args = process.argv.slice(2);
  const operation = args[0];
  const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const repository = valueFor('--repo');
  const artifactRoot = valueFor('--artifact-root');
  const output = valueFor('--out');
  if (!['fingerprint', 'dependencies'].includes(operation) || !repository || !artifactRoot) throw new Error('usage: explainer-source.mjs <fingerprint|dependencies> --repo <path> --artifact-root <path> [--out <relative.json>]');
  const context = artifactContext(repository, artifactRoot);
  const result = operation === 'fingerprint'
    ? fingerprintRepository({ repositoryRoot: repository, artifactRoot })
    : buildDependencyGraph({ repositoryRoot: repository, artifactRoot });
  const defaultOutput = operation === 'fingerprint' ? 'source-fingerprint.json' : 'dependency-graph.json';
  const written = writePrivate(context.artifactRoot, output ?? defaultOutput, result);
  console.log(JSON.stringify({ status: 'success', summary: `${operation} completed`, artifacts: [written], next_actions: ['Use this artifact as typed evidence; do not treat static coverage as runtime proof.'] }, null, 2));
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(fileURLToPath(import.meta.url))) {
  try { cli(); } catch (error) {
    console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Check repository containment, artifact-root ownership, and Git availability.'] }, null, 2));
    process.exit(1);
  }
}
