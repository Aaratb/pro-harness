#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { decideArtifactScope } from './lib/project-discovery.mjs';

const positional = [];
let requestedInitiative = '';
const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index += 1) {
  if (argv[index] === '--initiative') {
    requestedInitiative = argv[index + 1] ?? '';
    index += 1;
  } else {
    positional.push(argv[index]);
  }
}
const [startArgument, featureSlug = ''] = positional;
const nextAction = 'select a path inside the target Git repository';

function fail(message, action = nextAction) {
  process.stderr.write(`status=error\nsummary=${message}\nnext_action=${action}\n`);
  process.exitCode = 1;
}

function physicalStartDirectory(startPath) {
  let candidate;
  try {
    candidate = fs.realpathSync.native(startPath);
  } catch {
    throw new Error('target path does not exist or is not a directory');
  }
  let stat;
  try {
    stat = fs.statSync(candidate);
  } catch {
    throw new Error('target path does not exist or is not a directory');
  }
  if (stat.isFile()) candidate = path.dirname(candidate);
  try {
    stat = fs.statSync(candidate);
  } catch {
    throw new Error('target path does not exist or is not a directory');
  }
  if (!stat.isDirectory()) throw new Error('target path does not exist or is not a directory');
  return candidate;
}

try {
  if (!featureSlug) throw new Error('feature slug is required');
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(featureSlug)) {
    throw new Error('feature slug must start with a lowercase letter or digit and contain only lowercase letters, digits, dots, underscores, or hyphens');
  }

  const startDirectory = physicalStartDirectory(startArgument || process.cwd());
  const scope = decideArtifactScope({
    startDirectory, family: 'features', slug: featureSlug,
    requestedInitiative, create: true,
  });

  if (scope.status === 'needs-initiative') {
    // Ambiguity and absence are both the caller's decision, never a guess.
    process.stdout.write([
      'status=needs-initiative',
      scope.ambiguous
        ? 'summary=this feature slug exists under more than one initiative'
        : 'summary=select the initiative this feature belongs to',
      `workspace_root=${scope.workspace.workspaceRoot}`,
      `projects_root=${scope.workspace.projectsRoot}`,
      `matching=${scope.matching.join(',')}`,
      `available=${scope.available.join(',')}`,
      'next_action=re-run with --initiative <name>, using an existing initiative or a new one',
      '',
    ].join('\n'));
    process.exitCode = 2;
  } else if (scope.status === 'repository') {
    // No declared workspace: unchanged repository-owned behavior, including the `.agents/`
    // segment, so the harness stays usable in any repository that is not part of one.
    const resolved = resolveRepositoryArtifactRoot({
      startDirectory,
      artifactRelative: scope.artifactRelative,
      gitFailureMessage: 'no enclosing Git repository was found',
    });
    process.stdout.write([
      'status=success',
      'scope=repository',
      'summary=repository-local Feature Pro root resolved',
      `repo_root=${resolved.repositoryRoot}`,
      `feature_root=${resolved.artifactRoot}`,
      '',
    ].join('\n'));
  } else {
    const resolved = resolveRepositoryArtifactRoot({
      startDirectory,
      artifactRelative: scope.artifactRelative,
      rootOverride: scope.projectRoot,
      containmentRoot: scope.workspace.workspaceRoot,
    });

    // The code repository is still reported when there is one: Feature Pro needs it for
    // branches, tests and pull requests even though artifacts now live with the initiative.
    let repositoryRoot = '';
    try {
      repositoryRoot = resolveRepositoryArtifactRoot({ startDirectory, artifactRelative: '.git' }).repositoryRoot;
    } catch { repositoryRoot = ''; }

    process.stdout.write([
      'status=success',
      'scope=project',
      'summary=project-owned Feature Pro root resolved',
      `workspace_root=${scope.workspace.workspaceRoot}`,
      `initiative=${scope.initiative}`,
      `project_root=${scope.projectRoot}`,
      `repo_root=${repositoryRoot}`,
      `feature_root=${resolved.artifactRoot}`,
      '',
    ].join('\n'));
  }
} catch (error) {
  fail(error.message);
}
