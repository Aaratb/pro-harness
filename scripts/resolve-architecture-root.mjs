#!/usr/bin/env node

import { canonicalRoot } from './lib/repository-paths.mjs';
import { resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { decideArtifactScope } from './lib/project-discovery.mjs';

const args = process.argv.slice(2);
const known = new Set(['--repo', '--slug', '--create', '--initiative']);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

try {
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!known.has(flag)) throw new Error(`unknown argument ${flag}`);
    if (flag !== '--create') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
      index += 1;
    }
  }
  const slug = valueFor('--slug');
  if (!slug) throw new Error('usage: resolve-architecture-root.mjs --slug <architecture-slug> [--repo <path>] [--create]');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) throw new Error('slug must be 1-64 lowercase letters, digits, or interior hyphens');
  const start = canonicalRoot(valueFor('--repo') ?? process.cwd());
  const create = args.includes('--create');
  const scope = decideArtifactScope({
    startDirectory: start, family: 'architecture', slug,
    requestedInitiative: valueFor('--initiative') ?? '', create,
  });

  if (scope.status === 'needs-initiative') {
    // Feature Pro reads this handoff from the initiative it resolved, so writing it under the
    // wrong one makes it invisible there rather than merely misplaced. Ask; never guess.
    console.log(JSON.stringify({
      status: 'needs-initiative',
      summary: scope.ambiguous
        ? 'this architecture slug exists under more than one initiative'
        : 'select the initiative this architecture belongs to',
      workspace_root: scope.workspace.workspaceRoot,
      matching: scope.matching,
      available: scope.available,
      next_actions: ['Re-run with --initiative <name>, using an existing initiative or a new one.'],
    }, null, 2));
    process.exitCode = 2;
  } else {
    const relativeArtifactRoot = scope.artifactRelative;
    const resolved = resolveRepositoryArtifactRoot({
      startDirectory: start,
      artifactRelative: relativeArtifactRoot,
      create,
      ...(scope.status === 'project'
        ? { rootOverride: scope.projectRoot, containmentRoot: scope.workspace.workspaceRoot }
        : {}),
    });
    console.log(JSON.stringify({
      status: 'success',
      scope: scope.status,
      ...(scope.status === 'project' ? { initiative: scope.initiative, workspace_root: scope.workspace.workspaceRoot } : {}),
      repository_root: resolved.repositoryRoot,
      artifact_root: resolved.artifactRoot,
      artifact_relative: relativeArtifactRoot,
      created: create,
    }, null, 2));
  }
} catch (error) {
  process.stdout.write(`${JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Choose a valid Git repository and canonical architecture slug.'] }, null, 2)}\n`);
  process.exitCode = 1;
}
