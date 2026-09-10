#!/usr/bin/env node

import { inspectArtifactDirectory, resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { ensureContainedDirectory } from './lib/repository-paths.mjs';
import { resolveLocalProjectRoot } from './lib/local-directory.mjs';
import { resolutionArguments } from './validate-review-resolution.mjs';
import { decideArtifactScope } from './lib/project-discovery.mjs';

try {
  const argv = process.argv.slice(2);
  if (argv.filter((arg) => arg === '--create').length > 1) throw new Error('duplicate --create');
  const options = resolutionArguments(argv.filter((arg) => arg !== '--create'), ['--repo', '--slug', '--local', '--initiative']);
  const slug = options['--slug'];
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug ?? '')) throw new Error('slug must be 1-64 lowercase letters, digits, or interior hyphens');
  const local = options['--local'] === true;
  if (local && !options['--repo']) throw new Error('--local requires an explicitly selected --repo');
  const create = argv.includes('--create');
  const start = local ? resolveLocalProjectRoot(options['--repo']) : null;
  // `--local` is an explicit user selection of a standalone project. Redirecting it into a
  // workspace initiative would override the choice they just made, so discovery is skipped.
  const scope = local
    ? { status: 'local' }
    : decideArtifactScope({
      startDirectory: options['--repo'] ?? process.cwd(), family: 'debug', slug,
      requestedInitiative: options['--initiative'] ?? '', create,
    });

  if (scope.status === 'needs-initiative') {
    console.log(JSON.stringify({
      status: 'needs-initiative',
      summary: scope.ambiguous ? 'this debug slug exists under more than one initiative' : 'select the initiative this debug run belongs to',
      workspace_root: scope.workspace.workspaceRoot, matching: scope.matching, available: scope.available,
      next_actions: ['Re-run with --initiative <name>, using an existing initiative or a new one.'],
    }, null, 2));
    process.exitCode = 2;
  } else {
    const artifactRelative = local ? `.agents/debug/${slug}` : scope.artifactRelative;
    const result = local
      ? { repositoryRoot: start, artifactRoot: create ? ensureContainedDirectory(start, artifactRelative) : inspectArtifactDirectory(start, artifactRelative), artifactRelative, created: create }
      : resolveRepositoryArtifactRoot({
        startDirectory: options['--repo'] ?? process.cwd(), artifactRelative, create,
        ...(scope.status === 'project' ? { rootOverride: scope.projectRoot, containmentRoot: scope.workspace.workspaceRoot } : {}),
      });
    const ownership = local ? 'local-project' : scope.status === 'project' ? 'project' : 'repository';
    console.log(JSON.stringify({ status: 'success', scope: ownership, summary: `resolved ${ownership}-owned Debug Pro root for ${slug}`,
      ...(scope.status === 'project' ? { initiative: scope.initiative, workspace_root: scope.workspace.workspaceRoot } : {}),
      repository_root: result.repositoryRoot, artifact_root: result.artifactRoot, artifact_relative: result.artifactRelative,
      artifacts: result.created ? [result.artifactRelative] : [], next_actions: ['Use this exact artifact root throughout Debug Pro.'] }, null, 2));
  }
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Choose a valid Git repository, or explicitly use --local --repo <standalone-project>, and a canonical debug slug.'] }, null, 2));
  process.exitCode = 1;
}
