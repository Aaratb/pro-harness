'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const test = require('node:test');
const harness = path.resolve(__dirname, '..');
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'local-review-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const helpers = () => import('../scripts/lib/local-directory.mjs');

test('explicit local roots stay inside the selected project despite an unrelated Git ancestor', t => {
  const ancestor = fixture(t);
  execFileSync('git', ['init', '-q', ancestor]);
  const root = path.join(ancestor, 'standalone'); fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'app.js'), 'export const value = 1;');
  for (const command of ['review', 'debug']) {
    const result = spawnSync(process.execPath, [path.join(harness, 'scripts', `resolve-${command}-root.mjs`), '--repo', root, '--slug', 'local-check', '--local', '--create'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.repository_root, root);
    assert.equal(output.artifact_root, path.join(root, '.agents', command === 'review' ? 'reviews' : 'debug', 'local-check'));
  }
  assert.equal(fs.existsSync(path.join(ancestor, '.agents')), false);
});

test('local snapshot binds exact scope, bytes, modes, additions and deletions', async t => {
  const { captureLocalDirectory, digestLocalDirectory } = await helpers();
  const root = fixture(t); fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'original');
  fs.writeFileSync(path.join(root, 'outside.txt'), 'outside');
  const first = captureLocalDirectory(root, ['src']);
  assert.deepEqual(first.files, ['src/app.js']);
  assert.equal(first.digest, digestLocalDirectory(first.entries, ['src'], root));
  assert.notEqual(first.digest, captureLocalDirectory(root, ['src/app.js']).digest);
  fs.writeFileSync(path.join(root, 'outside.txt'), 'not claimed as coverage');
  assert.equal(first.digest, captureLocalDirectory(root, ['src']).digest);
  fs.chmodSync(path.join(root, 'src', 'app.js'), 0o755);
  assert.notEqual(first.digest, captureLocalDirectory(root, ['src']).digest);
  fs.writeFileSync(path.join(root, 'src', 'new.js'), 'new');
  assert.deepEqual(captureLocalDirectory(root, ['src']).files, ['src/app.js', 'src/new.js']);
  fs.unlinkSync(path.join(root, 'src', 'app.js'));
  assert.notEqual(first.digest, captureLocalDirectory(root, ['src']).digest);
  const missing = captureLocalDirectory(root, ['src/app.js']);
  assert.equal(missing.entries[0].kind, 'missing');
  assert.notEqual(first.digest, missing.digest);
});

test('local scope refuses broad roots, metadata, overlap, traversal and symlink parents', async t => {
  const { normalizeLocalScope, resolveLocalProjectRoot, captureLocalDirectory } = await helpers();
  const root = fixture(t);
  for (const scope of [[], ['.'], ['../secret'], ['/tmp'], ['a', 'a/b'], ['a', 'a'], ['.git/config'], ['a\n']]) assert.throws(() => normalizeLocalScope(scope));
  assert.throws(() => resolveLocalProjectRoot(path.parse(root).root), /root/i);
  assert.throws(() => resolveLocalProjectRoot(os.homedir()), /home/i);
  fs.symlinkSync(root, path.join(root, 'alias'));
  assert.throws(() => resolveLocalProjectRoot(path.join(root, 'alias')), /symlink/i);
  assert.throws(() => captureLocalDirectory(root, ['alias/file']), /symlink/i);
  fs.mkdirSync(path.join(root, '.git'));
  assert.throws(() => captureLocalDirectory(root, ['missing.js']), /Git/i);
});

test('local snapshot excludes only exact run artifacts and never follows link targets', async t => {
  const { captureLocalDirectory } = await helpers();
  const root = fixture(t);
  fs.mkdirSync(path.join(root, '.agents', 'reviews', 'current'), { recursive: true });
  fs.mkdirSync(path.join(root, '.agents', 'reviews', 'other'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agents', 'reviews', 'current', 'intake.json'), 'current');
  fs.writeFileSync(path.join(root, '.agents', 'reviews', 'other', 'report.md'), 'other');
  const outside = fixture(t); fs.writeFileSync(path.join(outside, 'secret'), 'not read');
  fs.symlinkSync(path.join(outside, 'secret'), path.join(root, 'linked'));
  const result = captureLocalDirectory(root, ['.agents', 'linked'], ['.agents/reviews/current']);
  assert.deepEqual(result.files, ['.agents/reviews/other/report.md', 'linked']);
  assert.equal(result.entries[1].kind, 'symlink');
  fs.writeFileSync(path.join(outside, 'secret'), 'still not read');
  assert.equal(result.digest, captureLocalDirectory(root, ['.agents', 'linked'], ['.agents/reviews/current']).digest);
  assert.throws(() => captureLocalDirectory(root, ['.agents'], ['.agents']), /exclusion/i);
});

test('local snapshot exposes unhashable content and rejects nested Git projects', async t => {
  const { captureLocalDirectory } = await helpers();
  const root = fixture(t); fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'large'), Buffer.alloc(4 * 1024 * 1024 + 1));
  const result = captureLocalDirectory(root, ['src']);
  assert.ok(result.evidence_gaps.length);
  assert.equal(result.entries[0].kind, 'oversized-file');
  fs.mkdirSync(path.join(root, 'src', '.git'));
  assert.throws(() => captureLocalDirectory(root, ['src']), /nested.*Git/i);
  assert.throws(() => captureLocalDirectory(root, ['src/large']), /nested.*Git/i);
});

test('local inventory preserves BOM-prefixed filenames and hashes their actual bytes', async t => {
  const { captureLocalDirectory } = await helpers();
  const root = fixture(t); fs.mkdirSync(path.join(root, 'src'));
  const name = '\uFEFFhidden.js';
  fs.writeFileSync(path.join(root, 'src', name), 'first');
  const first = captureLocalDirectory(root, ['src']);
  assert.deepEqual(first.files, [`src/${name}`]);
  assert.equal(first.entries[0].kind, 'file');
  fs.writeFileSync(path.join(root, 'src', name), 'second');
  assert.notEqual(first.digest, captureLocalDirectory(root, ['src']).digest);
});
