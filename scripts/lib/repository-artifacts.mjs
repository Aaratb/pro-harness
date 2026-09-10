import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertRelativePath, canonicalRoot, ensureContainedDirectory } from './repository-paths.mjs';

function discoveryEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
  );
}

function stripTerminalLineEnding(value) {
  if (value.endsWith('\r\n')) return value.slice(0, -2);
  if (value.endsWith('\n')) return value.slice(0, -1);
  return value;
}

function assertControlFreePath(value, label) {
  if (/[\u0000-\u001f\u007f]/u.test(value)) throw new Error(`${label} contains control characters`);
}

function assertContains(root, candidate, label = 'resolved Git repository') {
  const relative = path.relative(root, candidate);
  if (relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))) return;
  throw new Error(`${label} does not contain the target path`);
}

export function inspectArtifactDirectory(root, relativePath) {
  const repositoryRoot = canonicalRoot(root);
  const parts = assertRelativePath(relativePath);
  let cursor = repositoryRoot;

  for (const part of parts) {
    cursor = path.join(cursor, part);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`symlinked artifact path component is forbidden: ${part}`);
    if (!stat.isDirectory()) throw new Error(`artifact path component is not a directory: ${part}`);
  }

  return cursor;
}

export function resolveRepositoryArtifactRoot({
  startDirectory,
  artifactRelative,
  create = false,
  gitFailureMessage,
  // Optional project-owned override. `rootOverride` is the directory artifacts are composed
  // beneath; `containmentRoot` is the declared workspace both it and the start directory must
  // sit inside. The pair is what keeps the security property intact: the artifact tree is
  // legitimately a sibling of the working directory, so requiring `start` to be INSIDE the
  // artifact root -- correct for repository-owned output -- is the wrong invariant here.
  // Containment is asserted against the workspace instead, never dropped.
  rootOverride = null,
  containmentRoot = null,
}) {
  const start = canonicalRoot(startDirectory);
  assertControlFreePath(start, 'target path');

  if (rootOverride) {
    if (!containmentRoot) throw new Error('rootOverride requires a containmentRoot');
    const workspaceRoot = canonicalRoot(containmentRoot);
    const overriddenRoot = canonicalRoot(rootOverride);
    assertControlFreePath(workspaceRoot, 'workspace path');
    assertControlFreePath(overriddenRoot, 'project path');
    assertContains(workspaceRoot, overriddenRoot, 'declared workspace');
    assertContains(workspaceRoot, start, 'declared workspace');
    const overriddenArtifactRoot = create
      ? ensureContainedDirectory(overriddenRoot, artifactRelative)
      : inspectArtifactDirectory(overriddenRoot, artifactRelative);
    return {
      repositoryRoot: overriddenRoot,
      artifactRoot: overriddenArtifactRoot,
      artifactRelative,
      created: create,
      workspaceRoot,
    };
  }

  let reportedRoot;
  try {
    reportedRoot = stripTerminalLineEnding(execFileSync(
      'git',
      ['-C', start, 'rev-parse', '--show-toplevel'],
      { encoding: 'utf8', env: discoveryEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] },
    ));
  } catch (error) {
    if (gitFailureMessage) throw new Error(gitFailureMessage);
    throw error;
  }

  const repositoryRoot = canonicalRoot(reportedRoot);
  assertControlFreePath(repositoryRoot, 'repository path');
  assertContains(repositoryRoot, start);
  const artifactRoot = create
    ? ensureContainedDirectory(repositoryRoot, artifactRelative)
    : inspectArtifactDirectory(repositoryRoot, artifactRelative);

  return {
    repositoryRoot,
    artifactRoot,
    artifactRelative,
    created: create,
  };
}
