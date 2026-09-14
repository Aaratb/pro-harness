'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const harness = path.resolve(__dirname, '..');
const resolver = path.join(harness, 'scripts', 'resolve-roadmap-root.mjs');
const cleanGitEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

function fixture(run) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'roadmap-root-')));
  try { return run(directory); }
  finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

function git(directory, args) {
  return childProcess.execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', env: cleanGitEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
}

function invoke(args, { cwd, env = process.env } = {}) {
  const result = childProcess.spawnSync(process.execPath, [resolver, ...args], { cwd, env, encoding: 'utf8' });
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

test('Roadmap resolves the nearest Git root, including unborn repositories, without writes', () => fixture((directory) => {
  git(directory, ['init', '-q']);
  git(directory, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '--no-gpg-sign', '-qm', 'fixture']);
  const inner = path.join(directory, 'inner'); fs.mkdirSync(inner); git(inner, ['init', '-q']);
  const nested = path.join(inner, 'nested'); fs.mkdirSync(nested);
  const before = snapshot(directory);
  for (const [args, cwd, expected] of [
    [[], directory, directory], [[], nested, inner], [['--repo-root', nested], directory, inner],
  ]) {
    const result = invoke(['--roadmap-slug', 'growth-1', ...args], { cwd });
    assert.equal(result.status, 0, result.output.summary);
    assert.deepEqual(result.output, {
      status: 'success', project_root: expected,
      artifact_root: path.join(expected, '.agents', 'roadmaps', 'growth-1'),
      artifact_relative: '.agents/roadmaps/growth-1', roadmap_slug: 'growth-1', created: false, resume: false,
    });
  }
  assert.throws(() => git(inner, ['rev-parse', '--verify', 'HEAD']));
  assert.deepEqual(snapshot(directory), before);
}));

test('Roadmap accepts only an explicit non-Git project and preserves an exact selected subproject', () => fixture((directory) => {
  const selected = path.join(directory, 'selected project '); fs.mkdirSync(selected);
  const before = snapshot(directory);
  reject(['--roadmap-slug', 'growth'], /owning Git repository|explicit.*project-root/i, { cwd: selected });
  reject(['--roadmap-slug', 'growth', '--repo-root', selected], /owning Git repository|explicit.*project-root/i);
  const result = invoke(['--roadmap-slug', 'growth', '--project-root', selected]);
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.project_root, selected);
  assert.equal(result.output.artifact_root, path.join(selected, '.agents/roadmaps/growth'));
  assert.deepEqual(snapshot(directory), before);
  git(directory, ['init', '-q']);
  assert.equal(invoke(['--roadmap-slug', 'growth', '--project-root', selected]).output.project_root, selected);
}));

test('Roadmap rejects unsafe slugs and malformed, duplicate, or incompatible arguments', () => fixture((directory) => {
  const invalid = [
    [[], /roadmap-slug/], [['--roadmap-slug'], /requires a value/],
    [['--roadmap-slug', 'growth', '--project-root'], /requires a value/],
    [['--roadmap-slug', 'growth', '--bogus'], /unknown argument/],
    [['--roadmap-slug', 'growth', '--resume', '--resume'], /duplicate/],
    [['--roadmap-slug', 'a', '--roadmap-slug', 'b'], /duplicate/],
    [['--roadmap-slug', 'a', '--project-root', directory, '--project-root', directory], /duplicate/],
    [['--roadmap-slug', 'a', '--repo-root', directory, '--project-root', directory], /mutually exclusive/],
    [['--roadmap-slug', 'a', '--resume', 'true'], /unknown argument/],
  ];
  for (const slug of ['../escape', '-a', 'a-', 'Upper', 'a_b', 'a.b', 'a/b', 'a\\b', 'a'.repeat(65), 'a\nb']) {
    invalid.push([['--roadmap-slug', slug], /roadmap-slug|control characters/]);
  }
  const before = snapshot(directory);
  for (const [args, pattern] of invalid) reject(args, pattern, { cwd: directory });
  assert.equal(invoke(['--project-root', directory, '--roadmap-slug', 'a'.repeat(64)]).status, 0);
  assert.deepEqual(snapshot(directory), before);
}));

test('Roadmap rejects linked selected roots and linked artifact components without following them', () => fixture((directory) => {
  const outside = path.join(directory, 'outside'); fs.mkdirSync(path.join(outside, 'nested'), { recursive: true });
  const linked = path.join(directory, 'linked'); fs.symlinkSync(outside, linked);
  for (const target of [linked, path.join(linked, 'nested'), `${linked}/..`]) {
    reject(['--project-root', target, '--roadmap-slug', 'growth'], /symlink|real directory/);
  }
  for (const component of ['.agents', '.agents/roadmaps', '.agents/roadmaps/growth']) {
    for (const destination of [outside, path.join(outside, 'missing')]) {
      const selected = fs.mkdtempSync(path.join(directory, 'project-'));
      const target = path.join(selected, component); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.symlinkSync(destination, target);
      reject(['--project-root', selected, '--roadmap-slug', 'growth'], /symlinked artifact/);
    }
  }
  assert.deepEqual(fs.readdirSync(outside), ['nested']);
  assert.deepEqual(fs.readdirSync(path.join(outside, 'nested')), []);
}));

test('Roadmap resume requires an existing real root and regular roadmap.md without modifying either', () => fixture((directory) => {
  const args = ['--project-root', directory, '--roadmap-slug', 'growth'];
  reject([...args, '--resume'], /resume requires.*existing/i);
  const artifactRoot = path.join(directory, '.agents/roadmaps/growth'); fs.mkdirSync(artifactRoot, { recursive: true });
  reject(args, /already exists/); reject([...args, '--resume'], /roadmap.md/);
  const report = path.join(artifactRoot, 'roadmap.md'); fs.mkdirSync(report);
  reject([...args, '--resume'], /regular file/); fs.rmdirSync(report);
  const outside = path.join(directory, 'outside.md'); fs.writeFileSync(outside, 'Preserve'); fs.symlinkSync(outside, report);
  reject([...args, '--resume'], /symlink|regular file/); fs.unlinkSync(report);
  fs.writeFileSync(report, '# Roadmap\nExisting decisions and evidence.');
  const before = snapshot(directory);
  const result = invoke([...args, '--resume']);
  assert.equal(result.status, 0, result.output.summary);
  assert.equal(result.output.resume, true); assert.equal(result.output.created, false);
  assert.equal(result.output.artifact_root, artifactRoot);
  assert.deepEqual(snapshot(directory), before);
}));

test('Roadmap retains shared home, filesystem, harness and runtime-root protections', () => fixture((directory) => {
  const temporaryHome = path.join(directory, 'home'); fs.mkdirSync(temporaryHome);
  const runtimeRoot = path.join(temporaryHome, '.pro-harness/runtime-adapters'); fs.mkdirSync(runtimeRoot, { recursive: true });
  const installed = path.join(directory, 'installed'); fs.mkdirSync(path.join(installed, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(installed, '.pro-harness-install.json'), '{"schema_version":1}');
  const before = snapshot(directory);
  const options = { env: { ...process.env, HOME: temporaryHome, USERPROFILE: temporaryHome } };
  for (const selected of [temporaryHome, path.parse(directory).root, harness, path.join(harness, 'skills'), runtimeRoot, installed, path.join(installed, 'nested')]) {
    reject(['--project-root', selected, '--roadmap-slug', 'growth'], /home|filesystem|harness|installation/i, options);
  }
  assert.deepEqual(snapshot(directory), before);
}));

test('Roadmap rejects control-character paths without echoing their content', () => fixture((directory) => {
  const controlled = path.join(directory, 'target\nforged-field'); fs.mkdirSync(controlled);
  for (const args of [['--project-root', controlled], ['--repo-root', controlled], ['--project-root', `${directory}/\t/..`]]) {
    const result = reject(['--roadmap-slug', 'growth', ...args], /control characters/);
    assert.doesNotMatch(result.stdout, /forged-field/);
  }
  reject(['--roadmap-slug', 'growth'], /control characters/, { cwd: controlled });
  assert.deepEqual(fs.readdirSync(controlled), []);
}));
