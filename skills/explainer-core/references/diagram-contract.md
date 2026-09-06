# Diagram contract

Use the smallest diagram that adds a relationship prose or a table cannot show.

## Families

| Diagram | Adds |
|---|---|
| system or component | boundaries and communication shape |
| module or type | static ownership and association |
| feature flow | simple customer-to-outcome causality |
| code execution | branches, effects, and exits inside one symbol |
| sequence | time, direction, blocking, and alternate paths |
| entity relationship | ownership and cardinality |
| state machine | reachable lifecycle transitions |
| dependency graph | fan-in, fan-out, and reverse impact |

Architecture requires system/component, static module/type, and representative sequence views. A selected feature requires a simple feature flow; rule-bearing functions require code-execution views; system views add relationship, state, or dependency diagrams only when relevant.

Every edge resolves to a claim identifier. Every visual has a lead-in, a takeaway, real repository labels, and the one running example's values. Straight-line plumbing can carry a cited `diagram not needed` statement instead of decorative boxes.

## Rendered means visible

Keep canonical Mermaid in `source`. The publisher automatically renders supported flowchart, sequence, UML class, ER, and state syntax using its bundled local renderer when `rendered_svg` is null. It needs no network, browser download, or runtime package install. Prefer ordinary semantic notation; the renderer rejects unsupported constructs rather than silently discarding them. Its error is a request to use another local renderer, not permission to remove important branches or simplify away meaning.

For unsupported notation, use the existing local `diagram.render` capability and provide the repository-local SVG in `rendered_svg`. Preserve all grounded semantics and verify source-to-visual correspondence. If neither path succeeds, publish only a visibly partial draft with a concise missing-visual notice and collapsed canonical source. Do not label it a completed visual course. Full COURSE/MIXED certification requires architecture, sequence, and dependency visuals; every declared diagram must have a rendered asset. Focused CHANGE work chooses diagrams by the changed relationship rather than a quota.

Publication isolates each sanitized SVG as an offline vector image; separate diagrams cannot collide through marker IDs or page-wide CSS. Keep actual labels readable at normal reading width, split overlarge views, provide an explanatory caption and useful enlargement, and visually inspect a representative dense view before delivery. A parser accepting source, or an SVG file existing, does not establish correct rendering or grounded meaning. Never publish diagrams externally, depend on remote assets, or use ASCII art as the primary diagram.
