// Restrict local SVG sidecars to passive, self-contained diagrams. HTML also
// isolates every accepted SVG in an image: diagram CSS/IDs never enter its DOM.
import { SaxesParser } from '../vendor/beautiful-mermaid/renderer.mjs';

const passiveElements = new Set('svg g defs title desc style path rect circle ellipse line polyline polygon text tspan textPath marker clipPath mask linearGradient radialGradient stop use'.toLowerCase().split(' '));
const containers = new Set(['defs', 'marker', 'clippath', 'mask']);

function passiveCss(value) {
  const css = value.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/[\\@]|&#|(?:https?:|file:|data:|javascript:|expression\s*\(|image-set\s*\(|-moz-binding|behavior\s*:)/i.test(css)) throw new Error('rendered SVG contains forbidden style or external reference');
  for (const match of css.matchAll(/url\s*\(([^)]*)\)/gi)) {
    if (!/^\s*["']?#[A-Za-z_][\w:.-]*["']?\s*$/.test(match[1])) throw new Error('rendered SVG contains forbidden external reference');
  }
}

export function safeSvg(value) {
  if (typeof value !== 'string' || !/^\s*<svg\b/i.test(value) || !/<\/svg>\s*$/i.test(value)) throw new Error('rendered diagram must be a complete SVG document');
  if (value.length > 4_000_000) throw new Error('rendered SVG exceeds the local diagram size limit');
  if (/<[!?]|\son[a-z]+\s*=|\sxml:base\s*=/i.test(value)) throw new Error('rendered SVG contains forbidden active content');
  const stack = [];
  let drawable = false;
  let needsNamespace = false;
  const parser = new SaxesParser({ xmlns: true });
  parser.on('opentag', (tag) => {
    const name = tag.local.toLowerCase();
    if (!passiveElements.has(name) || !['', 'http://www.w3.org/2000/svg'].includes(tag.uri)) throw new Error(`rendered SVG contains forbidden active content: ${tag.name}`);
    if (!stack.length && !tag.uri) {
      if (Object.hasOwn(tag.attributes, 'xmlns')) throw new Error('rendered SVG requires the SVG namespace');
      needsNamespace = true;
    }
    const attributes = Object.fromEntries(Object.values(tag.attributes).map((attribute) => [attribute.local, attribute.value]));
    for (const attribute of Object.values(tag.attributes)) {
      const local = attribute.local.toLowerCase();
      if (/^on[a-z]+$/.test(local) || attribute.name === 'xml:base') throw new Error('rendered SVG contains forbidden active content');
      if (local === 'href' && !/^#[A-Za-z_][\w:.-]*$/.test(attribute.value)) throw new Error('rendered SVG contains forbidden event or external reference');
      if (/^(?:style|fill|stroke|filter|clip-path|mask|cursor|marker(?:-start|-mid|-end)?)$/.test(local) || /url\s*\(/i.test(attribute.value)) passiveCss(attribute.value);
    }
    if (!stack.some((entry) => containers.has(entry.name))) {
      if (name === 'path' && attributes.d?.trim()) drawable = true;
      if (['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'use'].includes(name) && Object.keys(attributes).some((key) => !['id', 'class', 'style', 'xmlns'].includes(key))) drawable = true;
    }
    stack.push({ name, text: '' });
  });
  parser.on('text', (text) => {
    if (stack.at(-1)?.name === 'style') stack.at(-1).text += text;
    if (text.trim() && stack.some(({ name }) => name === 'text') && !stack.some(({ name }) => containers.has(name))) drawable = true;
  });
  parser.on('closetag', () => {
    const entry = stack.pop();
    if (entry.name === 'style') passiveCss(entry.text);
  });
  try { parser.write(value).close(); } catch (error) {
    if (error.message.startsWith('rendered SVG')) throw error;
    throw new Error(`rendered SVG is malformed XML: ${error.message}`);
  }
  if (!drawable) throw new Error('rendered SVG is empty: no drawable content outside definitions');
  return needsNamespace ? value.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"') : value;
}

export function visualCompletionErrors(sections, mode) {
  const errors = [];
  if (mode !== 'CHANGE') {
    for (const capability of ['architecture', 'sequence', 'dependency-graph']) {
      if (!sections.some((section) => section.capability === capability && section.diagrams.length)) errors.push(`${capability} requires a rendered explanatory diagram in a full course`);
    }
  }
  for (const section of sections) for (const diagram of section.diagrams) {
    if (!diagram.rendered_svg) errors.push(`unrendered diagram ${section.id}/${diagram.id}; render it locally before certification`);
  }
  return errors;
}
