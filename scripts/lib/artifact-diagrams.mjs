import { renderExplainerDiagram } from './explainer-diagram.mjs';
import { safeSvg } from './explainer-visuals.mjs';

export function readFence(lines, index) {
  const open = lines[index]?.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
  if (!open) return null;
  const closing = new RegExp(`^ {0,3}${open[1][0]}{${open[1].length},}\\s*$`);
  let end = index + 1;
  while (end < lines.length && !closing.test(lines[end])) end += 1;
  if (end === lines.length) throw new Error(`Unclosed code fence at line ${index + 1}; no visual companion was generated`);
  return { language: open[2].trim().toLowerCase(), source: lines.slice(index + 1, end).join('\n'), next: end + 1 };
}

export function diagramImage(source) {
  const svg = safeSvg(renderExplainerDiagram(source));
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Shared fence extraction keeps generation and validation aligned; literal
// Mermaid inside a larger code-example fence is never executed as a diagram.
export function diagramImages(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const images = [];
  for (let index = 0; index < lines.length;) {
    const fence = readFence(lines, index);
    if (!fence) { index += 1; continue; }
    if (fence.language === 'mermaid') images.push(diagramImage(fence.source));
    index = fence.next;
  }
  if (!images.length) throw new Error('--render-diagrams requires at least one fenced Mermaid view; prose/source alone is not rendered delivery');
  return images;
}

export const diagramCss = `.diagram-figure{margin:28px 0;padding:20px;background:#faf9f6;border:1px solid #d8ddd6;border-radius:8px;min-width:0}.diagram-figure figcaption{font-weight:650;color:#203239;margin-bottom:16px}.diagram-viewport{overflow:auto;max-width:100%}.diagram-overview{display:block;max-width:100%;height:auto;margin:auto}.diagram-full img{display:block;max-width:none;height:auto}.diagram-figure details{margin-top:16px}.diagram-figure summary{cursor:pointer;color:#07524c;text-decoration:underline;text-underline-offset:3px}.diagram-full .diagram-viewport{max-height:80vh;margin-top:12px;border:1px solid #d8ddd6}.diagram-source pre{font-size:13px;max-height:24rem}.diagram-figure :focus-visible{outline:3px solid #216b62;outline-offset:3px}@media(max-width:680px){.diagram-figure{padding:12px}}@media print{.diagram-source,.diagram-full{display:none}.diagram-figure{break-inside:avoid}}`;

export function diagramFigure(source, image, caption, escape) {
  const label = escape(caption);
  // Isolate SVG in images: its IDs/CSS never enter the companion document.
  return `<figure class="diagram-figure"><figcaption>${label}</figcaption><div class="diagram-viewport"><img class="diagram-overview" alt="${label}" src="${image}"></div><details class="diagram-full"><summary>View full-size diagram</summary><div class="diagram-viewport" role="region" aria-label="${label} at full size" tabindex="0"><img alt="${label}" src="${image}"></div></details><details class="diagram-source"><summary>Diagram source</summary><pre><code>${escape(source)}</code></pre></details></figure>`;
}

export function validateDiagramImages(markdown, html) {
  const errors = [];
  if (!html.includes('diagram_rendering:local-v1')) errors.push('missing local rendered-diagram marker');
  const expected = diagramImages(markdown);
  const visibleMarkup = html.replace(/<!--[\s\S]*?-->/g, '');
  // This checks our bounded generated markup, not arbitrary browser CSS/layout.
  // Inert containers or hidden ancestors cannot stand in for delivered images.
  for (const tag of visibleMarkup.match(/<[A-Za-z][^>]*>/g) ?? []) {
    if (/^<(?:template|script|noscript|textarea|xmp|plaintext|dialog)\b/i.test(tag) || /\s(?:hidden(?:\s|=|>)|aria-hidden\s*=\s*["']true["']|style\s*=)/i.test(tag)) errors.push('visual companion contains inert, hidden or non-generated markup');
  }
  let disclosures = 0;
  for (const token of visibleMarkup.matchAll(/<\/?details\b[^>]*>|<img\b[^>]*>/gi)) {
    if (/^<\/details/i.test(token[0])) disclosures -= 1;
    else if (/^<details/i.test(token[0])) disclosures += 1;
    else if (/\bclass="diagram-overview"/.test(token[0]) && disclosures !== 0) errors.push('diagram overview is inside a disclosure instead of being displayed');
  }
  const figures = [...visibleMarkup.matchAll(/<figure class="diagram-figure">([\s\S]*?)<\/figure>/g)];
  if (figures.length !== expected.length) errors.push('rendered diagram count does not match current Markdown');
  for (let index = 0; index < expected.length; index += 1) {
    const displayed = [...(figures[index]?.[1] ?? '').matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(match => match[1]);
    if ((figures[index]?.[1].match(/<img\b[^>]*\bclass="diagram-overview"[^>]*>/g) ?? []).length !== 1) errors.push(`diagram ${index + 1} requires one visible overview image`);
    if (displayed.length !== 2 || displayed.some(image => image !== expected[index])) errors.push(`diagram ${index + 1} has a missing, stale or substituted displayed SVG`);
  }
  return errors;
}
