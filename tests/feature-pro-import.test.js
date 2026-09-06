'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const HARNESS_ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(HARNESS_ROOT, relativePath), 'utf8');
}

test('Feature Pro exposes one canonical public command name', () => {
  const command = read('commands/feature-pro.md');

  assert.match(command, /^name: feature-pro$/m);
  assert.match(command, /^# \/feature-pro\b/m);
  assert.doesNotMatch(command, /^name: flow:feature-pro$/m);
});

test('Feature Pro keeps generated artifacts in the active repository', () => {
  const command = read('commands/feature-pro.md');

  assert.match(command, /## Repository-local artifact root \(mandatory\)/);
  assert.match(command, /\$REPO_ROOT\/\.agents\/features\/<feature-slug>/);
  assert.match(command, /resolve-feature-root\.sh/);
  assert.match(command, /resolver handles worktrees/);
  assert.match(command, /If no Git repository can be resolved, stop/);
  assert.match(command, /If a feature spans multiple repositories/);
  assert.match(command, /\.agents\/features\/<slug>\/reviews\/code-review\.md/);
  assert.match(command, /\.agents\/features\/<slug>\/tests\//);
  assert.match(command, /\.agents\/features\/<slug>\/verification\/setup-audit\.md/);
  assert.match(command, /\.agents\/features\/<slug>\/release\/deployment\.md/);
  assert.doesNotMatch(command, /\.agent_docs/);
  assert.doesNotMatch(command, /\.agents\/codebase-onboarding\.md/);
  assert.doesNotMatch(command, /Copy\/link the gstack design doc/);
});

test('Feature Pro Codex adapter stays thin and points at the canonical command', () => {
  const skill = read('skills/feature-pro/SKILL.md');

  assert.ok(skill.split('\n').length <= 90);
  assert.match(skill, /~\/\.agents\/commands\/feature-pro\.md/);
  assert.match(skill, /~\/\.agents\/scripts\/resolve-feature-root\.sh/);
  assert.match(skill, /~\/\.agents\/scripts\/verify-feature-pro-routing\.sh/);
  assert.equal(fs.existsSync(path.join(HARNESS_ROOT, 'skills', 'feature-pro', 'agents', 'openai.yaml')), false);
});

test('Feature Pro keeps its public shell resolver as a thin Node adapter', () => {
  const shellResolver = read('scripts/resolve-feature-root.sh');
  const nodeResolver = read('scripts/resolve-feature-root.mjs');

  assert.match(shellResolver, /resolve-feature-root\.mjs/);
  assert.match(nodeResolver, /\.\/lib\/repository-artifacts\.mjs/);
});

test('repository resolver selects the nearest Git repository', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-pro-root-'));
  const repository = path.join(temporaryRoot, 'workspace', 'service-a');
  const nestedPath = path.join(repository, 'src', 'feature');
  const resolver = path.join(HARNESS_ROOT, 'scripts', 'resolve-feature-root.sh');

  try {
    fs.mkdirSync(nestedPath, { recursive: true });
    childProcess.execFileSync('git', ['init', '-q', path.join(temporaryRoot, 'workspace')]);
    childProcess.execFileSync('git', ['init', '-q', repository]);

    const output = childProcess.execFileSync(
      'bash',
      [resolver, nestedPath, 'new-billing'],
      { encoding: 'utf8' },
    );
    const physicalRepository = fs.realpathSync(repository);

    assert.equal(output, [
      'status=success',
      'summary=repository-local Feature Pro root resolved',
      `repo_root=${physicalRepository}`,
      `feature_root=${path.join(physicalRepository, '.agents', 'features', 'new-billing')}`,
      '',
    ].join('\n'));
    assert.equal(fs.existsSync(path.join(repository, '.agents')), false, 'resolution must not create artifact directories');
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('repository resolver rejects symlinked and non-directory artifact path components without writing outside the repository', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-pro-contained-'));
  const repository = path.join(temporaryRoot, 'repository');
  const outside = path.join(temporaryRoot, 'outside');
  const resolver = path.join(HARNESS_ROOT, 'scripts', 'resolve-feature-root.sh');

  try {
    fs.mkdirSync(repository, { recursive: true });
    fs.mkdirSync(outside, { recursive: true });
    childProcess.execFileSync('git', ['init', '-q', repository]);
    fs.symlinkSync(outside, path.join(repository, '.agents'));

    const symlink = childProcess.spawnSync('bash', [resolver, repository, 'new-billing'], { encoding: 'utf8' });
    assert.notEqual(symlink.status, 0);
    assert.match(symlink.stderr, /symlinked artifact path component is forbidden: \.agents/);
    assert.deepEqual(fs.readdirSync(outside), []);

    fs.unlinkSync(path.join(repository, '.agents'));
    fs.writeFileSync(path.join(repository, '.agents'), 'not a directory\n');
    const nonDirectory = childProcess.spawnSync('bash', [resolver, repository, 'new-billing'], { encoding: 'utf8' });
    assert.notEqual(nonDirectory.status, 0);
    assert.match(nonDirectory.stderr, /artifact path component is not a directory: \.agents/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('repository resolver refuses orphan workspace output', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-pro-orphan-'));
  const resolver = path.join(HARNESS_ROOT, 'scripts', 'resolve-feature-root.sh');

  try {
    const result = childProcess.spawnSync(
      'bash',
      [resolver, temporaryRoot, 'new-billing'],
      { encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /^status=error$/m);
    assert.match(result.stderr, /no enclosing Git repository was found/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('repository resolver supports Git worktrees with a .git file', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-pro-worktree-'));
  const repository = path.join(temporaryRoot, 'source');
  const worktree = path.join(temporaryRoot, 'worktree');
  const resolver = path.join(HARNESS_ROOT, 'scripts', 'resolve-feature-root.sh');

  try {
    fs.mkdirSync(repository, { recursive: true });
    childProcess.execFileSync('git', ['init', '-q', repository]);
    childProcess.execFileSync('git', ['-C', repository, 'config', 'user.name', 'Feature Pro Test']);
    childProcess.execFileSync('git', ['-C', repository, 'config', 'user.email', 'feature-pro-test@example.invalid']);
    fs.writeFileSync(path.join(repository, 'README.md'), '# fixture\n');
    childProcess.execFileSync('git', ['-C', repository, 'add', 'README.md']);
    childProcess.execFileSync('git', ['-C', repository, 'commit', '-q', '-m', 'fixture']);
    childProcess.execFileSync('git', ['-C', repository, 'worktree', 'add', '-q', '-b', 'feature-pro-test', worktree]);

    assert.ok(fs.statSync(path.join(worktree, '.git')).isFile());

    const output = childProcess.execFileSync(
      'bash',
      [resolver, worktree, 'worktree-feature'],
      { encoding: 'utf8' },
    );
    const physicalWorktree = fs.realpathSync(worktree);

    assert.match(output, new RegExp(`^repo_root=${physicalWorktree.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
    assert.match(output, new RegExp(`^feature_root=${path.join(physicalWorktree, '.agents', 'features', 'worktree-feature').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
