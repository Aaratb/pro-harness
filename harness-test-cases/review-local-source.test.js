const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const source = import('../scripts/review-source.mjs');
function fixture(t) {
  const repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-local-source-')));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', repo, '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  const root = path.join(repo, '.agents/reviews/local'); fs.mkdirSync(root, { recursive: true });
  return { repo, root, git, write: (file, value) => fs.writeFileSync(path.join(repo, file), value) };
}

test('working review defaults to local HEAD without an upstream', async (t) => {
  const { captureReviewSource } = await source; const f = fixture(t);
  f.write('app.js', 'original'); f.git('add', 'app.js'); f.git('commit', '-qm', 'initial');
  f.write('app.js', 'local');
  const intake = captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true });
  assert.equal(intake.base_sha, f.git('rev-parse', 'HEAD'));
  assert.equal(intake.comparison, 'working-tree'); assert.deepEqual(intake.changed_files, ['app.js']);
});

test('local review includes staged-only changes and untracked executable-mode drift', async (t) => {
  const { captureReviewSource } = await source; const f = fixture(t);
  f.write('app', 'original'); f.git('add', 'app'); f.git('commit', '-qm', 'initial');
  const capture = () => captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true, write: false });
  const original = capture(); f.write('app', 'staged'); f.git('add', 'app'); f.write('app', 'original');
  const staged = capture(); assert.deepEqual(staged.changed_files, ['app']); assert.notEqual(staged.diff_digest, original.diff_digest);
  f.write('script.sh', 'echo test'); const plain = capture(); fs.chmodSync(path.join(f.repo, 'script.sh'), 0o755);
  assert.notEqual(capture().diff_digest, plain.diff_digest);
  assert.notEqual(capture().workspace_digest, plain.workspace_digest);
});

test('capture does not execute configured clean or process filters or mutate Git configuration', async (t) => {
  const { captureReviewSource } = await source; const f = fixture(t);
  f.write('app', 'original'); f.git('add', 'app'); f.git('commit', '-qm', 'initial');
  f.write('.gitattributes', 'app filter=sentinel\n'); f.write('app', 'changed');
  f.git('config', 'filter.sentinel.clean', 'touch .git/filter-ran; cat');
  f.git('config', 'filter.sentinel.process', 'touch .git/process-ran; exit 1');
  const config = fs.readFileSync(path.join(f.repo, '.git/config'));
  captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true, write: false });
  assert.equal(fs.existsSync(path.join(f.repo, '.git/filter-ran')), false);
  assert.equal(fs.existsSync(path.join(f.repo, '.git/process-ran')), false);
  assert.deepEqual(fs.readFileSync(path.join(f.repo, '.git/config')), config);
});

test('unborn review hashes staged and untracked bytes without a fake commit or writes', async (t) => {
  const { captureReviewSource } = await source; const f = fixture(t);
  f.write('app.js', 'staged'); f.git('add', 'app.js'); f.write('app.js', 'working');
  f.write('binary.bin', Buffer.from([0, 255, 254, 13])); f.write('.gitignore', 'ignored\n'); f.write('ignored', 'private');
  const index = fs.readFileSync(path.join(f.repo, '.git/index'));
  const intake = captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true });
  assert.equal(intake.comparison, 'initial-working-tree'); assert.equal(intake.base_sha, null); assert.equal(intake.reviewed_head_sha, null);
  assert.deepEqual(intake.changed_files, ['.gitignore', 'app.js', 'binary.bin']);
  assert.equal(intake.diff_digest, intake.workspace_digest);
  assert.deepEqual(fs.readFileSync(path.join(f.repo, '.git/index')), index);
  assert.throws(() => f.git('rev-parse', '--verify', 'HEAD'));
  assert.equal(captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true, head: null, write: false }).diff_digest, intake.diff_digest);
});

test('snapshot identity covers index-only changes, file bytes, executable mode and missing staged paths', async (t) => {
  const { captureInitialWorkingTree } = await source; const f = fixture(t);
  f.write('app', 'one'); f.git('add', 'app'); f.write('app', 'two');
  const capture = () => captureInitialWorkingTree(f.repo, ['.agents/reviews/local']);
  const before = capture(); f.git('add', 'app'); assert.notEqual(capture().digest, before.digest);
  const staged = capture(); fs.chmodSync(path.join(f.repo, 'app'), 0o755); assert.notEqual(capture().digest, staged.digest);
  const executable = capture(); f.write('app', 'three'); assert.notEqual(capture().digest, executable.digest);
  fs.unlinkSync(path.join(f.repo, 'app')); const deleted = capture();
  assert.equal(deleted.entries[0].kind, 'missing'); assert.equal(deleted.entries[0].digest, null);
});

test('only exact active artifact roots are excluded and exclusion labels are not hashed', async (t) => {
  const { captureInitialWorkingTree } = await source; const f = fixture(t); f.write('app', 'one');
  const before = captureInitialWorkingTree(f.repo, ['.agents/reviews/local']);
  const debug = '.agents/debug/fix'; fs.mkdirSync(path.join(f.repo, debug), { recursive: true }); f.write(`${debug}/state.json`, '{}');
  assert.equal(captureInitialWorkingTree(f.repo, ['.agents/reviews/local', debug]).digest, before.digest);
  f.write('.agents/source.txt', 'belongs to repository');
  assert.notEqual(captureInitialWorkingTree(f.repo, ['.agents/reviews/local', debug]).digest, before.digest);
  assert.throws(() => captureInitialWorkingTree(f.repo, ['.agents']), /exclusion/);
});

test('symlinks hash link bytes, never target content; parent symlink traversal fails', async (t) => {
  const { captureInitialWorkingTree } = await source; const f = fixture(t);
  fs.symlinkSync('/etc/passwd', path.join(f.repo, 'link'));
  const first = captureInitialWorkingTree(f.repo); assert.equal(first.entries[0].kind, 'symlink');
  fs.unlinkSync(path.join(f.repo, 'link')); fs.symlinkSync('/etc/hosts', path.join(f.repo, 'link'));
  assert.notEqual(captureInitialWorkingTree(f.repo).digest, first.digest);
  fs.mkdirSync(path.join(f.repo, 'dir')); f.write('dir/file', 'tracked'); f.git('add', 'dir/file');
  fs.rmSync(path.join(f.repo, 'dir'), { recursive: true }); fs.symlinkSync('/etc', path.join(f.repo, 'dir'));
  assert.throws(() => captureInitialWorkingTree(f.repo), /symlink/);
});

test('explicit ref errors and appearing first commit cannot masquerade as an unborn snapshot', async (t) => {
  const { captureReviewSource, currentHead, captureInitialWorkingTree } = await source; const f = fixture(t);
  assert.equal(currentHead(f.repo), null); f.write('app', 'one');
  assert.throws(() => captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true, base: 'missing' }), /base/);
  f.git('add', 'app'); f.git('commit', '-qm', 'initial');
  assert.throws(() => captureReviewSource({ repositoryRoot: f.repo, artifactRoot: f.root, working: true, head: null, write: false }), /HEAD|unborn|initial/);
  assert.throws(() => captureInitialWorkingTree(f.repo), /HEAD|unborn|initial/);
  assert.throws(() => currentHead(f.root), /root/);
});
