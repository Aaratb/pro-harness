#!/usr/bin/env node

import fs from 'node:fs';
import { resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';
import { decideArtifactScope } from './lib/project-discovery.mjs';

try {
  const values = new Map();
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    if (!['--repo-root', '--run-id', '--initiative'].includes(flag)) throw new Error('unknown argument');
    if (values.has(flag)) throw new Error(`duplicate ${flag}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    values.set(flag, value);
  }
  const runId = values.get('--run-id');
  if (!runId || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(runId)) {
    throw new Error('run-id must be 1-64 lowercase letters, digits, or interior hyphens');
  }
  const startDirectory = values.get('--repo-root') ?? process.cwd();
  const scope = decideArtifactScope({
    startDirectory, family: 'outcomes', slug: runId,
    requestedInitiative: values.get('--initiative') ?? '', create: true,
  });

  if (scope.status === 'needs-initiative') {
    console.log(JSON.stringify({
      status: 'needs-initiative',
      summary: scope.ambiguous
        ? 'this run-id exists under more than one initiative'
        : 'select the initiative this outcome belongs to',
      workspace_root: scope.workspace.workspaceRoot,
      matching: scope.matching,
      available: scope.available,
      next_actions: ['Re-run with --initiative <name>, using an existing initiative or a new one.'],
    }, null, 2));
    process.exitCode = 2;
  } else {
    const resolved = resolveRepositoryArtifactRoot({
      startDirectory,
      artifactRelative: scope.artifactRelative,
      gitFailureMessage: 'Choose an owning Git repository; orphan outcome folders are not supported.',
      ...(scope.status === 'project'
        ? { rootOverride: scope.projectRoot, containmentRoot: scope.workspace.workspaceRoot }
        : {}),
    });
    // A run-id names one measurement; reusing it would silently merge two runs' evidence.
    if (fs.existsSync(resolved.artifactRoot)) throw new Error('outcome artifact root already exists; choose a fresh run-id');
    console.log(JSON.stringify({
      status: 'success',
      scope: scope.status,
      ...(scope.status === 'project' ? { initiative: scope.initiative, workspace_root: scope.workspace.workspaceRoot } : {}),
      repository_root: resolved.repositoryRoot,
      artifact_root: resolved.artifactRoot,
      artifact_relative: resolved.artifactRelative,
      run_id: runId,
      created: false,
    }, null, 2));
  }
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Choose an owning Git repository and a fresh safe run-id.'] }, null, 2));
  process.exitCode = 1;
}
