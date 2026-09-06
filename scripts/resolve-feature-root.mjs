#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';

const [startArgument, featureSlug = ''] = process.argv.slice(2);
const nextAction = 'select a path inside the target Git repository';

function fail(message) {
  process.stderr.write(`status=error\nsummary=${message}\nnext_action=${nextAction}\n`);
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
  const artifactRelative = `.agents/features/${featureSlug}`;
  const resolved = resolveRepositoryArtifactRoot({
    startDirectory,
    artifactRelative,
    gitFailureMessage: 'no enclosing Git repository was found',
  });

  process.stdout.write([
    'status=success',
    'summary=repository-local Feature Pro root resolved',
    `repo_root=${resolved.repositoryRoot}`,
    `feature_root=${resolved.artifactRoot}`,
    '',
  ].join('\n'));
} catch (error) {
  fail(error.message);
}
