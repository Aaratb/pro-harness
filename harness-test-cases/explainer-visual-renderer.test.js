'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const modules = Promise.all([
  import('../scripts/lib/explainer-diagram.mjs'),
  import('../scripts/lib/explainer-visuals.mjs'),
  import('../scripts/lib/explainer-html.mjs'),
]);

test('local renderer produces passive SVG for flow sequence UML ER and state views', async () => {
  const [{ renderExplainerDiagram }, { safeSvg }] = await modules;
  const examples = [
    ['flowchart LR\nClient --> API\nAPI --> Store', ['Client', 'API', 'Store']],
    ['sequenceDiagram\nparticipant UI\nparticipant API\nUI->>API: Submit\nalt valid\nAPI-->>UI: Accepted\nelse invalid\nAPI-->>UI: Rejected\nend', ['UI', 'API', 'valid', 'Accepted', 'invalid', 'Rejected']],
    ['classDiagram\nclass Run {\n+String id\n+start() void\n}\nclass Case\nRun "1" *-- "many" Case : owns', ['Run', 'Case', 'owns']],
    ['erDiagram\nRUN ||--o{ CASE : contains\nRUN {\nstring id PK\n}\nCASE {\nstring runId FK\n}', ['RUN', 'CASE', 'contains', 'runId']],
    ['stateDiagram-v2\n[*] --> Pending\nPending --> Complete: evidence ready\nComplete --> [*]', ['Pending', 'Complete', 'evidence ready']],
  ];
  for (const [source, labels] of examples) {
    const svg = safeSvg(renderExplainerDiagram(source));
    assert.match(svg, /<svg\b/);
    for (const label of labels) assert.ok(svg.includes(label), `${source.split('\n')[0]} must retain ${label}`);
    assert.doesNotMatch(svg, /@import|<foreignObject|<script|fonts\.googleapis/i);
    assert.doesNotMatch(svg, /(?:fill|stroke|stop-color)="[^"]*(?:var\(|color-mix\()/);
    assert.match(svg, /<rect[^>]*width="100%"[^>]*height="100%"/);
  }
  assert.ok(renderExplainerDiagram('flowchart LR\nA["literal var(--_text)"] --> B').includes('literal var(--_text)'), 'paint normalization must not rewrite source labels');
});

test('renderer rejects known lossy and unsupported syntax rather than inventing a diagram', async () => {
  const [{ renderExplainerDiagram }] = await modules;
  const unsupported = [
    'sequenceDiagram\nautonumber\nA->>B: step',
    'sequenceDiagram\nA-xB: cancelled',
    'sequenceDiagram\nA->>B: start\nalt missing end\nB-->>A: result',
    'sequenceDiagram\nA->>B: start\nunknownDirective hide this',
    'sequenceDiagram\nparticipant A\nparticipant B\nNote over A: Requires authorization\nA->>B: request',
    'flowchart LR\nA --> B\nclick A "https://example.invalid"',
    'gantt\ntitle Timeline\nsection one\nBuild :a, 2026-01-01, 1d',
    '%%{init: {securityLevel: loose}}%%\nflowchart LR\nA --> B',
  ];
  for (const source of unsupported) assert.throws(() => renderExplainerDiagram(source), /unsupported/i, source);
});

test('UML ownership diamonds dock outside both class endpoints rather than beneath their boxes', async () => {
  const [{ renderExplainerDiagram }] = await modules;
  for (const [arrow, marker, end] of [['*--', 'composition', 'start'], ['--*', 'composition', 'end'], ['o--', 'aggregation', 'start'], ['--o', 'aggregation', 'end']]) {
    const svg = renderExplainerDiagram(`classDiagram\nOwner "1" ${arrow} "many" Part`);
    assert.match(svg, new RegExp(`<marker id="cls-${marker}"[^>]*refX="12"[^>]*orient="auto-start-reverse"`));
    assert.ok(svg.includes(`marker-${end}="url(#cls-${marker})"`));
    assert.match(svg, /data-from-cardinality="1" data-to-cardinality="many"/);
  }
});

test('SVG guard accepts local markers but rejects active content and network-capable styles', async () => {
  const [, { safeSvg }] = await modules;
  const passive = '<svg xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow"><path d="M0 0 L8 4 L0 8"/></marker></defs><style>text{fill:#233b36}path{stroke:var(--line,#216b62)}</style><path d="M0 0 L20 20" marker-end="url(#arrow)"/></svg>';
  assert.equal(safeSvg(passive), passive);
  for (const payload of [
    '<script>alert(1)</script>', '<foreignObject><div>active</div></foreignObject>',
    '<image href="//example.invalid/secret"/>', '<use href="file:///tmp/private"/>',
    '<use xlink:href="&#104;ttps://example.invalid/secret"/>',
    '<path onload="alert(1)"/>', '<set attributeName="onload" to="alert(1)"/>',
    '<style>@import "https://example.invalid/style.css";</style>',
    '<style>path {fill:url(//example.invalid/paint)}</style>',
    '<path style="fill:u\\72l(//example.invalid/paint)"/>',
    '<path fill="url(&#104;ttps://example.invalid/paint)"/>',
    '<path cursor="url(https://example.invalid/cursor.svg), auto"/>',
  ]) assert.throws(() => safeSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${payload}</svg>`), /forbidden/, payload);
  for (const svg of ['<svg></svg>', '<svg><rect></svg>', '<svg><defs><path d="M0 0L10 10"/></defs></svg>', '<svg><text> </text></svg>']) assert.throws(() => safeSvg(svg), /malformed|drawable|empty/i, svg);
});

test('field guide preserves structured evidence and isolates SVGs with a matching script CSP', async () => {
  const [, , { htmlFor }] = await modules;
  const diagram = { id: 'view', title: 'Ownership', source: 'flowchart LR\nA --> B', rendered_svg: 'diagrams/view.svg', alt: 'A owns B', claim_ids: [] };
  const section = { id: 'architecture', title: 'Who owns the result?', phase: 3, status: 'gated', diagrams: [diagram], content: {
    orientation: 'Why does **ownership** matter?', mechanism: 'One request, two boundaries.\n\n- Read the first edge\n- Follow the response',
    evidence: '| Location | Meaning |\n|---|---|\n| `src/store.js:2` | Persists the result |\n\n```js\n  const result = value + 1;\n```\n\n<script>unsafe()</script>',
    consequence: 'The result is owned by the store.',
  }, quiz: [{ question: 'Who owns </script><script>evil()</script> the result?', options: ['Store', 'Caller'], correct_index: 0, explanations: ['Persisted by the store.', 'The caller only requests it.'], claim_ids: [] }] };
  const state = { slug: 'synthetic-example', mode: 'COURSE', audience: 'FSB', coverage: { scope: 'Synthetic renderer fixture', static_only: true, limitations: ['Not an actual product explanation.'] } };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow"/></defs><text>A owns B</text></svg>';
  const html = htmlFor([section], state, new Map([['architecture/view', svg]]));
  assert.match(html, /<table>/);
  assert.match(html, /<ul><li>Read the first edge/);
  assert.match(html, /<pre[^>]*><code>  const result = value \+ 1;/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<svg\b|<script>evil/);
  assert.equal((html.match(/<script>/g) || []).length, 1);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash = crypto.createHash('sha256').update(script).digest('base64');
  assert.ok(html.includes(`sha256-${hash}`));
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<style>'));
  assert.ok(html.indexOf('class="diagram-figure') < html.indexOf('class="evidence"'));
  assert.match(html, /<details class="evidence"><summary>/);
  assert.match(html, /<dialog\b/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /Partial learning guide/);
  assert.doesNotMatch(html, /data-result="correct"|aria-label="Correct/);
  section.diagrams = ['title', 'q1--feedback'].map((id) => ({ ...diagram, id }));
  const collision = htmlFor([section], state, new Map(section.diagrams.map(({ id }) => [`architecture/${id}`, svg])));
  const ids = [...collision.matchAll(/\sid="([^"]*)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'diagram ids must not collide with headings or quiz feedback');
});
