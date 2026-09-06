#!/usr/bin/env node

import { resolveProjectArtifactRoot } from './lib/project-artifacts.mjs';

try {
  const { projectRoot, artifactRoot, artifactRelative, slug, resume } = resolveProjectArtifactRoot(process.argv.slice(2), {
    slugName: 'study-slug', artifactDirectory: 'research', reportName: 'research.md', kind: 'research', runName: 'study',
  });
  console.log(JSON.stringify({
    status: 'success', project_root: projectRoot, artifact_root: artifactRoot,
    artifact_relative: artifactRelative, study_slug: slug, created: false, resume,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    status: 'error', summary: error.message, artifacts: [],
    next_actions: ['Select a real project directory and a safe study-slug; use --resume only for an existing research study.'],
  }, null, 2));
  process.exitCode = 1;
}
