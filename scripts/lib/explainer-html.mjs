import { createHash } from 'node:crypto';
import { courseStyles, courseScript } from './explainer-presentation.mjs';

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// A deliberately small text formatter: raw HTML and source URLs never become active.
function inline(value) {
  return String(value).split(/(`[^`]+`)/g).map((part) => part.startsWith('`') && part.endsWith('`')
    ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
    : escapeHtml(part).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')).join('');
}

function prose(value) {
  const lines = String(value).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  const startsBlock = (line) => /^(\s*$|\s*```|\s*#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|\s*>\s|\s*\|)/.test(line);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    if (/^\s*```/.test(line)) {
      const code = []; i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i += 1;
      blocks.push(`<pre tabindex="0"><code>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
    }
    if (/^\s*#{1,6}\s/.test(line)) {
      blocks.push(`<h4>${inline(line.replace(/^\s*#{1,6}\s+/, ''))}</h4>`); i += 1; continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++].trim());
      const cells = rows.filter((row) => !/^\|[\s:|\-]+\|?$/.test(row)).map((row) => row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
      if (cells.length) blocks.push(`<div class="table-wrap" role="region" aria-label="Evidence table" tabindex="0"><table><thead><tr>${cells[0].map((cell) => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead><tbody>${cells.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const list = /^\s*(?:([-*+])|(\d+)[.)])\s+/.exec(line);
    if (list) {
      const ordered = Boolean(list[2]);
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) {
        const item = [lines[i++].replace(pattern, '')];
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !startsBlock(lines[i])) item.push(lines[i++].trim());
        items.push(`<li>${inline(item.join(' '))}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.join('')}</${tag}>`); continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`); continue;
    }
    const paragraph = [lines[i++].trim()];
    while (i < lines.length && !startsBlock(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return blocks.join('\n');
}

function diagramFor(diagram, section, index, embeddedSvgs) {
  const id = `course--diagram--${section.id}--${diagram.id}`;
  const rendered = embeddedSvgs.get(`${section.id}/${diagram.id}`);
  const image = rendered ? `<div class="fallback-zoom-controls"><label><input type="checkbox"> Zoom diagram to 200% (scroll to explore)</label></div><div class="diagram-frame" tabindex="0" role="region" aria-label="${escapeHtml(diagram.title)} diagram"><img src="data:image/svg+xml;base64,${Buffer.from(rendered, 'utf8').toString('base64')}" alt="${escapeHtml(diagram.alt)}"></div>`
    : '<p class="visual-incomplete">Visual incomplete: this diagram has not been rendered. Its description and source are available below.</p>';
  return `<figure class="diagram-figure${rendered ? '' : ' missing-visual'}" id="${id}">
    <div class="figure-heading"><div><p class="eyebrow">Figure ${index + 1} · The mechanism, mapped</p><h4>${escapeHtml(diagram.title)}</h4></div>${rendered ? `<button class="enlarge quiet-button" type="button" data-enlarge="${id}" hidden aria-haspopup="dialog" aria-label="Enlarge ${escapeHtml(diagram.title)}">Enlarge <span aria-hidden="true">↗</span></button>` : ''}</div>
    ${image}<figcaption>${escapeHtml(diagram.alt)}</figcaption>
    <details class="diagram-source"><summary>View diagram source</summary><pre tabindex="0"><code>${escapeHtml(diagram.source)}</code></pre></details>
  </figure>`;
}

function quizFor(section, answers) {
  if (!section.quiz.length) return '';
  return `<div class="practice"><p class="eyebrow">Pause &amp; practice</p><h3>Check your understanding.</h3><p class="practice-intro">Choose an answer, then check your reasoning. You can try again.</p>${section.quiz.map((question, index) => {
    const id = `course--${section.id}--q${index + 1}`;
    answers[id] = { correct: question.correct_index, explanations: question.explanations };
    return `<fieldset class="question" data-question="${id}"><legend><span class="question-number">${index + 1}.</span> ${escapeHtml(question.question)}</legend><div class="options">${question.options.map((option, optionIndex) => `<label class="option"><input type="radio" name="${id}" value="${optionIndex}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(option)}</span></label>`).join('')}</div><div class="answer-row"><button class="check-answer" type="button" data-check="${id}" hidden>Check answer <span aria-hidden="true">→</span></button><p class="feedback" id="${id}--feedback" role="status" aria-live="polite" aria-atomic="true"></p></div></fieldset>`;
  }).join('')}<noscript><p>Interactive answer feedback requires JavaScript. You can still work through each question and revisit the evidence above.</p></noscript></div>`;
}

/** Renders only supplied learning content. SVGs must already pass the publisher's safety checks. */
export function htmlFor(sections, state, embeddedSvgs, { certified = false } = {}) {
  const answers = Object.create(null);
  const diagrams = sections.flatMap((section) => section.diagrams.map((diagram) => ({ section, diagram })));
  const renderedCount = diagrams.filter(({ section, diagram }) => embeddedSvgs.has(`${section.id}/${diagram.id}`) && Boolean(embeddedSvgs.get(`${section.id}/${diagram.id}`))).length;
  const missingCount = diagrams.length - renderedCount;
  const complete = certified && !missingCount && sections.length > 0 && sections.every((section) => section.status === 'gated');
  const navigation = sections.map((section, index) => `<li><a href="#${escapeHtml(section.id)}" data-chapter-link${index === 0 ? ' aria-current="location"' : ''}><span class="nav-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(section.title)}</span></a></li>`).join('');
  const body = sections.map((section, index) => {
    const next = sections[index + 1];
    const missing = section.diagrams.some((diagram) => !embeddedSvgs.get(`${section.id}/${diagram.id}`));
    const consequence = `<div class="reading-block consequence"><h3>What this means</h3>${prose(section.content.consequence)}</div>`;
    const practice = quizFor(section, answers);
    return `<section class="chapter" id="${escapeHtml(section.id)}" aria-labelledby="course--${section.id}--title" data-chapter>
      <header class="chapter-header"><p class="eyebrow">Chapter ${String(index + 1).padStart(2, '0')} <span class="chapter-divider">/</span> ${String(sections.length).padStart(2, '0')}</p><h2 id="course--${section.id}--title">${escapeHtml(section.title)}</h2><p class="chapter-meta">Phase ${escapeHtml(section.phase)} · Evidence: ${escapeHtml(section.status)}${missing ? ' · Visual incomplete' : ''}</p></header>
      <div class="reading-block orientation"><h3>Start here</h3>${prose(section.content.orientation)}</div>
      <div class="reading-block mechanism"><h3>How it works</h3>${prose(section.content.mechanism)}</div>
      ${section.diagrams.map((diagram, diagramIndex) => diagramFor(diagram, section, diagramIndex, embeddedSvgs)).join('')}
      <details class="evidence"><summary><span><span class="eyebrow">Go deeper</span><span class="evidence-title">Read the technical evidence</span></span><span class="details-symbol" aria-hidden="true">+</span></summary><div class="evidence-content"><h3>Evidence &amp; source references</h3>${prose(section.content.evidence)}</div></details>
      ${(section.capability === 'quiz' ? [practice, consequence] : [consequence, practice]).join('\n')}
      <div class="chapter-next">${next ? `<span class="eyebrow">Up next · Chapter ${String(index + 2).padStart(2, '0')}</span><a href="#${escapeHtml(next.id)}">${escapeHtml(next.title)} <span aria-hidden="true">↗</span></a>` : '<span class="eyebrow">End of the guide</span><a href="#course--start">Return to the beginning <span aria-hidden="true">↑</span></a>'}</div>
    </section>`;
  }).join('');
  const script = courseScript(answers);
  const scriptHash = createHash('sha256').update(script, 'utf8').digest('base64');
  const csp = `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; object-src 'none'; connect-src 'none'`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"><title>${escapeHtml(state.slug)} — Repository field guide</title><style>${courseStyles}</style></head>
<body><a class="skip-link" href="#course--main">Skip to learning content</a>
<div class="page"><header class="masthead" id="course--start"><a class="wordmark" href="#course--start">EXPLAINER<span class="wordmark-slash"> / </span><span>FIELD GUIDE</span></a><span class="masthead-note">Read. Trace. Understand.</span></header>
<div class="layout"><aside class="reading-rail"><nav aria-label="Course chapters"><p class="eyebrow">Your reading path</p><p class="reading-position" id="course--position">${sections.length ? `Chapter 1 of ${sections.length}` : 'No chapters published'}</p><progress id="course--progress" max="${Math.max(sections.length, 1)}" value="${sections.length ? 1 : 0}" aria-label="Current chapter position"></progress><ol>${navigation}</ol></nav><p class="rail-note">Follow the guide in order,<br>or jump to what you need.</p></aside>
<main id="course--main" tabindex="-1"><header class="course-intro"><p class="eyebrow">A repository learning companion</p><h1>Find your way<br><em>through the code.</em></h1><p class="course-subtitle">Build a mental model, follow the evidence, and test what you understand.</p><div class="course-meta"><span>${escapeHtml(state.audience)} audience</span><span>${escapeHtml(state.mode)} mode</span><span>${sections.length} ${sections.length === 1 ? 'chapter' : 'chapters'}</span></div><p class="source-name">Guide: <code>${escapeHtml(state.slug)}</code></p><div class="publication-status ${complete ? 'complete' : 'partial'}"><span class="status-mark" aria-hidden="true"></span><p><strong>${complete ? 'Complete within the recorded scope' : 'Partial learning guide'}</strong><span>${renderedCount} of ${diagrams.length} diagrams rendered.${missingCount ? ` ${missingCount} ${missingCount === 1 ? 'visual is' : 'visuals are'} incomplete; descriptions and source remain available.` : (!complete ? ' Final course certification is not complete.' : ' Coverage and limits are recorded below.')}</span></p></div>${sections[0] ? `<a class="begin-link" href="#${escapeHtml(sections[0].id)}">Begin with chapter 01 <span aria-hidden="true">↓</span></a>` : ''}</header>
${body}<footer class="course-footer"><p class="eyebrow">Scope &amp; provenance</p><h2>Know the boundaries.</h2><div class="footer-copy"><p><strong>Coverage:</strong> ${escapeHtml(state.coverage.scope)}</p>${state.coverage.limitations.length ? `<ul>${state.coverage.limitations.map((limit) => `<li>${escapeHtml(limit)}</li>`).join('')}</ul>` : '<p>No additional limitations recorded.</p>'}<p>${state.coverage.static_only ? 'This guide is based on static repository evidence; the target application was not executed.' : 'Interpret the guide within the recorded evidence and verification limits.'}</p><p class="privacy-note">This course quotes repository source. Treat it as internal unless reviewed for sharing.</p></div></footer></main></div>
<footer class="colophon"><span>EXPLAINER / A guide, grounded in source.</span><a href="#course--start">Back to top ↑</a></footer></div>
<dialog id="course--diagram-dialog" aria-labelledby="course--diagram-title" aria-describedby="course--diagram-help"><div class="dialog-header"><h2 id="course--diagram-title">Diagram</h2><button type="button" class="quiet-button" id="course--close-diagram" autofocus>Close <span aria-hidden="true">×</span></button></div><div class="zoom-toolbar"><button type="button" class="quiet-button" data-zoom="out" aria-label="Zoom out">−</button><output id="course--zoom-level" aria-live="polite">100%</output><button type="button" class="quiet-button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="quiet-button" data-zoom="fit">Fit diagram</button><p id="course--diagram-help">Zoom, then scroll to explore. Press Escape to return.</p></div><div class="zoom-stage" tabindex="0" role="region" aria-label="Enlarged diagram"><div class="zoom-canvas"></div></div><p id="course--diagram-caption" class="dialog-caption"></p></dialog>
<script>${script}</script></body></html>`;
}
