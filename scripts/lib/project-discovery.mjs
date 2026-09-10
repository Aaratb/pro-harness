// Workspace project discovery.
//
// A workspace declares itself with a committed `.pro-harness-projects.json` at its root.
// Harness output for project-owned commands then lands beside the initiative it belongs to
// -- `<workspace>/<projects_root>/<initiative>/<family>/<slug>` -- instead of inside whichever
// repository happened to be the working directory.
//
// There is deliberately no `.agents/` segment in project scope. Provenance is a weak axis:
// a half-finished generated study and a half-finished hand-written note have the same standing
// to the person reading the folder, so grouping by who produced a file predicts nothing they
// care about. Harness research simply IS research and sits with it. Repository scope keeps
// `.agents/` -- existing clones already hold trees there, and a flat `features/` or `debug/` beside
// real source directories would collide with the repository's own layout.
//
// The walk is filesystem-based, never git-based. That is the whole point: service clones are
// nested inside the workspace, so `git rev-parse --show-toplevel` from `<workspace>/<repo>`
// returns `<workspace>/<repo>` and can never reach the initiative tree. Walking the parent
// chain passes straight through a nested repository boundary.
//
// No marker anywhere above the start directory means no workspace, and every caller falls
// back to its existing repository-owned behavior. That keeps the harness usable in any
// repository that is not part of a declared workspace, which is most of them.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertRelativePath, canonicalRoot } from './repository-paths.mjs';

export const PROJECT_MARKER = '.pro-harness-projects.json';

// Deliberately distinct from `.pro-harness-install.json` and `.pro-harness-generated.json`:
// `assertProjectBoundary` in project-artifacts.mjs treats those two as DISQUALIFYING markers,
// so reusing either name would make every workspace below them unusable as a project root.
const INSTALL_MARKERS = ['.pro-harness-install.json', '.pro-harness-generated.json'];

function readMarker(directory) {
  const markerPath = path.join(directory, PROJECT_MARKER);
  let stat;
  try {
    stat = fs.lstatSync(markerPath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`${PROJECT_MARKER} must be a regular file, not a symlink`);
  if (!stat.isFile()) throw new Error(`${PROJECT_MARKER} must be a regular file`);

  let declaration;
  try {
    declaration = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  } catch (error) {
    throw new Error(`${PROJECT_MARKER} is not valid JSON: ${error.message}`);
  }
  if (declaration === null || typeof declaration !== 'object' || Array.isArray(declaration)) {
    throw new Error(`${PROJECT_MARKER} must contain a JSON object`);
  }
  if (declaration.schema_version !== 1) {
    throw new Error(`${PROJECT_MARKER} requires "schema_version": 1`);
  }
  const projectsRelative = declaration.projects_root;
  if (typeof projectsRelative !== 'string' || projectsRelative.length === 0) {
    throw new Error(`${PROJECT_MARKER} requires a non-empty "projects_root"`);
  }
  // Relative to the marker's own directory, so the declaration is machine-independent and a
  // clone on another computer resolves identically. assertRelativePath rejects absolute paths,
  // `..` components, and backslashes.
  assertRelativePath(projectsRelative);
  return { projectsRelative };
}

/**
 * Walk the parent chain looking for the workspace marker.
 *
 * Returns `{ workspaceRoot, projectsRoot, projectsRelative }` with real, canonical paths, or
 * `null` when no marker is found. `projectsRoot` may not exist yet -- `Product/` is git-ignored,
 * so a fresh clone has no such directory until the first run creates one.
 */
export function discoverWorkspace(startDirectory = process.cwd()) {
  const start = canonicalRoot(startDirectory);
  const home = fs.realpathSync.native(os.homedir());

  for (let cursor = start; ; cursor = path.dirname(cursor)) {
    // A managed harness installation is never a workspace. Stopping rather than continuing
    // upward keeps `~/.agents` and `~/.pro-harness` from ever resolving as project storage.
    if (INSTALL_MARKERS.some((marker) => fs.existsSync(path.join(cursor, marker)))) return null;

    const declaration = readMarker(cursor);
    if (declaration) {
      if (cursor === home || cursor === path.parse(cursor).root) {
        throw new Error(`${PROJECT_MARKER} may not declare the home or filesystem root as a workspace`);
      }
      return {
        workspaceRoot: cursor,
        projectsRelative: declaration.projectsRelative,
        projectsRoot: path.join(cursor, declaration.projectsRelative),
      };
    }
    if (cursor === path.dirname(cursor)) return null;
  }
}

/** Initiative folder names that currently exist, sorted. Empty when the tree is absent. */
export function listInitiatives(projectsRoot) {
  let entries;
  try {
    entries = fs.readdirSync(projectsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

const INITIATIVE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function assertInitiativeName(initiative) {
  if (typeof initiative !== 'string' || !INITIATIVE_PATTERN.test(initiative)) {
    throw new Error('initiative must be a lowercase slug of letters, digits and hyphens');
  }
  return initiative;
}

/**
 * Which initiatives already hold a run with this slug.
 *
 * Cold resume cannot read the initiative out of `state.json`, because `state.json` lives inside
 * the very directory the initiative is needed to compose. Scanning the (small) set of
 * initiative folders derives the answer from the filesystem instead of from a second state file
 * that would need keeping in sync and would go stale after a clone.
 *
 * One match resumes silently, none means a fresh run, several must be disambiguated by the user.
 */
export function findInitiativesHoldingSlug({ projectsRoot, family, slug }) {
  assertRelativePath(`${family}/${slug}`);
  return listInitiatives(projectsRoot).filter((initiative) => {
    const candidate = path.join(projectsRoot, initiative, family, slug);
    try {
      return fs.lstatSync(candidate).isDirectory();
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  });
}

/**
 * Compose the project root for one initiative, creating the folder when asked.
 *
 * Containment is enforced against the workspace, not against the caller's working directory:
 * the artifact tree is legitimately a sibling of wherever the command was invoked.
 */
export function projectRootFor({ workspace, initiative, create = false }) {
  assertInitiativeName(initiative);
  const projectRoot = path.join(workspace.projectsRoot, initiative);
  if (create) fs.mkdirSync(projectRoot, { recursive: true, mode: 0o700 });
  const canonical = canonicalRoot(projectRoot);
  const relative = path.relative(workspace.workspaceRoot, canonical);
  if (relative === '' || path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error('resolved project root escapes the declared workspace');
  }
  return canonical;
}

/**
 * The whole scope decision for one run, so seven resolvers do not each reimplement it.
 *
 * Returns one of:
 *   { status: 'repository' }                       no declared workspace; caller keeps its own
 *                                                  git-based resolution entirely unchanged
 *   { status: 'needs-initiative', workspace, ... }  the caller must ask, then re-invoke
 *   { status: 'project', workspace, initiative, projectRoot }
 *
 * Absence and ambiguity are both returned rather than guessed. Picking an initiative for the
 * user silently is how artifacts end up under the wrong one, which is the failure this whole
 * change exists to prevent.
 */
export function decideArtifactScope({ startDirectory, family, slug, requestedInitiative = '', create = true }) {
  const workspace = discoverWorkspace(startDirectory);
  if (!workspace) return { status: 'repository', artifactRelative: `.agents/${family}/${slug}` };

  const matching = findInitiativesHoldingSlug({ projectsRoot: workspace.projectsRoot, family, slug });
  let initiative = requestedInitiative;
  if (!initiative && matching.length === 1) [initiative] = matching;
  if (!initiative) {
    return {
      status: 'needs-initiative',
      workspace,
      matching,
      available: listInitiatives(workspace.projectsRoot),
      ambiguous: matching.length > 1,
    };
  }

  assertInitiativeName(initiative);
  const projectRoot = projectRootFor({ workspace, initiative, create });
  const artifactRelative = `${family}/${slug}`;
  assertNotHandAuthored(path.join(projectRoot, artifactRelative), artifactRelative);
  return { status: 'project', workspace, initiative, projectRoot, artifactRelative };
}

// Flattening removed the `.agents/` segment that used to make a collision impossible, so a slug
// can now land on a hand-authored folder: `research/persona` and `research/link-in-bio` are real
// corpora. Refuse rather than write into one. A directory that already holds a run is fine --
// that is a resume -- and one that is empty or absent is fine too.
const RUN_MARKERS = ['run-events.jsonl', 'state.json'];

export function assertNotHandAuthored(artifactRoot, artifactRelative) {
  let entries;
  try {
    entries = fs.readdirSync(artifactRoot);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (!entries.length) return;
  if (RUN_MARKERS.some((marker) => entries.includes(marker))) return;
  throw new Error(
    `${artifactRelative} already exists and holds no harness run; choose a different slug rather than writing into hand-authored content`,
  );
}
