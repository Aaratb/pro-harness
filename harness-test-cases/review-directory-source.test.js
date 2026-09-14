'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const source = import('../scripts/review-source.mjs');

function fixture(t, ancestor = false) {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pro-review-directory-')));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  if (ancestor) execFileSync('git', ['-C', sandbox, 'init', '-q']);
  const project = path.join(sandbox, 'project');
  const artifacts = path.join(project, '.agents/reviews/local');
  fs.mkdirSync(artifacts, { recursive: true });
  fs.mkdirSync(path.join(project, 'src'));
  fs.writeFileSync(path.join(project, 'src/app.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(project, 'outside.txt'), 'Outside selected review scope.\n');
  return { project, artifacts, write: (name, bytes) => fs.writeFileSync(path.join(project, name), bytes) };
}

test('explicit local review captures the selected non-Git directory without ancestor ownership', async t => {
  const { captureReviewSource } = await source;
  for (const ancestor of [false, true]) {
    const f = fixture(t, ancestor);
    const intake = captureReviewSource({ repositoryRoot: f.project, artifactRoot: f.artifacts, local: true, localScope: ['src'], write: false });
    assert.equal(intake.comparison, 'local-directory');
    assert.equal(intake.repository_root, fs.realpathSync(f.project));
    assert.equal(intake.base_sha, null); assert.equal(intake.reviewed_head_sha, null);
    assert.deepEqual(intake.local_scope, ['src']);
    assert.deepEqual(intake.changed_files, ['src/app.js']);
    assert.equal(intake.diff_digest, intake.workspace_digest);
    assert.equal(fs.existsSync(path.join(f.project, '.git')), false);
    assert.equal(fs.existsSync(path.join(f.artifacts, 'intake.json')), false);
  }
});

test('directory review freshness binds selected contents, additions, removals, modes and scope', async t => {
  const { captureReviewSource } = await source; const f = fixture(t);
  const capture = (scope = ['src']) => captureReviewSource({ repositoryRoot: f.project, artifactRoot: f.artifacts, local: true, localScope: scope, write: false });
  const original = capture(); f.write('outside.txt', 'Unrelated local work.');
  assert.equal(capture().diff_digest, original.diff_digest);
  f.write('src/app.js', 'Changed source.'); assert.notEqual(capture().diff_digest, original.diff_digest);
  const edited = capture(); f.write('src/new.js', 'New source.'); assert.notEqual(capture().diff_digest, edited.diff_digest);
  const added = capture(); fs.unlinkSync(path.join(f.project, 'src/new.js')); assert.notEqual(capture().diff_digest, added.diff_digest);
  const plain = capture(); fs.chmodSync(path.join(f.project, 'src/app.js'), 0o755); assert.notEqual(capture().diff_digest, plain.diff_digest);
  assert.notEqual(capture(['src/app.js']).diff_digest, capture().diff_digest, 'scope identity must differ even with equal file inventory');
});

test('local capture requires explicit selection and refuses Git comparison flags', async t => {
  const { captureReviewSource } = await source; const f = fixture(t);
  const args = { repositoryRoot: f.project, artifactRoot: f.artifacts, local: true, localScope: ['src'], write: false };
  assert.throws(() => captureReviewSource({ ...args, local: false }), /local|Git|git|repository/);
  for (const override of [{ localScope: undefined }, { localScope: [] }, { base: 'HEAD' }, { head: 'main' }, { working: true }]) {
    assert.throws(() => captureReviewSource({ ...args, ...override }), /local|scope|base|head|working/i);
  }
  execFileSync('git', ['-C', f.project, 'init', '-q']);
  assert.throws(() => captureReviewSource(args), /Git|git/);
});

test('local snapshot excludes exact active artifact roots without hiding sibling source', async t => {
  const { captureReviewSource } = await source; const f = fixture(t);
  const args = { repositoryRoot: f.project, artifactRoot: f.artifacts, local: true, localScope: ['.agents', 'src'], write: false };
  const original = captureReviewSource(args);
  fs.writeFileSync(path.join(f.artifacts, 'report.md'), 'Permitted review artifact.');
  assert.equal(captureReviewSource(args).diff_digest, original.diff_digest);
  f.write('.agents/rules.md', 'Source, not this review output.');
  assert.notEqual(captureReviewSource(args).diff_digest, original.diff_digest);
  const debug = path.join(f.project, '.agents/debug/repair'); fs.mkdirSync(debug, { recursive: true });
  const before = captureReviewSource({ ...args, excludeDebugRoot: debug });
  fs.writeFileSync(path.join(debug, 'context.json'), '{}');
  assert.equal(captureReviewSource({ ...args, excludeDebugRoot: debug }).diff_digest, before.diff_digest);
  assert.throws(() => captureReviewSource({ ...args, excludeDebugRoot: debug, write: true }), /read-only/);
});

test('named missing paths remain bound and symlink targets are never read', async t => {
  const { captureReviewSource } = await source; const f = fixture(t);
  fs.symlinkSync('/does/not/exist', path.join(f.project, 'src/link'));
  const args = { repositoryRoot: f.project, artifactRoot: f.artifacts, local: true, localScope: ['missing.js', 'src'], write: false };
  const original = captureReviewSource(args);
  assert.ok(original.changed_files.includes('missing.js'));
  assert.ok(original.changed_files.includes('src/link'));
  f.write('missing.js', 'Now present.'); assert.notEqual(captureReviewSource(args).diff_digest, original.diff_digest);
});
