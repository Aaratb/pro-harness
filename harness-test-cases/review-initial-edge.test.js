const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const source = import('../scripts/review-source.mjs');
function fixture(t) {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-initial-edge-')));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const repo = path.join(temporary, 'repo'); fs.mkdirSync(repo);
  const git = (args, input) => execFileSync('git', ['-C', repo, '-c', 'core.hooksPath=/dev/null', ...args], {
    encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  git(['init', '-q']);
  return { repo, temporary, git };
}

test('initial snapshots retain conflicts when the working leaf or parent is missing', async (t) => {
  const { captureInitialWorkingTree } = await source; const f = fixture(t);
  fs.mkdirSync(path.join(f.repo, 'present'));
  const paths = ['absent/nested/file.js', 'present/missing.js'];
  const oid = f.git(['hash-object', '-w', '--stdin'], 'conflict fixture\n');
  f.git(['update-index', '--index-info'], paths.flatMap((file) => [
    `100644 ${oid} 1\t${file}\n`, `100644 ${oid} 2\t${file}\n`,
  ]).join(''));
  const index = fs.readFileSync(path.join(f.repo, '.git/index'));
  const snapshot = captureInitialWorkingTree(f.repo);
  assert.deepEqual(snapshot.files, paths);
  assert.deepEqual(snapshot.evidence_gaps, paths.map((file) => `${file}: unresolved index conflict`));
  for (const entry of snapshot.entries) {
    assert.equal(entry.kind, 'missing'); assert.equal(entry.digest, null);
    assert.deepEqual(entry.index.map(({ stage }) => stage), [1, 2]);
    assert.equal(fs.existsSync(path.join(f.repo, entry.path)), false);
  }
  assert.deepEqual(fs.readFileSync(path.join(f.repo, '.git/index')), index);
});

test('an existing HEAD ref to a missing object is not treated as an unborn branch', async (t) => {
  const { currentHead, captureInitialWorkingTree } = await source; const f = fixture(t);
  assert.equal(currentHead(f.repo), null);
  const branch = f.git(['symbolic-ref', 'HEAD']);
  const oid = f.git(['hash-object', '--stdin'], 'object deliberately not stored\n');
  const ref = path.join(f.repo, '.git', branch); fs.mkdirSync(path.dirname(ref), { recursive: true });
  fs.writeFileSync(ref, `${oid}\n`);
  assert.throws(() => currentHead(f.repo), /HEAD reference could not be verified/);
  assert.throws(() => captureInitialWorkingTree(f.repo), /HEAD reference could not be verified/);
  assert.equal(fs.readFileSync(ref, 'utf8'), `${oid}\n`);
});

test('an existing HEAD ref to a blob is not treated as an unborn branch', async (t) => {
  const { currentHead, captureInitialWorkingTree } = await source; const f = fixture(t);
  const branch = f.git(['symbolic-ref', 'HEAD']);
  const oid = f.git(['hash-object', '-w', '--stdin'], 'not a commit\n');
  const ref = path.join(f.repo, '.git', branch); fs.mkdirSync(path.dirname(ref), { recursive: true });
  fs.writeFileSync(ref, `${oid}\n`);
  assert.throws(() => currentHead(f.repo), /HEAD exists but does not resolve to a commit/);
  assert.throws(() => captureInitialWorkingTree(f.repo), /HEAD exists but does not resolve to a commit/);
  assert.equal(fs.readFileSync(ref, 'utf8'), `${oid}\n`);
});

for (const scenario of [
  { name: 'leaf', link: '.agents/debug/fix', exclusion: '.agents/debug/fix' },
  { name: 'parent', link: '.agents/reviews', exclusion: '.agents/reviews/local' },
]) {
  test(`initial snapshot rejects a symlinked exclusion ${scenario.name} before traversing it`, async (t) => {
    const { captureInitialWorkingTree } = await source; const f = fixture(t);
    const outside = path.join(f.temporary, 'outside'); fs.mkdirSync(path.join(outside, 'local'), { recursive: true });
    fs.writeFileSync(path.join(outside, 'sentinel'), 'outside content');
    const link = path.join(f.repo, scenario.link); fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(outside, link);
    const originalLstat = fs.lstatSync;
    const traversals = [];
    t.mock.method(fs, 'lstatSync', (file, ...args) => {
      if (typeof file === 'string' && file.startsWith(`${link}${path.sep}`)) traversals.push(file);
      return originalLstat(file, ...args);
    });
    assert.throws(() => captureInitialWorkingTree(f.repo, [scenario.exclusion]), /exclusion must be a contained real directory/);
    assert.deepEqual(traversals, []);
    assert.equal(fs.readFileSync(path.join(outside, 'sentinel'), 'utf8'), 'outside content');
    assert.equal(fs.readlinkSync(link), outside);
  });
}
