'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const harness = path.resolve(__dirname, '..');
function invoke(args, env = process.env) {
  return childProcess.spawnSync(process.execPath, [path.join(harness, 'scripts', 'resolve-outcome-root.mjs'), ...args], { encoding: 'utf8', env });
}

test('Outcome root is repository-owned, fresh, and resolved without writes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-root-'));
  try {
    childProcess.execFileSync('git', ['init', '-q', root]);
    const nested = path.join(root, 'nested');
    fs.mkdirSync(nested);
    const result = invoke(['--repo-root', nested, '--run-id', 'release-1']);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.repository_root, fs.realpathSync(root));
    assert.equal(output.artifact_root, path.join(fs.realpathSync(root), '.agents', 'outcomes', 'release-1'));
    assert.equal(fs.existsSync(path.join(root, '.agents')), false);
    fs.mkdirSync(output.artifact_root, { recursive: true });
    fs.writeFileSync(path.join(output.artifact_root, 'outcome.md'), 'previous assessment');
    const duplicate = invoke(['--repo-root', root, '--run-id', 'release-1']);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stdout, /already exists/);
    assert.equal(fs.readFileSync(path.join(output.artifact_root, 'outcome.md'), 'utf8'), 'previous assessment');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Outcome root rejects orphan, unsafe selectors, duplicate flags and symlink escapes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-root-invalid-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-root-outside-'));
  try {
    const orphan = invoke(['--repo-root', root, '--run-id', 'run']);
    assert.notEqual(orphan.status, 0);
    assert.match(orphan.stdout, /owning Git repository/);
    childProcess.execFileSync('git', ['init', '-q', root]);
    for (const args of [['--run-id', '../escape'], ['--run-id', 'one', '--run-id', 'two'], ['--unknown', 'x'], ['--run-id']]) {
      const invalid = invoke(['--repo-root', root, ...args]);
      assert.notEqual(invalid.status, 0);
      assert.match(invalid.stdout, /run-id must|duplicate|unknown argument|requires a value/);
    }
    fs.symlinkSync(outside, path.join(root, '.agents'));
    const escaped = invoke(['--repo-root', root, '--run-id', 'run']);
    assert.notEqual(escaped.status, 0);
    assert.match(escaped.stdout, /symlinked artifact path/);
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('Outcome root ignores inherited Git overrides and works through a linked CLI', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-root-linked-'));
  try {
    childProcess.execFileSync('git', ['init', '-q', root]);
    const linked = path.join(root, 'resolve.mjs');
    fs.symlinkSync(path.join(harness, 'scripts', 'resolve-outcome-root.mjs'), linked);
    const output = childProcess.spawnSync(process.execPath, [linked, '--repo-root', root, '--run-id', 'linked'], {
      encoding: 'utf8', env: { ...process.env, GIT_DIR: '/nonexistent-git', GIT_WORK_TREE: '/nonexistent-tree' },
    });
    assert.equal(output.status, 0, output.stderr || output.stdout);
    assert.equal(JSON.parse(output.stdout).repository_root, fs.realpathSync(root));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Outcome runs reuse the shared trace without introducing state', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-trace-'));
  try {
    for (const event of ['run-started', 'run-completed']) {
      const output = childProcess.spawnSync(process.execPath, [path.join(harness, 'scripts', 'record-workflow-event.mjs'),
        '--artifact-root', root, '--workflow', 'outcome-pro', '--run-id', 'outcome-1', '--event', event,
        '--summary', 'Checked supplied aggregate outcome evidence', '--status', 'passed'], { encoding: 'utf8' });
      assert.equal(output.status, 0, output.stdout);
    }
    const verified = childProcess.spawnSync(process.execPath, [path.join(harness, 'scripts', 'validate-workflow-trace.mjs'),
      '--artifact-root', root, '--workflow', 'outcome-pro', '--run-id', 'outcome-1'], { encoding: 'utf8' });
    assert.equal(verified.status, 0, verified.stdout);
    assert.equal(fs.existsSync(path.join(root, 'state.json')), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
