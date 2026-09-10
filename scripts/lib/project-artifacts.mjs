import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRoot, containedPath } from './repository-paths.mjs';
import { inspectArtifactDirectory, resolveRepositoryArtifactRoot } from './repository-artifacts.mjs';
import { decideArtifactScope } from './project-discovery.mjs';

function assertControlFree(value) {
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) throw new Error('target path or argument contains control characters');
}

function parseArguments(args, slugName) {
  const slugFlag = `--${slugName}`;
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    assertControlFree(flag);
    if (![slugFlag, '--repo-root', '--project-root', '--resume', '--initiative'].includes(flag)) throw new Error('unknown argument');
    if (values.has(flag)) throw new Error(`duplicate ${flag}`);
    if (flag === '--resume') { values.set(flag, true); continue; }
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    assertControlFree(value);
    values.set(flag, value);
  }
  if (values.has('--repo-root') && values.has('--project-root')) throw new Error('--repo-root and --project-root are mutually exclusive');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(values.get(slugFlag) ?? '')) {
    throw new Error(`${slugName} must be 1-64 lowercase letters, digits, or interior hyphens`);
  }
  return values;
}

export function selectedDirectory(input) {
  assertControlFree(input);
  // Inspect before normalizing '..', so a linked component cannot disappear from the check.
  const absolute = path.isAbsolute(input) ? input : `${process.cwd()}${path.sep}${input}`;
  assertControlFree(absolute);
  const volume = path.parse(absolute).root;
  let cursor = volume;
  for (const part of absolute.slice(volume.length).split(path.sep)) {
    if (!part || part === '.') continue;
    cursor = part === '..' ? path.dirname(cursor) : path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) {
      const physical = fs.realpathSync.native(cursor);
      assertControlFree(physical);
      const systemAlias = process.platform === 'darwin'
        && ((cursor === '/tmp' && physical === '/private/tmp') || (cursor === '/var' && physical === '/private/var'));
      if (!systemAlias) throw new Error('symlinked project root or path component is forbidden');
      cursor = physical;
    } else if (!stat.isDirectory()) throw new Error('project root must be a real directory');
  }
  const physical = canonicalRoot(cursor);
  assertControlFree(physical);
  return physical;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function assertProjectBoundary(projectRoot, kind) {
  if (projectRoot === path.parse(projectRoot).root) throw new Error(`filesystem root cannot be a ${kind} project`);
  const home = fs.realpathSync.native(os.homedir());
  if (projectRoot === home) throw new Error(`home directory cannot be a ${kind} project`);
  const harnessRoot = fs.realpathSync.native(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
  const protectedRoots = [harnessRoot];
  for (const name of ['.agents', '.pro-harness', '.codex', '.claude', '.cursor']) {
    const knownRoot = path.join(home, name);
    try { protectedRoots.push(fs.realpathSync.native(knownRoot)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (protectedRoots.some((root) => isWithin(root, projectRoot))) throw new Error(`harness installation or runtime root cannot be a ${kind} project`);
  for (let cursor = projectRoot; ; cursor = path.dirname(cursor)) {
    for (const marker of ['.pro-harness-install.json', '.pro-harness-generated.json']) {
      try {
        fs.lstatSync(path.join(cursor, marker));
        throw new Error(`managed harness installation cannot be a ${kind} project`);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (cursor === path.dirname(cursor)) break;
  }
}

function assertResumeReport(artifactRoot, reportName) {
  let report;
  try { report = containedPath(artifactRoot, reportName, { expectedType: 'file' }); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`resume requires an existing regular ${reportName}`);
    throw error;
  }
  const expected = fs.lstatSync(report);
  const descriptor = fs.openSync(report, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== expected.dev || opened.ino !== expected.ino) throw new Error(`resume requires an unchanged regular ${reportName}`);
  } finally { fs.closeSync(descriptor); }
}

// Options are fixed by the owning command, never taken from CLI input.
// Resolution is read-only; report identity and evidence freshness remain caller checks.
export function resolveProjectArtifactRoot(args, { slugName, artifactDirectory, reportName, kind, runName = kind }) {
  const values = parseArguments(args, slugName);
  const slug = values.get(`--${slugName}`);
  const resume = values.has('--resume');
  const start = selectedDirectory(values.get('--project-root') ?? values.get('--repo-root') ?? process.cwd());
  assertProjectBoundary(start, kind);
  let artifactRelative = `.agents/${artifactDirectory}/${slug}`;
  // An explicit --project-root is the caller's decision and is never second-guessed. Otherwise
  // a declared workspace resolves the initiative, so --project-root no longer has to be typed
  // by hand on every invocation -- which is what kept these two commands manual.
  let projectRoot;
  if (values.has('--project-root')) {
    projectRoot = start;
  } else {
    const scope = decideArtifactScope({
      startDirectory: start, family: artifactDirectory, slug,
      requestedInitiative: values.get('--initiative') ?? '', create: true,
    });
    if (scope.status === 'needs-initiative') {
      const detail = scope.ambiguous ? 'this slug exists under more than one initiative' : 'no initiative selected';
      throw new Error(`${detail}; re-run with --initiative <name> (available: ${scope.available.join(', ') || 'none yet'})`);
    }
    artifactRelative = scope.artifactRelative;
    projectRoot = scope.status === 'project' ? scope.projectRoot : resolveRepositoryArtifactRoot({
      startDirectory: start,
      artifactRelative,
      gitFailureMessage: 'Choose an owning Git repository, or explicitly select a non-Git folder with --project-root.',
    }).repositoryRoot;
  }
  assertProjectBoundary(projectRoot, kind);
  const artifactRoot = inspectArtifactDirectory(projectRoot, artifactRelative);
  const exists = fs.existsSync(artifactRoot);
  if (resume && !exists) throw new Error(`resume requires an existing real ${runName} directory`);
  if (!resume && exists) throw new Error(`${kind} artifact root already exists; use --resume or choose a fresh ${slugName}`);
  if (resume) assertResumeReport(artifactRoot, reportName);
  return { projectRoot, artifactRoot, artifactRelative, slug, resume };
}
