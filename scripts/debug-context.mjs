#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { containedPath } from './lib/repository-paths.mjs';
import { digestFile } from './lib/digests.mjs';
import { readJsonNoFollow } from './lib/review-safety.mjs';
import { captureReviewSource, currentHead, repositoryIdentity } from './review-source.mjs';
import { localRepositoryIdentity, normalizeLocalScope, resolveLocalProjectRoot } from './lib/local-directory.mjs';
import { diffEvidence, isAncestor, readResolutionHandoff, resolutionArguments, resolutionRepository, resolutionRoot } from './validate-review-resolution.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const bare = (value) => value?.replace(/^sha256:/, '');

export function currentFileDigest(repository, relative) {
  let file;
  try { file = containedPath(repository, relative, { expectedType: 'file' }); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  assert(fs.statSync(file).size <= 4 * 1024 * 1024, 'baseline file exceeds 4 MiB; use a narrower authorized workspace');
  return digestFile(file);
}

export function captureDebugContext(options) {
  const repositoryInput = options['--repo-root'];
  const local = options['--local'] === true;
  assert(local || options['--scope'] === undefined, '--scope requires explicit --local mode');
  assert(!local || options['--scope'] !== undefined, 'local Debug capture requires explicit --scope JSON selectors');
  const localScope = local ? normalizeLocalScope(JSON.parse(options['--scope'])) : null;
  const repository = resolutionRepository(repositoryInput, { local });
  const active = resolutionRoot(repository, repositoryInput, options['--artifact-root'], 'debug');
  assert(!(options['--pre-fix-sha'] && options['--pre-fix-snapshot']), '--pre-fix-sha and --pre-fix-snapshot are mutually exclusive');
  const head = local ? null : currentHead(repository);
  const initial = !local && head === null;
  const snapshotMode = initial || local;
  const preFix = options['--pre-fix-sha'] ?? head;
  const preSnapshot = options['--pre-fix-snapshot'];
  if (snapshotMode) {
    assert(!options['--pre-fix-sha'], 'a content snapshot requires an initial snapshot, not a pre-fix SHA');
    assert(preSnapshot === undefined || /^sha256:[0-9a-f]{64}$/.test(preSnapshot), 'pre-fix snapshot must be a captured SHA-256 digest');
  } else {
    assert(preSnapshot === undefined, 'initial snapshot context requires unborn HEAD; a first commit needs a fresh review');
    assert(/^[0-9a-f]{40,64}$/.test(preFix) && isAncestor(repository, preFix, head), 'pre-fix SHA must be a verified ancestor of HEAD');
  }
  const exclusions = [active.relative];
  let source = { kind: 'direct', review_id: null, finding_id: null, handoff_digest: null };
  let criteria = null;
  assert(Boolean(options['--review-root']) === Boolean(options['--handoff']), '--review-root and --handoff must be supplied together');
  if (options['--handoff']) {
    const { original, state, handoff } = readResolutionHandoff(repository, repositoryInput, options['--review-root'], options['--handoff'], { local, localScope });
    assert(preFix === handoff.target.reviewed_head_sha, 'pre-fix SHA differs from reviewed head; re-review a moved target');
    assert((local ? localRepositoryIdentity(repository) : repositoryIdentity(repository)) === handoff.target.repository_identity, 'handoff repository identity differs from actual repository');
    const intake = readJsonNoFollow(original.root, 'intake.json');
    assert(['working-tree', 'committed-range', 'initial-working-tree', 'local-directory'].includes(intake.comparison)
      && ['repository_identity', 'base_sha', 'reviewed_head_sha', 'diff_digest'].every((key) => intake[key] === state.target[key]), 'original intake differs from authenticated Review context');
    assert((state.target.comparison === undefined || state.target.comparison === intake.comparison)
      && (handoff.target.comparison === undefined || handoff.target.comparison === intake.comparison), 'original Review comparison differs from the handoff');
    if (snapshotMode) {
      assert(intake.comparison === (local ? 'local-directory' : 'initial-working-tree') && handoff.target.comparison === intake.comparison
        && state.target.comparison === intake.comparison && intake.base_sha === null, 'handoff must bind the initial working snapshot');
      if (local) assert([intake, state.target, handoff.target].every((target) => JSON.stringify(target.local_scope) === JSON.stringify(localScope)), 'handoff local scope differs from explicitly selected local scope');
      if (preSnapshot !== undefined) assert(bare(preSnapshot) === bare(intake.diff_digest), 'pre-fix snapshot differs from the original Review snapshot');
    }
    if (!options['--pre-fix-sha'] && preSnapshot === undefined) {
      const working = !local && intake.comparison !== 'committed-range';
      // Reuse Review's wire digest, not Debug's different working-tree digest.
      const current = captureReviewSource({ repositoryRoot: repository, artifactRoot: original.root, base: state.target.base_sha,
        head: state.target.reviewed_head_sha, working, write: false, excludeDebugRoot: active.root, ...(local ? { local: true, localScope } : {}) });
      assert(bare(current.diff_digest) === bare(handoff.target.diff_digest), 'current reviewed diff differs from the handoff');
      assert(handoff.target.files.every((file) => current.changed_files.includes(file)), 'handoff cites a file outside the current reviewed change');
      if (!working && !local) {
        const dirty = diffEvidence(repository, { pre_fix_sha: head, post_fix_sha: head, diff_mode: 'working-tree' }, [active.relative, original.relative]);
        assert(!handoff.target.files.some((file) => dirty.files.includes(file)), 'reviewed files have unreviewed working changes');
      }
    }
    exclusions.push(original.relative);
    source = { kind: 'review-pro', review_id: handoff.review.review_id, finding_id: handoff.review.finding_id, handoff_digest: handoff.content_digest,
      handoff_path: options['--handoff'], review_workspace_root: original.root };
    criteria = handoff.acceptance_criteria;
  }
  const diffMode = local ? 'local-directory' : initial ? 'initial-working-tree' : 'working-tree';
  const target = { pre_fix_sha: preFix, post_fix_sha: head, diff_mode: diffMode, ...(local ? { local_scope: localScope } : {}) };
  const actual = diffEvidence(repository, target, exclusions);
  const baselineFiles = actual.files.map((file) => ({ path: file, sha256: currentFileDigest(repository, file) }));
  const final = diffEvidence(repository, target, exclusions);
  assert(actual.digest === final.digest && (local ? resolveLocalProjectRoot(repository) === repository : currentHead(repository) === head), 'source changed while capturing Debug context; retry after edits settle');
  return { repository_identity: local ? localRepositoryIdentity(repository) : repositoryIdentity(repository), repository_root: repository, artifact_root: active.root,
    run_relative_path: active.relative, head_sha: head, pre_fix_sha: preFix, diff_mode: diffMode, diff_digest: actual.digest,
    ...(local ? { local_scope: localScope } : {}),
    ...(snapshotMode ? { pre_fix_snapshot_digest: preSnapshot ?? actual.digest,
      ...(preSnapshot === undefined ? { initial_snapshot_entries: actual.entries } : {}) } : {}),
    changed_files: actual.files, baseline_files: baselineFiles, source, review_acceptance_criteria: criteria };
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = resolutionArguments(process.argv.slice(2), ['--repo-root', '--artifact-root', '--pre-fix-sha', '--pre-fix-snapshot', '--review-root', '--handoff', '--local', '--scope']);
    console.log(JSON.stringify({ status: 'success', summary: 'captured read-only Debug source context', context: captureDebugContext(options), artifacts: [],
      next_actions: ['Record the initial baseline before editing; retain it unchanged when capturing final context with --pre-fix-sha or --pre-fix-snapshot.'] }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ status: 'error', summary: error.message, artifacts: [], next_actions: ['Check the explicit repository, run root and original review context; do not repair a stale target.'] }, null, 2));
    process.exitCode = 1;
  }
}
