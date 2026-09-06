# Explanation quality contract

Correct evidence is necessary but not sufficient. The course must leave the reader able to reason and act safely.

## Four-layer section

Every section follows this order:

1. `Orientation`: two to four sentences explaining the purpose in business or user terms with no unexplained jargon.
2. `Mechanism`: how it works in plain language using the repository's real names but not requiring code fluency.
3. `Evidence`: cited tables, annotated code, or diagrams precise enough for an engineer to verify.
4. `Consequence`: what depends on it, what breaks if it changes, what is safe within demonstrated boundaries, and where an analogous change already belongs.

A reader who stops after any layer must hold a coarser but still correct model. Flag simplifications immediately when later precision would otherwise contradict them.

These are authoring layers, not four identical slabs of visible text. Use a reader-facing chapter title such as "Why a successful request can still be pending", not a capability slug. The orientation poses the motivating question, the mechanism introduces what to look for, a rendered view makes the relationship visible, and consequence answers that question and opens the next one. Evidence is expandable; preserve citations and precise code without making a source dump the default reading experience.

## Visual learning experience

Give the guide an intentional editorial hierarchy: a useful reading path, generous but not empty spacing, legible typography, restrained semantic color, clear captions, and chapter-to-chapter momentum. Let diagrams carry relationships rather than decorating a prose report. Lead with a concrete tension, surprising boundary, or useful prediction supported by source; never manufacture drama or historical intent. Avoid generic dashboard cards, a repeated template headline in every chapter, ornamental gradients, walls of monospace, and an appendix of diagrams detached from the story.

Teach one visual at a time: name its question, point out where the running example enters and which edge or boundary matters, then state the takeaway. Choose UML/component, sequence, ER, state, or flow by what the reader must understand. Split a tangled view into an overview and a focused path; do not solve illegibility by shrinking text. Preserve real actor names, explicit arrows and branch labels, a consistent visual vocabulary, and meaningful alt text. Overview and detail are complementary, not duplicate prose.

The page must work as a reading artifact before any interaction. Use enlargement for dense diagrams, optional evidence/source disclosures for depth, and practice to reward understanding. Essential meaning must not depend on hover, animation, color alone, or JavaScript. Inspect a real published chapter at desktop and narrow width: can a reader find the start, read the visual, follow its consequence, and choose what to learn next? Structural validation does not prove taste or teaching quality.

## Audience and learning purpose

Start from what the reader wants to understand or predict, reusing their question and prior answers rather than adding an intake questionnaire. Use the same evidence and running example for every audience; change emphasis and vocabulary, never certainty or safety boundaries.

| Audience | Emphasis |
|---|---|
| PM | The user promise, policy or eligibility decisions, visible states, limits and consequences; retain the technical boundary needed to avoid a wrong product assumption. |
| ENG | Entry contracts, control and data flow, shared functions, state/effect ownership, failure exits and what the existing tests actually assert. |
| STAFF | Cross-boundary authority, temporal behavior, coupling, deployment/configuration assumptions and how local behavior composes into the stated outcome. Explain existing constraints, not a redesign. |
| FSB | End-to-end understanding across product purpose and user value; UX/design and accessibility; engineering, architecture, data and code reuse; QA and test evidence; security and privacy; performance and cost; operations, observability and recovery. Include AI behavior, evaluations and harness boundaries when relevant to the repository. Connect these aspects through the same running example. |

FSB means broad coverage, not uniform depth or an exhaustive audit. Relate each relevant discipline to the user outcome and the others: how a product rule appears in the experience, which code and data enforce it, what tests establish, and how the current system exposes failure or recovery. Use progressive depth and the four teaching layers; do not combine three duplicate courses, add agents or phases, or execute tests because the audience is broader. Keep out-of-scope aspects and evidence gaps explicit; do not invent missing mechanisms or prescribe improvements. Keep the label FSB without assuming an expansion or a level of prior expertise.

Do not infer a person's expertise from the label alone. Define unfamiliar terms once, connect to what is already known and deepen the precise point of confusion. Experts need a sharper model, not more boilerplate; plain language must not erase meaningful distinctions.

## A worked model, not code narration

Choose one ordinary, safe illustrative input or checked-in fixture supported by the scoped implementation. Mark made-up values as hypothetical; never imply they were observed in a user session or production. Follow what the same action knows before a decision, which rule selects the next step, what state or effect changes, what returns and what remains pending. Keep stable actors and vocabulary across views.

Use an evidenced contrasting branch to expose a likely misconception: for example, an accepted request need not mean a background effect completed. Explain the changed condition and resulting path; do not invent a retry, denial or compensation just to make the story richer. An analogy must state where it stops matching the code. Explain supported consequences of a mechanism separately from an author's historical reason for choosing it.

For each important boundary, make a useful prediction possible and show the evidence that supports it. The explanation should answer "what changes if this evidenced condition differs?" without prescribing a code change. Prefer this to a line-by-line translation or a list of every helper.

## Teaching rhythm during authoring

Open each learning phase with one brief unscored prediction about the model it is about to teach, and resolve it within that phase's course content. From the trace phase onward, connect one or two earlier concepts when they help the current question. These are authored learning prompts, not approval gates: do not block progress waiting for a chat answer unless the user requested an interactive lesson. Do not claim a learner answered a prompt they never saw.

Keep scored cumulative practice and its full method in Phase 7. Earlier prompts need no extra skill fanout or publication. Close a capability with the concrete new ability it adds; consolidate five distinct course-level "you can now explain" outcomes at final delivery rather than repeating five near-identical outcomes for every small capability. Reuse established explanations and their evidence while adding only the new relationship.

Notice the decisions whose rationale the code cannot settle as you teach. Retain useful cues and source references in existing lane `surprises` or `narrative_notes`; Phase 7 curates them into questions to take to the builders after the quiz. Do not manufacture an origin story or interrupt each chapter with a new interview. The reader should leave knowing both how the system works and which whys are worth pursuing with its maintainers.

## Narrative rules

- Make the explanatory claim before its table, code block, or diagram. Introduce what to notice and close with what the evidence showed.
- Explain why a mechanism exists or what consequence its ordering creates. Do not translate syntax into redundant prose.
- Open with a callback to prior knowledge and close with the next question the course resolves.
- Use one running example throughout and the same term for the same concept.
- Define jargon at first use, persist it in the registry, and link later uses.
- Depth follows importance. Routine plumbing can be brief; material decisions, boundaries, and failure paths receive detail.
- Never imply a safe modification beyond patterns the course has actually demonstrated.

## Required learning outcomes

The combined course lets the reader:

- describe the product or package purpose and find the starting files;
- follow a dependency-aware reading path;
- explain system responsibilities and point to their real implementations;
- trace a user or caller action through decisions, effects, and outcomes;
- identify where demonstrated business rules live;
- predict important branches, exits, state changes, and deferred work;
- understand dependency blast radius, data relationships, and lifecycle;
- use the repository's dependencies and conventions as currently demonstrated;
- speak the repository's vocabulary and answer cumulative comprehension questions.

## Defects

Treat these as failures: code narration, unexplained table dumps, jargon before definition, claims with no why, stacked hedges, generic framework tutorials, decorative diagrams, citations only on trivia, passive actors, orphaned sections, uniform detail, silent simplification, or quiz questions that test material never taught.
