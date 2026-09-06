'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const scripts = path.resolve(__dirname, '../scripts');
const source = '# Invoice preview\n\n## Changes — checked baseline to proposed design\n\nEXISTING = retained; NEW = proposed addition; CHANGED = proposed contract change; REMOVAL = proposed removal, not yet done.\n\n```mermaid\nflowchart LR\nAPI["API · EXISTING"] -->|"CHANGED · preview contract"|Format["Formatter · EXISTING"]\nAPI -->|"NEW · proposed call"|Preview["Preview · NEW / PROPOSED"]\nAPI -->|"REMOVAL · proposed old call"|Legacy["Legacy · REMOVAL / PROPOSED"]\n```\n\n## Proposed request sequence\n\nThe formatter is reused; the preview call is new.\n\n```mermaid\nsequenceDiagram\nparticipant API as API / EXISTING\nparticipant Preview as Preview / NEW PROPOSED\nAPI->>Preview: NEW / proposed read-only preview\nPreview-->>API: NEW / proposed formatted result\n```\n';
function fixture(t, markdown = source) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-visual-'));
 t.after(() => fs.rmSync(root, { recursive: true, force: true }));
 fs.writeFileSync(path.join(root, 'EXPLAIN.md'), markdown);
 return root;
}
function run(root, command, extra = []) {
 return spawnSync(process.execPath, [path.join(scripts, command), '--artifact-root', root, '--source', 'EXPLAIN.md', ...(command.startsWith('generate') ? ['--out', 'EXPLAIN.html', '--profile', 'architecture'] : ['--html', 'EXPLAIN.html']), ...extra], { encoding: 'utf8' });
}

test('opt-in companion displays safe rendered views with readable change labels and source disclosure', async t => {
 const root = fixture(t), result = run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']);
 assert.equal(result.status, 0, result.stdout + result.stderr);
 const html = fs.readFileSync(path.join(root, 'EXPLAIN.html'), 'utf8');
 assert.match(html, /diagram_rendering:local-v1/);
 assert.match(html, /<figure class="diagram-figure"/);
 assert.match(html, /<details class="diagram-source"><summary>Diagram source/);
 assert.match(html, /View full-size diagram/);
 assert.doesNotMatch(html, /<script\b|<svg\b|<iframe\b|(?:src|href)="https?:\/\//);
 const images = [...html.matchAll(/src="data:image\/svg\+xml;base64,([^"]+)"/g)].map(m => Buffer.from(m[1], 'base64').toString());
 assert.equal(images.length, 4, 'two diagrams, each with an overview and full-size view');
 const { safeSvg } = await import('../scripts/lib/explainer-visuals.mjs');
 for (const svg of images) assert.equal(safeSvg(svg), svg);
 for (const label of ['EXISTING', 'NEW', 'CHANGED', 'REMOVAL', 'preview contract', 'proposed old call']) assert.ok(images[0].includes(label), label);
 assert.ok(images[2].includes('NEW / proposed read-only preview'));
 assert.equal(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
});

test('default companion remains source-only and explicit rendered validation rejects it', t => {
 const root = fixture(t);
 assert.equal(run(root, 'generate-artifact-companion.mjs').status, 0);
 const html = fs.readFileSync(path.join(root, 'EXPLAIN.html'), 'utf8');
 assert.ok(html.includes('flowchart LR'));
 assert.doesNotMatch(html, /data:image\/svg|diagram_rendering/);
 assert.equal(run(root, 'validate-artifact-companion.mjs').status, 0);
 assert.notEqual(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
});

test('unsupported or unfinished Mermaid does not overwrite a previously generated companion', t => {
 for (const body of ['```mermaid\ngantt\ntitle unsupported\n```', '```mermaid\nflowchart LR\nA --> B']) {
  const root = fixture(t, '# Unsupported\n\n## View\n' + body);
  fs.writeFileSync(path.join(root, 'EXPLAIN.html'), 'previous output');
  const result = run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']);
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'EXPLAIN.html'), 'utf8'), 'previous output');
 }
});

test('rendered validation rejects stale, missing or substituted displayed images', t => {
 const root = fixture(t);
 assert.equal(run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
 const file = path.join(root, 'EXPLAIN.html'), original = fs.readFileSync(file, 'utf8');
 for (const changed of [original.replace(/<img\b[^>]+>/, ''), original.replace(/src="data:image\/svg\+xml;base64,[^"]+"/, 'src="data:image/svg+xml;base64,PHN2Zy8+"')]) {
  fs.writeFileSync(file, changed);
  assert.notEqual(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
 }
 fs.writeFileSync(file, original);
 fs.writeFileSync(path.join(root, 'EXPLAIN.md'), source.replace('preview contract', 'changed contract'));
 assert.notEqual(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
});

test('fences support tilde syntax and do not mistake literal nested examples for diagrams', t => {
 const root = fixture(t, '# Fences\n\n## Actual view\n~~~mermaid\nflowchart LR\nA["EXISTING"] -->|"NEW proposed edge"|B["NEW proposed"]\n~~~\n\n````markdown\n```mermaid\nnot an actual diagram\n```\n````\n');
 const result = run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']);
 assert.equal(result.status, 0, result.stderr);
 const html = fs.readFileSync(path.join(root, 'EXPLAIN.html'), 'utf8');
 assert.equal((html.match(/<figure class="diagram-figure"/g) || []).length, 1);
 assert.ok(html.includes('not an actual diagram'));
 assert.equal(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
});

test('validation does not count hidden or inert image markup as delivered visuals', t => {
 const root = fixture(t);
 assert.equal(run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
 const file = path.join(root, 'EXPLAIN.html'), html = fs.readFileSync(file, 'utf8');
 for (const [open, close] of [['<!--', '-->'], ['<template>', '</template>'], ['<div hidden>', '</div>'], ['<div style="display:none">', '</div>'], ['<details>', '</details>'], ['<DETAILS>', '</DETAILS>'], ['<script type="text/plain">', '</script>']]) {
  fs.writeFileSync(file, html.replace(/<figure class="diagram-figure">[\s\S]*?<\/figure>/, match => open + match + close));
  assert.notEqual(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0, open);
 }
 fs.writeFileSync(file, html.replace(/<figure class="diagram-figure">([\s\S]*?)<\/figure>/, '<figure class="diagram-figure"><details>$1</details></figure>'));
 assert.notEqual(run(root, 'validate-artifact-companion.mjs', ['--render-diagrams']).status, 0, 'overview inside a closed disclosure');
});

test('rendering rejects absent diagrams, unsafe directives and symlinked outputs without source changes', t => {
 for (const markdown of ['# No diagrams\n\n## Context\nOnly prose.', '# Unsafe\n\n## View\n```mermaid\nflowchart LR\nA --> B\nclick A "https://example.invalid"\n```']) {
  const root = fixture(t, markdown);
  assert.notEqual(run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'EXPLAIN.md'), 'utf8'), markdown);
  assert.equal(fs.existsSync(path.join(root, 'EXPLAIN.html')), false);
 }
 const root = fixture(t), other = path.join(root, 'protected.html');
 fs.writeFileSync(other, 'protected');
 fs.symlinkSync(other, path.join(root, 'EXPLAIN.html'));
 assert.notEqual(run(root, 'generate-artifact-companion.mjs', ['--render-diagrams']).status, 0);
 assert.equal(fs.readFileSync(other, 'utf8'), 'protected');
});
