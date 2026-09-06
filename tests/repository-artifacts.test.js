'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');

test('repository resolvers ignore inherited Git repository-selection overrides', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-git-env-'));
  const targetRepository = path.join(temporaryRoot, 'target');
  const overrideRepository = path.join(temporaryRoot, 'override');
  const featureResolver = path.join(ROOT, 'scripts', 'resolve-feature-root.sh');
  const architectureResolver = path.join(ROOT, 'scripts', 'resolve-architecture-root.mjs');

  try {
    childProcess.execFileSync('git', ['init', '-q', targetRepository]);
    childProcess.execFileSync('git', ['init', '-q', overrideRepository]);
    const environment = {
      ...process.env,
      GIT_DIR: path.join(overrideRepository, '.git'),
      GIT_WORK_TREE: overrideRepository,
    };

    const feature = childProcess.execFileSync('bash', [featureResolver, targetRepository, 'safe-feature'], {
      encoding: 'utf8',
      env: environment,
    });
    assert.match(feature, new RegExp(`^repo_root=${escapeRegex(fs.realpathSync(targetRepository))}$`, 'm'));

    const architecture = JSON.parse(childProcess.execFileSync(process.execPath, [
      architectureResolver,
      '--repo', targetRepository,
      '--slug', 'safe-system',
      '--create',
    ], { encoding: 'utf8', env: environment }));
    assert.equal(architecture.repository_root, fs.realpathSync(targetRepository));
    assert.equal(fs.existsSync(path.join(targetRepository, '.agents', 'architecture', 'safe-system')), true);
    assert.equal(fs.existsSync(path.join(overrideRepository, '.agents')), false);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('repository resolvers reject control-character roots without forging output fields', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-control-path-'));
  const repository = path.join(temporaryRoot, 'repository\nsummary=forged');
  const featureResolver = path.join(ROOT, 'scripts', 'resolve-feature-root.sh');
  const architectureResolver = path.join(ROOT, 'scripts', 'resolve-architecture-root.mjs');

  try {
    childProcess.execFileSync('git', ['init', '-q', repository]);
    const feature = childProcess.spawnSync('bash', [featureResolver, repository, 'safe-feature'], { encoding: 'utf8' });
    assert.notEqual(feature.status, 0);
    assert.equal(feature.stdout, '');
    assert.doesNotMatch(feature.stderr, /summary=forged/);
    assert.match(feature.stderr, /target path contains control characters/);

    const architecture = childProcess.spawnSync(process.execPath, [
      architectureResolver,
      '--repo', repository,
      '--slug', 'safe-system',
      '--create',
    ], { encoding: 'utf8' });
    assert.notEqual(architecture.status, 0);
    assert.doesNotMatch(architecture.stdout, /summary=forged/);
    assert.equal(fs.existsSync(path.join(repository, '.agents')), false);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('repository discovery preserves trailing spaces in physical roots', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-space-path-'));
  const repository = path.join(temporaryRoot, 'repository ');
  const resolver = path.join(ROOT, 'scripts', 'resolve-feature-root.sh');

  try {
    childProcess.execFileSync('git', ['init', '-q', repository]);
    const output = childProcess.execFileSync('bash', [resolver, repository, 'safe-feature'], { encoding: 'utf8' });
    assert.match(output, new RegExp(`^repo_root=${escapeRegex(fs.realpathSync(repository))}$`, 'm'));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('Feature Pro resolves a file symlink through its physical target repository', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-file-link-'));
  const linkRepository = path.join(temporaryRoot, 'link-repository');
  const targetRepository = path.join(temporaryRoot, 'target-repository');
  const targetFile = path.join(targetRepository, 'target.js');
  const linkedFile = path.join(linkRepository, 'linked.js');
  const resolver = path.join(ROOT, 'scripts', 'resolve-feature-root.sh');

  try {
    childProcess.execFileSync('git', ['init', '-q', linkRepository]);
    childProcess.execFileSync('git', ['init', '-q', targetRepository]);
    fs.writeFileSync(targetFile, 'export {};\n');
    fs.symlinkSync(targetFile, linkedFile);

    const output = childProcess.execFileSync('bash', [resolver, linkedFile, 'safe-feature'], { encoding: 'utf8' });
    assert.match(output, new RegExp(`^repo_root=${escapeRegex(fs.realpathSync(targetRepository))}$`, 'm'));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('repository resolver rejects a reported Git root outside the requested target', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-harness-git-containment-'));
  const targetDirectory = path.join(temporaryRoot, 'target');
  const reportedRepository = path.join(temporaryRoot, 'reported');
  const fakeBin = path.join(temporaryRoot, 'bin');
  const fakeGit = path.join(fakeBin, 'git');
  const resolver = path.join(ROOT, 'scripts', 'resolve-architecture-root.mjs');

  try {
    fs.mkdirSync(targetDirectory);
    fs.mkdirSync(reportedRepository);
    fs.mkdirSync(fakeBin);
    fs.writeFileSync(fakeGit, '#!/bin/sh\nprintf \'%s\\n\' "$PRO_HARNESS_FAKE_ROOT"\n');
    fs.chmodSync(fakeGit, 0o755);

    const result = childProcess.spawnSync(process.execPath, [
      resolver,
      '--repo', targetDirectory,
      '--slug', 'safe-system',
      '--create',
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
        PRO_HARNESS_FAKE_ROOT: reportedRepository,
      },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /resolved Git repository does not contain the target path/);
    assert.equal(fs.existsSync(path.join(targetDirectory, '.agents')), false);
    assert.equal(fs.existsSync(path.join(reportedRepository, '.agents')), false);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
