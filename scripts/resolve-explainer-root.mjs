#!/usr/bin/env node

import { canonicalRoot } from './lib/repository-paths.mjs';
import { resolveRepositoryArtifactRoot } from './lib/repository-artifacts.mjs';

const args = process.argv.slice(2);
const known = new Set(['--repo', '--slug', '--create']);
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
  if (!slug) throw new Error('usage: resolve-explainer-root.mjs --slug <explanation-slug> [--repo <path>] [--create]');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(slug)) throw new Error('slug must be 1-64 lowercase letters, digits, or interior hyphens');
  const start = canonicalRoot(valueFor('--repo') ?? process.cwd());
  const relativeArtifactRoot = `.agents/explanations/${slug}`;
  const resolved = resolveRepositoryArtifactRoot({
    startDirectory: start,
    artifactRelative: relativeArtifactRoot,
    create: args.includes('--create'),
  });
  console.log(JSON.stringify({
    status: 'success',
    repository_root: resolved.repositoryRoot,
    artifact_root: resolved.artifactRoot,
    artifact_relative: relativeArtifactRoot,
    created: args.includes('--create'),
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Choose a valid Git repository and canonical explanation slug.'] }, null, 2));
  process.exit(1);
}
