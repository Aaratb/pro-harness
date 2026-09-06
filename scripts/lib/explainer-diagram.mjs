import { renderMermaidSVG } from '../vendor/beautiful-mermaid/renderer.mjs';

// A bounded adapter, not a Mermaid parser. The pinned renderer rejects unconsumed
// syntax; these checks cover known upstream constructs with lossy semantics.
const families = /^(?:sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?|(?:graph|flowchart)\s+(?:TD|TB|LR|BT|RL))$/;
const options = Object.freeze({
  bg: '#faf9f6', fg: '#203239', accent: '#216b62', line: '#617975',
  muted: '#465f62', surface: '#f0f4ef', border: '#aabbb3',
  font: 'Arial', padding: 32, nodeSpacing: 44, layerSpacing: 64,
  interactive: false, transparent: false,
});

function unsupported(detail) {
  throw new Error(`Local diagram render unsupported: ${detail}. Use supported Mermaid syntax or supply a safely rendered SVG through diagram.render; do not remove meaningful branches to make it pass.`);
}

// Passive SVG viewers need concrete paints: CSS variables/color-mix are not
// universally supported. Resolve only generated paint attributes, never labels.
const staticPaints = Object.freeze({
  '--bg': options.bg, '--fg': options.fg, '--_text': options.fg,
  '--_text-sec': options.muted, '--_text-muted': options.muted,
  '--_text-faint': '#c4c7c7', '--_line': options.line,
  '--_arrow': options.accent, '--_node-fill': options.surface,
  '--_node-stroke': options.border, '--_group-fill': options.bg,
  '--_group-hdr': '#efefed', '--_inner-stroke': '#e0e1df',
  '--_key-badge': '#e4e5e3',
});

function portablePaints(svg) {
  const painted = svg.replace(/<[A-Za-z][^>]*>/g, tag => tag.replace(
    /\s(fill|stroke|color|stop-color|flood-color|lighting-color)="([^"]*)"/g,
    (attribute, name, value) => {
      if (!/var\(|color-mix\(/.test(value)) return attribute;
      const token = value.match(/^var\((--[\w-]+)\)$/)?.[1];
      if (!token || !Object.hasOwn(staticPaints, token)) unsupported(`unknown generated ${name} paint token`);
      return ` ${name}="${staticPaints[token]}"`;
    },
  ));
  // Root CSS backgrounds are also ignored by some standalone SVG viewers.
  return painted.replace(/^(\s*<svg\b[^>]*>)/, `$1\n<rect x="0" y="0" width="100%" height="100%" fill="${options.bg}" />`);
}

// Mermaid's flowchart statement separator is not a separator inside labels.
function flowStatements(source) {
  if (!/^(?:graph|flowchart)\s+(?:TD|TB|LR|BT|RL)(?:\s|;)/.test(source.trimStart())) return source;
  let quote = '', depth = 0, pipe = false, result = '', comment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\n') comment = false;
    if (!quote && !depth && !pipe && char === '%' && source[index + 1] === '%') comment = true;
    if (!comment) {
      if (char === '"' && source[index - 1] !== '\\') {
        if (quote === char) quote = ''; else if (!quote) quote = char;
      } else if (!quote) {
        if ('[({'.includes(char)) depth += 1;
        if ('])}'.includes(char)) depth -= 1;
        if (char === '|' && !depth) pipe = !pipe;
      }
    }
    result += char === ';' && !quote && !depth && !pipe && !comment ? '\n' : char;
  }
  return result;
}

function guardSequence(lines) {
  const blocks = [];
  const declared = new Set();
  const activations = new Map();
  let messages = 0;
  let interactions = false;
  for (const line of lines.slice(1)) {
    if (/^(?:autonumber|activate|deactivate|box|rect|create|destroy|links?|properties|title|accTitle|accDescr)\b/.test(line)) unsupported(`sequence directive "${line.split(/\s/)[0]}"`);
    const actor = line.match(/^(?:participant|actor)\s+(\S+?)(?:\s+as\s+.+)?$/);
    if (actor) {
      if (interactions || declared.has(actor[1])) unsupported('declare each participant once, before messages or notes');
      declared.add(actor[1]);
    }
    if (/^Note\s+(?:left of|right of|over)\s+/i.test(line)) {
      interactions = true;
      if (!messages) unsupported('notes before the first sequence message');
    }
    const start = line.match(/^(loop|alt|opt|par|critical|break)\b/);
    if (start) blocks.push(start[1]);
    const divider = line.match(/^(else|and)\b/);
    if (divider && blocks.at(-1) !== (divider[1] === 'else' ? 'alt' : 'par')) unsupported(`"${divider[1]}" outside its matching sequence block`);
    if (line === 'end' && !blocks.pop()) unsupported('unexpected sequence end');
    const message = line.match(/^(\S+?)\s*(->>|-->>|-\)|--\)|-x|--x|->|-->)\s*([+-]?)(\S+?)\s*:/);
    if (message) {
      if (!['->>', '-->>', '-)', '--)'].includes(message[2])) unsupported(`sequence arrow ${message[2]}`);
      interactions = true;
      messages += 1;
      if (message[3] === '+') activations.set(message[4], (activations.get(message[4]) || 0) + 1);
      if (message[3] === '-') {
        const depth = activations.get(message[1]) || 0;
        if (!depth) unsupported(`deactivation without activation for ${message[1]}`);
        activations.set(message[1], depth - 1);
      }
    }
  }
  if (blocks.length) unsupported('unclosed sequence block');
  if (!messages) unsupported('sequence has no messages');
}

/** Render locally without a browser, network access, target execution or install. */
export function renderExplainerDiagram(source) {
  if (typeof source !== 'string' || !source.trim()) unsupported('empty source');
  if (source.length > 24000) unsupported('source exceeds 24,000 characters; split the view');
  if (/%%\{|^---\s*$/m.test(source)) unsupported('configuration directives or frontmatter');
  const lines = flowStatements(source.replace(/\r\n?/g, '\n')).split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('%%'));
  if (!families.test(lines[0])) unsupported('diagram family or header; use flowchart, sequence, class, ER or state');
  if (lines.length > 160 || (source.match(/\s&\s/g) || []).length > 16) unsupported('view is too large; split related mechanisms');
  if (lines.length < 2) unsupported('diagram has no content');
  // The authored semantic view is preserved; provider-specific styles/links are
  // rejected, never silently removed. Direction remains supported.
  if (lines[0] !== 'classDiagram') for (const line of lines) if (/^(?:click|style|classDef|class|linkStyle)\b/.test(line)) unsupported('custom styling or interaction directive');
  if (lines[0] === 'sequenceDiagram') guardSequence(lines);
  try {
    const svg = renderMermaidSVG(lines.join('\n'), options);
    if (!/<(?:path|rect|line|circle|polygon|polyline)\b/.test(svg) || /\b(?:NaN|Infinity)\b/.test(svg)) unsupported('renderer produced an empty or non-finite view');
    if (/<(?:script|foreignObject|image|a)\b|@import|(?:href|src)\s*=/i.test(svg)) unsupported('renderer produced an external or interactive resource');
    return portablePaints(svg);
  } catch (error) {
    if (error.message?.startsWith('Local diagram render unsupported:')) throw error;
    unsupported(error.message || 'renderer could not preserve this syntax');
  }
}
