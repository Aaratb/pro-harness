'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const harness = path.resolve(__dirname, '..');
const cleanGitEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

const discovery = () => import(`file://${path.join(harness, 'scripts', 'lib', 'project-discovery.mjs')}`);
const artifacts = () => import(`file://${path.join(harness, 'scripts', 'lib', 'repository-artifacts.mjs')}`);

// Async-aware: a synchronous `finally` would delete the tree before the awaited body ran.
async function fixture(run) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'project-discovery-')));
  try { return await run(directory); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function git(directory, args) {
  return childProcess.execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', env: cleanGitEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
}

/** A workspace whose initiative tree sits beside a nested service clone. */
function workspace(root, { marker = { schema_version: 1, projects_root: 'Product' }, initiatives = ['alpha'] } = {}) {
  const workspaceRoot = path.join(root, 'Workspace');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  git(workspaceRoot, ['init', '--quiet']);
  if (marker) fs.writeFileSync(path.join(workspaceRoot, '.pro-harness-projects.json'), `${JSON.stringify(marker, null, 2)}\n`);
  for (const initiative of initiatives) fs.mkdirSync(path.join(workspaceRoot, 'Product', initiative), { recursive: true });
  const clone = path.join(workspaceRoot, 'service-repo');
  fs.mkdirSync(clone, { recursive: true });
  git(clone, ['init', '--quiet']);
  return { workspaceRoot, clone };
}

test('discovery walks through a nested repository boundary that git cannot cross', async () => {
  await fixture(async (root) => {
    const { workspaceRoot, clone } = workspace(root);
    const { discoverWorkspace } = await discovery();

    // git stops at the nested clone; that is exactly why the walk is filesystem-based.
    assert.equal(git(clone, ['rev-parse', '--show-toplevel']).trim(), clone);

    const found = discoverWorkspace(clone);
    assert.equal(found.workspaceRoot, workspaceRoot);
    assert.equal(found.projectsRoot, path.join(workspaceRoot, 'Product'));
  });
});

test('no marker means no workspace, so callers keep their repository-owned behavior', async () => {
  await fixture(async (root) => {
    const { clone } = workspace(root, { marker: null });
    const { discoverWorkspace } = await discovery();
    assert.equal(discoverWorkspace(clone), null);
  });
});

test('a managed harness installation is never treated as a workspace', async () => {
  await fixture(async (root) => {
    const { workspaceRoot, clone } = workspace(root);
    fs.writeFileSync(path.join(workspaceRoot, '.pro-harness-install.json'), '{}\n');
    const { discoverWorkspace } = await discovery();
    assert.equal(discoverWorkspace(clone), null);
  });
});

test('a malformed or unsafe marker is rejected rather than silently ignored', async () => {
  await fixture(async (root) => {
    const { discoverWorkspace } = await discovery();
    for (const [marker, pattern] of [
      [{ projects_root: 'Product' }, /schema_version/],
      [{ schema_version: 1 }, /projects_root/],
      [{ schema_version: 1, projects_root: '../outside' }, /parent, or empty path components/],
      [{ schema_version: 1, projects_root: '/absolute' }, /absolute paths are forbidden/],
    ]) {
      const { clone } = workspace(fs.mkdtempSync(path.join(root, 'case-')), { marker });
      assert.throws(() => discoverWorkspace(clone), pattern);
    }
  });
});

test('the slug scan answers cold resume without a second state file', async () => {
  await fixture(async (root) => {
    const { workspaceRoot, clone } = workspace(root, { initiatives: ['alpha', 'beta'] });
    const { discoverWorkspace, findInitiativesHoldingSlug } = await discovery();
    const found = discoverWorkspace(clone);
    const scan = (slug) => findInitiativesHoldingSlug({ projectsRoot: found.projectsRoot, family: 'features', slug });

    assert.deepEqual(scan('demo-feature'), [], 'unknown slug is a fresh run');

    fs.mkdirSync(path.join(workspaceRoot, 'Product', 'alpha', 'features', 'demo-feature'), { recursive: true });
    assert.deepEqual(scan('demo-feature'), ['alpha'], 'one match resumes without asking');

    fs.mkdirSync(path.join(workspaceRoot, 'Product', 'beta', 'features', 'demo-feature'), { recursive: true });
    assert.deepEqual(scan('demo-feature'), ['alpha', 'beta'], 'two matches must be disambiguated');
  });
});

test('artifacts compose beside the initiative while containment still holds', async () => {
  await fixture(async (root) => {
    const { workspaceRoot, clone } = workspace(root);
    const { discoverWorkspace, projectRootFor } = await discovery();
    const { resolveRepositoryArtifactRoot } = await artifacts();
    const found = discoverWorkspace(clone);
    const projectRoot = projectRootFor({ workspace: found, initiative: 'alpha' });

    const resolved = resolveRepositoryArtifactRoot({
      startDirectory: clone,
      artifactRelative: 'features/demo',
      rootOverride: projectRoot,
      containmentRoot: found.workspaceRoot,
    });
    assert.equal(resolved.artifactRoot, path.join(workspaceRoot, 'Product', 'alpha', 'features', 'demo'));

    // The security property is preserved, not traded away: a root outside the declared
    // workspace is refused, and so is a relative path that climbs out of the project.
    assert.throws(() => resolveRepositoryArtifactRoot({
      startDirectory: clone, artifactRelative: 'features/demo',
      rootOverride: root, containmentRoot: found.workspaceRoot,
    }), /declared workspace does not contain/);

    assert.throws(() => resolveRepositoryArtifactRoot({
      startDirectory: clone, artifactRelative: '../../escape',
      rootOverride: projectRoot, containmentRoot: found.workspaceRoot,
    }), /parent, or empty path components/);
  });
});

test('repository-owned resolution is unchanged when no override is supplied', async () => {
  await fixture(async (root) => {
    const { clone } = workspace(root);
    const { resolveRepositoryArtifactRoot } = await artifacts();
    const resolved = resolveRepositoryArtifactRoot({ startDirectory: clone, artifactRelative: '.agents/explanations/demo' });
    assert.equal(resolved.repositoryRoot, clone);
    assert.equal(resolved.artifactRoot, path.join(clone, '.agents', 'explanations', 'demo'));
  });
});
