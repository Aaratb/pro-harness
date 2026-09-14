'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const harness = path.resolve(__dirname, '..');
const resolver = path.join(harness, 'scripts', 'resolve-customer-research-root.mjs');
const cleanGitEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

function fixture(run) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'customer-research-root-')));
  try { return run(directory); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function git(directory, args) {
  return childProcess.execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', env: cleanGitEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
}

function invoke(args, { cwd, env = process.env, script = resolver } = {}) {
  const result = childProcess.spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8' });
  let output;
  try { output = JSON.parse(result.stdout); }
  catch { assert.fail(`resolver must return JSON: ${result.stderr || result.stdout}`); }
  return { ...result, output };
}

function reject(args, pattern, options) {
  const result = invoke(args, options);
  assert.notEqual(result.status, 0);
  assert.equal(result.output.status, 'error');
  assert.match(result.output.summary, pattern);
  return result;
}

function snapshot(directory, prefix = '') {
  return fs.readdirSync(directory).sort().flatMap((name) => {
    const file = path.join(directory, name);
    const relative = path.join(prefix, name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return [[relative, 'link', fs.readlinkSync(file)]];
    if (stat.isDirectory()) return [[relative, 'directory'], ...snapshot(file, relative)];
    return [[relative, 'file', fs.readFileSync(file).toString('base64')]];
  });
}

test('Customer research resolves the nearest owning Git repository without filesystem writes', () => fixture((directory) => {
  git(directory, ['init', '-q']);
  const inner = path.join(directory, 'inner');
  fs.mkdirSync(inner);
  git(inner, ['init', '-q']);
  const nested = path.join(inner, 'nested');
  fs.mkdirSync(nested);
  const before = snapshot(directory);
  for (const args of [[], ['--repo-root', nested]]) {
    const result = invoke(['--study-slug', 'retention-1', ...args], { cwd: nested });
    assert.equal(result.status, 0, result.output.summary);
    assert.deepEqual(result.output, {
      status: 'success', project_root: inner,
      artifact_root: path.join(inner, '.agents', 'research', 'retention-1'),
      artifact_relative: '.agents/research/retention-1', study_slug: 'retention-1', created: false, resume: false,
    });
  }
  assert.deepEqual(snapshot(directory), before);
}));

test('Customer research supports linked Git worktrees and ignores inherited Git overrides', () => fixture((directory) => {
  git(directory, ['init', '-q']);
  git(directory, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '--no-gpg-sign', '-qm', 'fixture']);
  const worktree = path.join(directory, 'worktree');
  git(directory, ['worktree', 'add', '-q', '-b', 'research-fixture', worktree]);
  assert.ok(fs.lstatSync(path.join(worktree, '.git')).isFile());
  const nested = path.join(worktree, 'nested');
  fs.mkdirSync(nested);
  const result = invoke(['--repo-root', nested, '--study-slug', 'a'], {
    env: { ...process.env, GIT_DIR: path.join(directory, '.git'), GIT_WORK_TREE: directory, GIT_COMMON_DIR: '/nonexistent' },
  });
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.project_root, worktree);
  assert.equal(fs.existsSync(path.join(worktree, '.agents')), false);
}));

test('Customer research accepts an explicit non-Git project exactly and rejects an orphan default', () => fixture((directory) => {
  const selected = path.join(directory, 'selected project ');
  fs.mkdirSync(selected);
  const before = snapshot(directory);
  reject(['--study-slug', 'study'], /owning Git repository|explicit.*project-root/i, { cwd: selected });
  reject(['--study-slug', 'study', '--repo-root', selected], /owning Git repository|explicit.*project-root/i);
  const result = invoke(['--study-slug', 'study', '--project-root', selected]);
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.project_root, selected);
  assert.equal(result.output.artifact_root, path.join(selected, '.agents', 'research', 'study'));
  assert.deepEqual(snapshot(directory), before);
}));

test('Customer research does not replace an explicitly selected Git subproject with an ancestor', () => fixture((directory) => {
  git(directory, ['init', '-q']);
  const selected = path.join(directory, 'codex');
  fs.mkdirSync(selected);
  const result = invoke(['--project-root', selected, '--study-slug', 'study']);
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.project_root, selected);
}));

test('Customer research rejects malformed, duplicate, incompatible and unknown CLI arguments', () => fixture((directory) => {
  const invalid = [
    [[], /study-slug/],
    [['--study-slug'], /requires a value/],
    [['--study-slug', 'study', '--project-root'], /requires a value/],
    [['--study-slug', 'study', '--bogus'], /unknown argument/],
    [['--study-slug', 'study', '--resume', '--resume'], /duplicate/],
    [['--study-slug', 'a', '--study-slug', 'b'], /duplicate/],
    [['--study-slug', 'a', '--project-root', directory, '--project-root', directory], /duplicate/],
    [['--study-slug', 'a', '--repo-root', directory, '--project-root', directory], /mutually exclusive/],
    [['--study-slug', 'a', '--resume', 'true'], /unknown argument/],
  ];
  for (const slug of ['../escape', '-a', 'a-', 'Upper', 'a_b', 'a.b', 'a/b', 'a\\b', 'a'.repeat(65), 'a\nb']) {
    invalid.push([['--study-slug', slug], /study-slug|control characters/]);
  }
  for (const [args, pattern] of invalid) reject(args, pattern, { cwd: directory });
  const valid = invoke(['--project-root', directory, '--study-slug', 'a'.repeat(64)]);
  assert.equal(valid.status, 0, valid.output.summary);
}));

test('Customer research rejects input and physical path controls without echoing their content', () => fixture((directory) => {
  const controlled = path.join(directory, 'target\nforged-field');
  fs.mkdirSync(controlled);
  for (const args of [['--project-root', controlled], ['--repo-root', controlled], ['--project-root', `${directory}/\t/..`]]) {
    const result = reject(['--study-slug', 'study', ...args], /control characters/);
    assert.doesNotMatch(result.stdout, /forged-field/);
  }
  const result = reject(['--study-slug', 'study'], /control characters/, { cwd: controlled });
  assert.doesNotMatch(result.stdout, /forged-field/);
  assert.deepEqual(fs.readdirSync(controlled), []);
}));

test('Customer research rejects selected root symlinks and linked ancestor components', () => fixture((directory) => {
  const real = path.join(directory, 'real');
  fs.mkdirSync(real);
  fs.mkdirSync(path.join(real, 'nested'));
  const linked = path.join(directory, 'linked');
  fs.symlinkSync(real, linked);
  for (const target of [linked, path.join(linked, 'nested')]) {
    reject(['--project-root', target, '--study-slug', 'study'], /symlink|real directory/);
  }
  assert.equal(fs.existsSync(path.join(real, '.agents')), false);
}));

test('Customer research rejects symlinked artifact components, including dangling links', () => fixture((directory) => {
  const outside = path.join(directory, 'outside');
  fs.mkdirSync(outside);
  for (const component of ['.agents', '.agents/research', '.agents/research/study']) {
    for (const destination of [outside, path.join(outside, 'missing')]) {
      const selected = fs.mkdtempSync(path.join(directory, 'project-'));
      const target = path.join(selected, component);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.symlinkSync(destination, target);
      reject(['--project-root', selected, '--study-slug', 'study'], /symlinked artifact/);
    }
  }
  assert.deepEqual(fs.readdirSync(outside), []);
}));

test('Customer research rejects files at selected and artifact directory positions', () => fixture((directory) => {
  const file = path.join(directory, 'file');
  fs.writeFileSync(file, 'unchanged');
  reject(['--project-root', file, '--study-slug', 'study'], /real directory/);
  for (const component of ['.agents', '.agents/research', '.agents/research/study']) {
    const selected = fs.mkdtempSync(path.join(directory, 'project-'));
    const target = path.join(selected, component);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'unchanged');
    reject(['--project-root', selected, '--study-slug', 'study'], /not a directory/);
    assert.equal(fs.readFileSync(target, 'utf8'), 'unchanged');
  }
}));

test('Customer research only resumes an existing real study directory with a regular research.md', () => fixture((directory) => {
  const args = ['--project-root', directory, '--study-slug', 'study'];
  reject([...args, '--resume'], /resume requires.*existing/i);
  const artifactRoot = path.join(directory, '.agents', 'research', 'study');
  fs.mkdirSync(artifactRoot, { recursive: true });
  reject(args, /already exists/);
  reject([...args, '--resume'], /research.md/);
  const report = path.join(artifactRoot, 'research.md');
  fs.mkdirSync(report);
  reject([...args, '--resume'], /regular file/);
  fs.rmdirSync(report);
  const outside = path.join(directory, 'outside.md');
  fs.writeFileSync(outside, 'Do not alter');
  fs.symlinkSync(outside, report);
  reject([...args, '--resume'], /symlink|regular file/);
  fs.unlinkSync(report);
  fs.writeFileSync(report, 'An existing study. Provenance remains a coordinator check.');
  const before = snapshot(directory);
  const result = invoke([...args, '--resume']);
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.resume, true);
  assert.equal(result.output.created, false);
  assert.equal(result.output.artifact_root, artifactRoot);
  assert.deepEqual(snapshot(directory), before);
}));

test('Customer research rejects home, filesystem, harness and managed installation roots', () => fixture((directory) => {
  const temporaryHome = path.join(directory, 'home');
  fs.mkdirSync(temporaryHome);
  const liveHarness = path.join(temporaryHome, '.pro-harness', 'runtime-adapters');
  fs.mkdirSync(liveHarness, { recursive: true });
  const installed = path.join(directory, 'installed');
  fs.mkdirSync(path.join(installed, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(installed, '.pro-harness-install.json'), '{"schema_version":1}');
  const before = snapshot(directory);
  const options = { env: { ...process.env, HOME: temporaryHome, USERPROFILE: temporaryHome } };
  for (const selected of [temporaryHome, path.parse(directory).root, harness, path.join(harness, 'skills'), liveHarness, installed, path.join(installed, 'nested')]) {
    reject(['--project-root', selected, '--study-slug', 'study'], /home|filesystem|harness|installation/i, options);
  }
  assert.deepEqual(snapshot(directory), before);
}));

test('Customer research CLI resolves through a linked executable without treating it as the project', () => fixture((directory) => {
  const linked = path.join(directory, 'resolve.mjs');
  fs.symlinkSync(resolver, linked);
  const result = invoke(['--project-root', directory, '--study-slug', 'study'], { script: linked });
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.project_root, directory);
  assert.equal(fs.existsSync(path.join(directory, '.agents')), false);
}));
