#!/usr/bin/env node

import fs from 'node:fs';
import { canonicalRoot, containedPath } from './lib/repository-paths.mjs';

const argumentsList = process.argv.slice(2);
function valueFor(flag) { const index = argumentsList.indexOf(flag); return index >= 0 ? argumentsList[index + 1] : undefined; }
const artifactRootInput = valueFor('--artifact-root');
const sourceRelative = valueFor('--source');
const htmlRelative = valueFor('--html');
const errors = [];
try {
  if (!artifactRootInput || !sourceRelative || !htmlRelative) throw new Error('usage: validate-artifact-companion.mjs --artifact-root <root> --source <relative.md> --html <relative.html> [--render-diagrams]');
  const root = canonicalRoot(artifactRootInput);
  const sourcePath = containedPath(root, sourceRelative, { expectedType: 'file' });
  const htmlPath = containedPath(root, htmlRelative, { expectedType: 'file' });
  const source = fs.readFileSync(sourcePath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (argumentsList.includes('--render-diagrams') || html.includes('diagram_rendering:local-v1')) {
    const { validateDiagramImages } = await import('./lib/artifact-diagrams.mjs');
    errors.push(...validateDiagramImages(source, html));
  }
  const required = ['<!doctype html>', '<meta name="viewport"', 'artifact_companion_contract:1', `source:${sourceRelative}`, 'communication_spine:', 'source_trace:', '@media(max-width:390px)', '@media(max-width:320px)'];
  for (const marker of required) if (!html.toLowerCase().includes(marker.toLowerCase())) errors.push(`missing required marker: ${marker}`);
  const forbidden = [/<iframe\b/i, /<form\b/i, /\son[a-z]+\s*=/i, /\beval\s*\(/i, /new\s+Function\s*\(/i, /document\.write/i, /\.(?:innerHTML|outerHTML)\s*=/i, /(?:src|poster)\s*=\s*["']https?:\/\//i, /<link\b[^>]*href\s*=\s*["']https?:\/\//i, /@import\s+(?:url\()?['"]?https?:\/\//i];
  for (const pattern of forbidden) if (pattern.test(html)) errors.push(`unsafe or remote HTML pattern: ${pattern}`);
  for (const heading of source.match(/^##\s+(.+)$/gm)?.map((line) => line.replace(/^##\s+/, '').trim()) ?? []) {
    if (!html.includes(`>${heading.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}<`)) errors.push(`source heading missing from companion: ${heading}`);
  }
  if (Buffer.byteLength(html) > 2 * 1024 * 1024) errors.push('HTML exceeds 2 MiB');
} catch (error) {
  errors.push(error.message);
}
const result = errors.length === 0
  ? { status: 'success', summary: 'artifact companion is valid', artifacts: [htmlRelative], next_actions: [] }
  : { status: 'error', summary: `${errors.length} artifact companion validation error(s)`, errors, artifacts: [], next_actions: ['Regenerate or repair the companion and rerun validation.'] };
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exit(1);
