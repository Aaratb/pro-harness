#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { canonicalRoot, containedPath, ensureContainedDirectory } from './lib/repository-paths.mjs';

const argumentsList = process.argv.slice(2);
const renderDiagrams = argumentsList.includes('--render-diagrams');
// Preserve lightweight/default source-only companions for other consumers.
const diagrams = renderDiagrams ? await import('./lib/artifact-diagrams.mjs') : null;
let diagramCount = 0;
function valueFor(flag) {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}
function fail(message) {
  console.error(JSON.stringify({ status: 'error', summary: message, artifacts: [], next_actions: ['Correct the input paths or source Markdown and retry.'] }));
  process.exit(2);
}
function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}
function renderMarkdown(markdown) {
  const lines = (diagrams ? markdown.replace(/\r\n?/g, '\n') : markdown).split('\n');
  let title = 'Artifact Companion';
  const sections = [];
  let current = { title: 'Overview', id: 'overview', blocks: [] };
  sections.push(current);
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const fence = diagrams?.readFence(lines, index);
    if (fence) {
      if (fence.language === 'mermaid') {
        const image = diagrams.diagramImage(fence.source);
        diagramCount += 1;
        current.blocks.push(diagrams.diagramFigure(fence.source, image, `Diagram ${diagramCount} · ${current.title}`, escapeHtml));
      } else current.blocks.push(`<pre><code>${escapeHtml(fence.source)}</code></pre>`);
      index = fence.next; continue;
    }
    if (line.startsWith('# ')) {
      title = line.slice(2).trim(); index += 1; continue;
    }
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim();
      current = { title: heading, id: slug(heading), blocks: [] };
      sections.push(current); index += 1; continue;
    }
    if (line.startsWith('```')) {
      const code = []; index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) { code.push(lines[index]); index += 1; }
      index += 1; current.blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    if (/^\|/.test(line)) {
      const rows = [];
      while (index < lines.length && /^\|/.test(lines[index])) { rows.push(lines[index]); index += 1; }
      const cells = rows.filter((row) => !/^\|[\s:|-]+\|$/.test(row)).map((row) => row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
      if (cells.length > 0) current.blocks.push(`<div class="table-wrap"><table><thead><tr>${cells[0].map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${cells.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*] /.test(lines[index])) { items.push(lines[index].replace(/^\s*[-*] /, '')); index += 1; }
      current.blocks.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`); continue;
    }
    if (line.trim() === '') { index += 1; continue; }
    if (/^### /.test(line)) { current.blocks.push(`<h3>${inline(line.slice(4))}</h3>`); index += 1; continue; }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== '' && !/^(# |## |### |```|\||\s*[-*] )/.test(lines[index]) && !(diagrams && /^ {0,3}(?:`{3,}|~{3,})/.test(lines[index]))) { paragraph.push(lines[index].trim()); index += 1; }
    current.blocks.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return { title, sections: sections.filter((section) => section.blocks.length > 0) };
}

const artifactRootInput = valueFor('--artifact-root');
const sourceRelative = valueFor('--source');
const outputRelative = valueFor('--out') ?? sourceRelative?.replace(/\.md$/i, '.html');
const stateRelative = valueFor('--state');
const profile = valueFor('--profile') ?? 'technical-spec';
if (!artifactRootInput || !sourceRelative || !outputRelative) fail('usage: generate-artifact-companion.mjs --artifact-root <root> --source <relative.md> [--out <relative.html>] [--state <relative.json>] [--profile <name>] [--render-diagrams]');

try {
  const artifactRoot = canonicalRoot(artifactRootInput);
  const sourcePath = containedPath(artifactRoot, sourceRelative, { expectedType: 'file' });
  const outputDirectory = path.posix.dirname(outputRelative);
  if (outputDirectory !== '.') ensureContainedDirectory(artifactRoot, outputDirectory);
  const outputPath = containedPath(artifactRoot, outputRelative, { allowMissingLeaf: true });
  if (!sourceRelative.endsWith('.md') || !outputRelative.endsWith('.html')) throw new Error('source must be Markdown and output must be HTML');
  const rendered = renderMarkdown(fs.readFileSync(sourcePath, 'utf8'));
  if (renderDiagrams && !diagramCount) throw new Error('--render-diagrams requires at least one fenced Mermaid view; prose/source alone is not rendered delivery');
  const rail = rendered.sections.map((section) => `<a href="#${section.id}">${escapeHtml(section.title)}</a>`).join('');
  const content = rendered.sections.map((section) => `<section id="${section.id}"><h2>${inline(section.title)}</h2>${section.blocks.join('')}</section>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(rendered.title)}</title><!-- artifact_companion_contract:1; source:${escapeHtml(sourceRelative)}; profile:${escapeHtml(profile)}; communication_spine:context|decision|proof|ask --><style>:root{color-scheme:light;--ink:#1f1e1b;--body:#50504c;--line:#deddd9;--accent:#0759a6;--surface:#f7f7f5}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--body);font:16.5px/1.72 system-ui,sans-serif}.shell{max-width:1080px;margin:auto;padding:36px 24px;display:grid;grid-template-columns:190px minmax(0,1fr);gap:36px}header{grid-column:1/-1;border-bottom:1px solid var(--line)}h1,h2,h3{color:var(--ink)}h1{font-size:40px;line-height:1.15}h2{font-size:26px;border-bottom:1px solid var(--line);padding-bottom:6px}nav{position:sticky;top:24px;align-self:start;display:flex;flex-direction:column;gap:8px}nav a{color:var(--accent)}section{margin-bottom:34px}code,pre{font-family:ui-monospace,monospace}code{background:var(--surface);padding:2px 4px}pre{overflow:auto;background:var(--surface);padding:14px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line)}footer{grid-column:1/-1;border-top:1px solid var(--line);padding-top:12px;font-size:13px}@media(max-width:680px){.shell{grid-template-columns:1fr;padding:22px 16px}nav{position:static;flex-direction:row;flex-wrap:wrap}h1{font-size:32px}}@media(max-width:390px){.shell{padding:18px 12px}h1{font-size:26px}}@media(max-width:320px){body{font-size:15px}h1{font-size:23px}}</style></head><body><div class="shell"><header><p>${escapeHtml(profile)}</p><h1>${inline(rendered.title)}</h1><p>Repository-local companion for <code>${escapeHtml(sourceRelative)}</code></p></header><nav aria-label="Sections">${rail}</nav><main>${content}</main><footer>source_trace: ${escapeHtml(sourceRelative)} · generated_by: generate-artifact-companion.mjs</footer></div></body></html>`;
  const outputHtml = diagrams ? html.replace('<style>', `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>`).replace('</style>', `.shell>main{min-width:0}${diagrams.diagramCss}</style>`).replace('<!-- artifact_companion_contract:', `<!-- diagram_rendering:local-v1; diagrams:${diagramCount} --><!-- artifact_companion_contract:`) : html;
  if (diagrams && Buffer.byteLength(outputHtml) > 2 * 1024 * 1024) throw new Error('Visual companion exceeds 2 MiB; split the explanation without dropping meaningful views');
  fs.writeFileSync(outputPath, outputHtml, { encoding: 'utf8', mode: 0o600 });
  if (stateRelative) {
    const statePath = containedPath(artifactRoot, stateRelative, { expectedType: 'file' });
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.artifact_companions ??= [];
    const entry = { source_path: sourceRelative, html_path: outputRelative, profile, status: 'generated', runner: 'generate-artifact-companion.mjs', publish_status: 'local-only' };
    const existing = state.artifact_companions.findIndex((item) => item.source_path === sourceRelative);
    if (existing >= 0) state.artifact_companions[existing] = entry; else state.artifact_companions.push(entry);
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
  console.log(JSON.stringify({ status: 'success', summary: `generated artifact companion for ${sourceRelative}`, artifacts: [outputRelative], next_actions: ['Run validate-artifact-companion.mjs before treating the companion as verified.'] }));
} catch (error) {
  fail(error.message);
}
