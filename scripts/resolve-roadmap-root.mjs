#!/usr/bin/env node

import { resolveProjectArtifactRoot } from './lib/project-artifacts.mjs';

try {
  const { projectRoot, artifactRoot, artifactRelative, slug, resume } = resolveProjectArtifactRoot(process.argv.slice(2), {
    slugName: 'roadmap-slug', artifactDirectory: 'roadmaps', reportName: 'roadmap.md', kind: 'roadmap',
  });
  console.log(JSON.stringify({
    status: 'success', project_root: projectRoot, artifact_root: artifactRoot,
    artifact_relative: artifactRelative, roadmap_slug: slug, created: false, resume,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    status: 'error', summary: error.message, artifacts: [],
    next_actions: ['Select a real project directory and a safe roadmap-slug; use --resume only for an existing roadmap.'],
  }, null, 2));
  process.exitCode = 1;
}
