#!/usr/bin/env node

import { canonicalRoot, ensureContainedDirectory } from './lib/repository-paths.mjs';
import { inspectArtifactDirectory, resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { resolveLocalProjectRoot } from './lib/local-directory.mjs';
import { decideArtifactScope } from './lib/project-discovery.mjs';

const args = process.argv.slice(2);
const known = new Set(['--repo', '--slug', '--create', '--local', '--initiative']);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

try {
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!known.has(flag)) throw new Error(`unknown argument ${flag}`);
    if (flag !== '--create' && flag !== '--local') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
      index += 1;
    }
  }
  const slug = valueFor('--slug');
  if (!slug) throw new Error('usage: resolve-review-root.mjs --slug <review-slug> [--repo <path>] [--local] [--create]');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) throw new Error('slug must be 1-64 lowercase letters, digits, or interior hyphens');
  const local = args.includes('--local');
  if (local && !valueFor('--repo')) throw new Error('--local requires an explicitly selected --repo');
  const start = local ? resolveLocalProjectRoot(valueFor('--repo')) : canonicalRoot(valueFor('--repo') ?? process.cwd());
  const create = args.includes('--create');
  // `--local` is an explicit selection of a standalone project; discovery must not override it.
  const scope = local ? { status: 'local' } : decideArtifactScope({
    startDirectory: start, family: 'reviews', slug, requestedInitiative: valueFor('--initiative') ?? '', create,
  });

  if (scope.status === 'needs-initiative') {
    console.log(JSON.stringify({
      status: 'needs-initiative',
      summary: scope.ambiguous ? 'this review slug exists under more than one initiative' : 'select the initiative this review belongs to',
      workspace_root: scope.workspace.workspaceRoot, matching: scope.matching, available: scope.available,
      next_actions: ['Re-run with --initiative <name>, using an existing initiative or a new one.'],
    }, null, 2));
    process.exit(2);
  }

  const artifactRelative = local ? `.agents/reviews/${slug}` : scope.artifactRelative;
  const resolved = local ? { repositoryRoot: start, artifactRoot: create ? ensureContainedDirectory(start, artifactRelative) : inspectArtifactDirectory(start, artifactRelative) }
    : resolveRepositoryArtifactRoot({ startDirectory: start, artifactRelative, create,
      ...(scope.status === 'project' ? { rootOverride: scope.projectRoot, containmentRoot: scope.workspace.workspaceRoot } : {}) });
  const ownership = local ? 'local-project' : scope.status === 'project' ? 'project' : 'repository';
  console.log(JSON.stringify({
    status: 'success',
    scope: ownership,
    summary: `resolved ${ownership}-owned Review Pro root for ${slug}`,
    ...(scope.status === 'project' ? { initiative: scope.initiative, workspace_root: scope.workspace.workspaceRoot } : {}),
    repository_root: resolved.repositoryRoot,
    artifact_root: resolved.artifactRoot,
    artifact_relative: artifactRelative,
    created: create,
    artifacts: create ? [artifactRelative] : [],
    next_actions: ['Initialize or resume Review Pro using this exact artifact root.'],
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Choose a valid Git repository, or explicitly use --local --repo <standalone-project>, and a canonical review slug.'] }, null, 2));
  process.exit(1);
}
