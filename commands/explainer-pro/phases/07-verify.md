# Phase 7 — Verify

Certify the taught material, test the reader's model, and publish the current course generation.

## Required work

1. Freeze the candidate claim pool and check coverage, source freshness, dependency closure, and existing independent verifier records. Reuse unchanged verified claims under the grounding contract; a fresh verifier rereads source for new, changed, materially dependent, or unverified claims and never inherits author confidence. Do not reauthor or reverify the unchanged course merely to reach this phase.
2. Demote failed claims, quarantine unverified material, invalidate dependent sections, and update the coverage statement.
3. Reuse phase prediction prompts and interleaved preparation checks authored earlier, then consolidate five concrete course-level `you can now explain` outcomes and a cumulative comprehension gate. Never invent earlier learner interactions.
4. Build questions and all option rationales only from confirmed claims the course already taught. Do not test unrelated stack knowledge or hide answers through option patterns.
   Then use Explainer Comprehension's builder-conversation method: put the teach-back and source-anchored questions about missing rationale in the quiz section's `content.consequence`, rendered after the quiz and before optional Codemap. Bind factual premises through section `claim_ids`; review for invented intent, leading unsupported claims and generic filler. These questions are unscored and do not require answers before publication.
5. Publish `EXPLAINER.md` and one self-contained accessible `course.html`: an inviting reading path, rendered diagrams alongside their mechanism, expandable technical evidence, legible type, and a concrete question-to-takeaway rhythm. The publisher renders supported Mermaid locally. Resolve any `render_warnings` using the local diagram capability; source-only diagrams remain partial and cannot certify as finished visuals. Keep inline styling and behavior, semantic structure, visible focus, responsive layout, escaped source-derived text, and no external assets.
6. Validate links, section order, code whitespace, quiz behavior, claim references, generation manifest, and `CURRENT` through one lifecycle gate. Inspect the actual published HTML in a local browser when available: a representative architecture/sequence view at desktop and narrow width, visible labels and arrow directions, enlargement/close and focus restoration, evidence/source disclosures, chapter navigation, and a practice answer. Correct visual defects before delivery; disclose unavailable browser inspection rather than claiming that static validation proved visual quality. Do not rerun the course validator separately when the hook already invokes it.

Alongside claim grounding, check coherence: can the taught model predict the running example without contradicting another section, diagram or answer rationale? Correct simplifications that change meaning. Missing context or multiple defensible quiz answers require a better explanation/question, not forced confidence. Do not grade the repository or turn this check into another full review. Publication does not wait for the user to take the quiz.

## Artifacts

- `sections/comprehension.json`
- immutable generation manifest and certified claim pool
- `EXPLAINER.md`
- `course.html`
- updated `CURRENT`

## Gate

The phase fails when a material claim is self-certified, a quiz relies on inferred content, a claimed finished visual is absent/unrendered or materially misleading, the HTML has external dependencies or unsafe markup, a dependent section is stale, or the current pointer and manifest disagree.
