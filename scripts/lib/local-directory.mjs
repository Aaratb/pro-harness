import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectedDirectory } from './project-artifacts.mjs';
import { assertRelativePath, canonicalRoot, containedPath } from './repository-paths.mjs';
import { inspectArtifactDirectory } from './repository-artifacts.mjs';
import { readFileNoFollow } from './review-safety.mjs';
import { digestBytes, digestValue } from './digests.mjs';

const maxFileBytes = 4 * 1024 * 1024;
const sameIdentity = (a, b) => a.dev === b.dev && a.ino === b.ino;
function safePath(value) {
  assertRelativePath(value);
  if (/[\u0000-\u001f\u007f-\u009f\uFFFD]/u.test(value) || Buffer.from(value).toString('utf8') !== value) throw new Error('local scope contains an unsupported path');
  if (value.split('/').some(part => part.toLowerCase() === '.git')) throw new Error('Git metadata cannot be local scope');
  return value;
}

export function normalizeLocalScope(scope) {
  if (!Array.isArray(scope) || !scope.length || scope.length > 1000) throw new Error('local scope must name 1-1000 relative files or directories');
  const sorted = scope.map(safePath).sort();
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted.some((other, j) => j !== i && (other === sorted[i] || sorted[i].startsWith(`${other}/`)))) throw new Error('local scope selectors must be unique and non-overlapping');
  }
  return sorted;
}

// Explicit local selection never discovers an ancestor or converts a Git error.
// A managed source bundle is allowed; generated adapters are resolved by the caller.
export function resolveLocalProjectRoot(input) {
  const root = selectedDirectory(input);
  if (root === path.parse(root).root) throw new Error('filesystem root cannot be a local project');
  if (root === fs.realpathSync.native(os.homedir())) throw new Error('home directory cannot be a local project');
  try {
    fs.lstatSync(path.join(root, '.git'));
    throw new Error('selected project has Git metadata; use Git mode or choose the actual standalone directory');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return root;
}

export function localRepositoryIdentity(root) {
  return `local:${digestValue({ root: canonicalRoot(root) }).slice('sha256:'.length)}`;
}

export function digestLocalDirectory(entries, scope, root) {
  return digestValue({ schema_version: 'pro-harness/local-directory@1', root: canonicalRoot(root), scope: normalizeLocalScope(scope), entries });
}

function exclusionsFor(root, exclusions) {
  if (!Array.isArray(exclusions)) throw new Error('snapshot exclusions must be an array');
  return exclusions.map(relative => {
    if (!/^\.agents\/(?:reviews|debug)\/[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(relative)) throw new Error('snapshot exclusion must be one exact review or Debug artifact root');
    inspectArtifactDirectory(root, relative);
    return relative;
  });
}

function capturePass(root, scope, exclusions) {
  const entries = [];
  const gaps = [];
  let bytes = 0;
  let visited = 0;
  const directoryRecords = new Map();
  const rememberDirectory = absolute => {
    const stat = fs.lstatSync(absolute);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('symlink or non-directory snapshot parent');
    try {
      fs.lstatSync(path.join(absolute, '.git'));
      throw new Error('nested Git project requires separate target binding');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const prior = directoryRecords.get(absolute);
    if (prior && !sameIdentity(prior, stat)) throw new Error('directory changed during local snapshot');
    directoryRecords.set(absolute, stat);
  };
  rememberDirectory(root);
  const walk = relative => {
    safePath(relative);
    if (relative.split('/').length > 100 || ++visited > 50000) throw new Error('local snapshot scope exceeds traversal limit; narrow the selected scope');
    if (exclusions.some(excluded => relative === excluded || relative.startsWith(`${excluded}/`))) return;
    const entry = { path: relative, kind: 'missing', digest: null, mode: null, index: [] };
    const parts = relative.split('/');
    let cursor = root;
    for (const part of parts.slice(0, -1)) {
      cursor = path.join(cursor, part);
      try { rememberDirectory(cursor); }
      catch (error) { if (error.code === 'ENOENT') { entries.push(entry); return; } throw error; }
    }
    const absolute = path.join(root, ...parts);
    let stat;
    try { stat = fs.lstatSync(absolute); }
    catch (error) { if (error.code === 'ENOENT') { entries.push(entry); return; } throw error; }
    if (stat.isSymbolicLink()) {
      const link = fs.readlinkSync(absolute, { encoding: 'buffer' });
      const after = fs.lstatSync(absolute);
      if (!after.isSymbolicLink() || !sameIdentity(stat, after) || !link.equals(fs.readlinkSync(absolute, { encoding: 'buffer' }))) throw new Error('symlink changed during local snapshot');
      Object.assign(entry, { kind: 'symlink', digest: digestBytes(link), mode: '120000' });
    } else if (stat.isDirectory()) {
      rememberDirectory(absolute);
      const names = fs.readdirSync(absolute, { encoding: 'buffer' }).map(name => {
        const decoded = name.toString('utf8');
        if (!Buffer.from(decoded).equals(name)) throw new Error('local filename is not valid UTF-8');
        return decoded;
      }).sort();
      if (names.some(name => name.toLowerCase() === '.git')) throw new Error('nested Git project requires separate target binding');
      for (const name of names) walk(`${relative}/${name}`);
      rememberDirectory(absolute);
      return;
    } else if (stat.isFile() && stat.size <= maxFileBytes) {
      bytes += stat.size;
      if (bytes > 128 * 1024 * 1024) throw new Error('local snapshot exceeds 128 MiB; narrow the selected scope');
      Object.assign(entry, { kind: 'file', digest: digestBytes(readFileNoFollow(root, relative, maxFileBytes)), mode: stat.mode & 0o111 ? '100755' : '100644' });
    } else {
      Object.assign(entry, { kind: stat.isFile() ? 'oversized-file' : 'unsupported', size: stat.size });
      gaps.push(`${relative}: local content was not hashed`);
    }
    entries.push(entry);
  };
  for (const selector of scope) walk(selector);
  for (const [directory, expected] of directoryRecords) {
    const current = fs.lstatSync(directory);
    if (!current.isDirectory() || current.isSymbolicLink() || !sameIdentity(expected, current)) throw new Error('directory changed during local snapshot');
    // Re-resolve the lexical chain too; do not silently follow a replaced parent.
    if (directory !== root) containedPath(root, path.relative(root, directory).split(path.sep).join('/'), { expectedType: 'directory' });
  }
  entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { digest: digestLocalDirectory(entries, scope, root), files: entries.map(entry => entry.path), entries, untracked: entries, evidence_gaps: gaps, local_scope: scope };
}

export function captureLocalDirectory(repositoryInput, scopeInput, exclusions = []) {
  const root = resolveLocalProjectRoot(repositoryInput);
  const scope = normalizeLocalScope(scopeInput);
  const excluded = exclusionsFor(root, exclusions);
  const first = capturePass(root, scope, excluded);
  const second = capturePass(root, scope, excluded);
  if (resolveLocalProjectRoot(repositoryInput) !== root || first.digest !== second.digest) throw new Error('local source changed during snapshot; recapture before continuing');
  return second;
}
