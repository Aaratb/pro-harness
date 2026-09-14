'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Review lifecycle forwards explicit local authorization without deriving it from packet data', t => {
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'local-hook-')));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const artifact = path.join(project, '.agents', 'reviews', 'fixture'); fs.mkdirSync(artifact, { recursive: true });
  fs.writeFileSync(path.join(project, 'app.js'), 'export const value = 1;');
  const invoke = (script, args) => spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], { encoding: 'utf8' });
  const args = ['--repo-root', project, '--artifact-root', artifact];
  const init = invoke('review-run.mjs', ['init', ...args, '--mode', 'fast', '--local', '--scope', '["app.js"]']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const hook = [...args, '--workflow', 'review-pro', '--event', 'before-phase-transition'];
  const denied = invoke('run-workflow-hook.mjs', hook); assert.notEqual(denied.status, 0);
  const valid = invoke('run-workflow-hook.mjs', [...hook, '--local', '--scope', '["app.js"]']);
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  const mismatch = invoke('run-workflow-hook.mjs', [...hook, '--local', '--scope', '["other.js"]']);
  assert.notEqual(mismatch.status, 0); assert.match(mismatch.stdout, /scope/i);
});

test('local command guidance keeps Review read-only and allows canonical harness repair', () => {
  const review = read('commands/review-pro.md'); const debug = read('commands/debug-pro.md');
  assert.match(review, /local-directory/); assert.match(review, /never applies fixes/i);
  assert.match(debug, /local-directory/); assert.doesNotMatch(debug, /trusted Git baseline/);
  for (const text of [review, debug]) assert.match(text, /docs\/local-review-debug\.md/);
  for (const command of ['review-pro', 'debug-pro']) {
    assert.match(read(`commands/${command}/phases/01-roadmap.md`), /--local.*resolver/);
    assert.match(read(`commands/${command}/phases/02-intake.md`), /--local --scope/);
  }
  assert.match(read('scripts/lib/runtime-adapters.mjs'), /harness itself is the explicitly selected project/);
});
