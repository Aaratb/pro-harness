# Explainer Pro visual guides

`course.html` is the primary reading artifact. It contains the course, styles,
behavior, and vector diagrams in one offline file. `EXPLAINER.md` links the local
SVG sidecars and retains canonical diagram source in disclosures.

## What the reader gets

- A numbered reading path with current-chapter navigation.
- Question-led chapters: orientation, mechanism, visual, optional source evidence,
  and consequences that lead to the next useful question.
- Rendered diagrams with captions, enlargement and zoom. Without JavaScript,
  the diagrams and disclosures still work, with a scrollable zoom fallback.
- Structured evidence: prose and tables stay readable; actual code keeps whitespace.
- Optional comprehension practice with feedback after choosing an answer.
- After the quiz and teach-back, questions to take to the builders: source-anchored
  puzzles, missing decision context, why the answer matters, and where to ask.
  This unscored closing precedes optional Codemap and remains when Codemap is skipped.
- Keyboard focus, a skip link, responsive layout, print styles and reduced motion.

The renderer supplies presentation, not understanding. Authors still choose the
right view, ground every important relationship, explain what to notice, and
inspect whether the result teaches a useful mental model.

The closing reuses the quiz section's `content.consequence`; its factual premises
remain claim-bound, but it never invents expert answers or historical rationale.
Existing generic conclusions retain their original wording when republished.

## Rendering without setup

The existing `explainer-course.mjs publish` command renders supported Mermaid
when a diagram's `rendered_svg` is null. It supports bounded flowcharts, sequences,
UML class relationships, ER diagrams, and state diagrams. There is no runtime
dependency installation, browser process, hosted renderer, font download or CDN.
Only the generated SVGs—not the rendering library—are embedded in the course.

A pinned renderer, layout dependencies, and SVG XML parser add about 1.53 MiB to the harness.
Versions, licenses, corresponding source and reproducible modifications are in
[the renderer notice](../scripts/vendor/beautiful-mermaid/README.md).

This is not full Mermaid compatibility. Known unsupported syntax includes
autonumber, notes before the first sequence message, explicit sequence activation directives, crossed-out/headless arrows,
custom styles/links/configuration and other diagram families. Unsupported input
returns `render_warnings`; it is never silently discarded. Do not erase meaningful
branches to make a diagram render. Use the existing local `diagram.render`
capability and supply a safely rendered SVG under the explicit artifact root.

## Honest completion

Partial publication remains useful while a course is being built. A missing visual
shows a compact incomplete notice and collapsed source, not a giant code block
masquerading as a finished diagram. `--certified` refuses unrendered declared
diagrams. Full COURSE/MIXED certification also requires architecture, sequence
and dependency visuals; focused CHANGE work selects views by relevance.

SVG sidecars are checked for active or external content, digested, and isolated
as individual SVG images inside the HTML. The course uses a restrictive content
security policy. Publication keeps its existing fingerprint, independent-evidence,
dependency invalidation, staging and immutable-generation guarantees.

Inspect a published example at desktop and narrow widths, including the densest
diagram, enlargement/close/focus, chapter links, disclosures and practice. If
browser access is unavailable, state that this inspection is unverified. Passing
schemas or SVG existence checks cannot establish legibility, taste, or fidelity.

Existing published courses are immutable and do not change in place. Publish a
new generation using compatible, unchanged evidence, or run a new course. The
historical harness and target repository source are not modified by this upgrade.
