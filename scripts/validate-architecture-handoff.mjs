#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';
import { digestFile, digestValue } from './lib/digests.mjs';
import { validateJsonSchema } from './lib/json-schema.mjs';

const argumentsList = process.argv.slice(2);
function valueFor(flag) { const index = argumentsList.indexOf(flag); return index >= 0 ? argumentsList[index + 1] : undefined; }
function issue(code, message, file = null) { return { code, message, ...(file ? { file } : {}) }; }

const repositoryRootInput = valueFor('--repo-root');
const handoffRelative = valueFor('--handoff');
const requireDesign = argumentsList.includes('--require-design');
const errors = [];
const verification = { schema: 'not-run', packet_digests: 'not-run', state_binding: 'not-run', artifact_digests: 'not-run', current_source: 'not-verified' };
let handoff;
let repositoryRoot;

try {
  if (!repositoryRootInput || !handoffRelative) throw new Error('usage: validate-architecture-handoff.mjs --repo-root <repository> --handoff <.agents/architecture/<slug>/handoff.json> [--require-design]');
  repositoryRoot = canonicalRoot(repositoryRootInput);
  const match = handoffRelative.match(/^\.agents\/architecture\/([a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)\/handoff\.json$/);
  if (!match) throw new Error('handoff path must be .agents/architecture/<slug>/handoff.json');
  const handoffPath = containedPath(repositoryRoot, handoffRelative, { expectedType: 'file' });
  handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'architecture-handoff', 'handoff.schema.json');
  for (const message of validateJsonSchema(handoff, schemaPath, 'handoff')) errors.push(issue('schema', message, handoffRelative));
  if (handoff.feature_slug !== match[1]) errors.push(issue('path-slug', 'feature_slug must match the handoff directory', handoffRelative));
  if (requireDesign && handoff.certification_status !== 'DESIGN_CERTIFIED') errors.push(issue('design-required', 'Feature Pro requires DESIGN_CERTIFIED', handoffRelative));
  if (handoff.certification_status === 'DESIGN_CERTIFIED') {
    for (const field of ['decision_ids', 'boundaries', 'fitness_functions', 'slices']) if (!Array.isArray(handoff[field]) || handoff[field].length === 0) errors.push(issue('certified-content', `DESIGN_CERTIFIED requires non-empty ${field}`, handoffRelative));
    if (!handoff.artifact_digests || Object.keys(handoff.artifact_digests).length === 0) errors.push(issue('certified-content', 'DESIGN_CERTIFIED requires artifact_digests', handoffRelative));
  }
  verification.schema = errors.length === 0 ? 'pass' : 'fail';

  if (digestValue(handoff.source_fingerprint) !== handoff.source_fingerprint_digest) errors.push(issue('source-fingerprint-digest', 'source_fingerprint_digest does not match the canonical object', handoffRelative));
  if (digestValue(handoff.harness_provenance) !== handoff.harness_provenance_digest) errors.push(issue('harness-provenance-digest', 'harness_provenance_digest does not match the canonical object', handoffRelative));
  verification.packet_digests = errors.some(({ code }) => code.endsWith('digest')) ? 'fail' : 'pass';

  const handoffDirectory = path.posix.dirname(handoffRelative);
  const stateRelative = `${handoffDirectory}/state.json`;
  try {
    const statePath = containedPath(repositoryRoot, stateRelative, { expectedType: 'file' });
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (state.run_id !== handoff.source_run_id) errors.push(issue('state-run', 'state run_id does not match source_run_id', stateRelative));
    if ((state.architecture_slug ?? state.feature_slug) !== handoff.feature_slug) errors.push(issue('state-slug', 'state architecture slug does not match handoff', stateRelative));
    if (state.input_fingerprint?.source_fingerprint_digest !== handoff.source_fingerprint_digest) errors.push(issue('state-fingerprint', 'state source fingerprint digest does not match handoff', stateRelative));
    if (state.harness_provenance_digest !== handoff.harness_provenance_digest && state.input_fingerprint?.harness_provenance_digest !== handoff.harness_provenance_digest) errors.push(issue('state-provenance', 'state harness provenance digest does not match handoff', stateRelative));
    if (state.handoff_digest && state.handoff_digest !== digestValue(handoff)) errors.push(issue('state-handoff-digest', 'state handoff_digest does not match the canonical handoff', stateRelative));
    verification.state_binding = errors.some(({ code }) => code.startsWith('state-')) ? 'fail' : 'pass';
  } catch (error) {
    errors.push(issue('state-read', error.message, stateRelative));
    verification.state_binding = 'fail';
  }

  if (!handoff.artifact_digests || typeof handoff.artifact_digests !== 'object' || Array.isArray(handoff.artifact_digests)) {
    errors.push(issue('artifact-map', 'artifact_digests must be an object', handoffRelative));
  } else {
    for (const [relativeArtifact, expectedDigest] of Object.entries(handoff.artifact_digests)) {
      if (['handoff.json', 'state.json', 'run.lock'].includes(relativeArtifact)) { errors.push(issue('artifact-self-reference', `forbidden artifact reference ${relativeArtifact}`, handoffRelative)); continue; }
      if (!/^sha256:[a-f0-9]{64}$/.test(expectedDigest)) { errors.push(issue('artifact-digest-format', `invalid digest for ${relativeArtifact}`, handoffRelative)); continue; }
      try {
        const artifactPath = containedPath(repositoryRoot, `${handoffDirectory}/${relativeArtifact}`, { expectedType: 'file' });
        if (digestFile(artifactPath) !== expectedDigest) errors.push(issue('artifact-digest-mismatch', `digest mismatch for ${relativeArtifact}`, relativeArtifact));
      } catch (error) {
        errors.push(issue('artifact-read', error.message, relativeArtifact));
      }
    }
    verification.artifact_digests = errors.some(({ code }) => code.startsWith('artifact-')) ? 'fail' : 'pass';
  }
} catch (error) {
  errors.push(issue('input', error.message, handoffRelative));
}

const result = errors.length === 0
  ? { status: 'success', summary: 'architecture handoff packet integrity is valid', verification, artifacts: [handoffRelative], next_actions: ['Independently re-verify source-sensitive architecture claims against the current repository before importing them into the feature plan.'] }
  : { status: 'error', summary: `${errors.length} architecture handoff validation error(s)`, verification, errors, artifacts: [], next_actions: ['Repair or regenerate the handoff packet; do not import it into Feature Pro.'] };
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exit(1);
