#!/usr/bin/env node

import { inspectArtifactDirectory, resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { ensureContainedDirectory } from './lib/repository-paths.mjs';
import { resolveLocalProjectRoot } from './lib/local-directory.mjs';
import { resolutionArguments } from './validate-review-resolution.mjs';

try {
  const argv = process.argv.slice(2);
  if (argv.filter((arg) => arg === '--create').length > 1) throw new Error('duplicate --create');
  const options = resolutionArguments(argv.filter((arg) => arg !== '--create'), ['--repo', '--slug', '--local']);
  const slug = options['--slug'];
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug ?? '')) throw new Error('slug must be 1-64 lowercase letters, digits, or interior hyphens');
  const local = options['--local'] === true;
  if (local && !options['--repo']) throw new Error('--local requires an explicitly selected --repo');
  const artifactRelative = `.agents/debug/${slug}`;
  const start = local ? resolveLocalProjectRoot(options['--repo']) : null;
  const result = local ? { repositoryRoot: start, artifactRoot: argv.includes('--create') ? ensureContainedDirectory(start, artifactRelative) : inspectArtifactDirectory(start, artifactRelative), artifactRelative, created: argv.includes('--create') }
    : resolveRepositoryArtifactRoot({ startDirectory: options['--repo'] ?? process.cwd(), artifactRelative, create: argv.includes('--create') });
  console.log(JSON.stringify({ status: 'success', summary: `resolved ${local ? 'local-project' : 'repository'}-owned Debug Pro root for ${slug}`,
    repository_root: result.repositoryRoot, artifact_root: result.artifactRoot, artifact_relative: result.artifactRelative,
    artifacts: result.created ? [result.artifactRelative] : [], next_actions: ['Use this exact artifact root throughout Debug Pro.'] }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Choose a valid Git repository, or explicitly use --local --repo <standalone-project>, and a canonical debug slug.'] }, null, 2));
  process.exitCode = 1;
}
