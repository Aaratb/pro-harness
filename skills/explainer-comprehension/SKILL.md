---
name: explainer-comprehension
description: "Verify the taught claim pool and create prediction prompts, interleaved practice, cumulative quizzes, and actionable learner summaries."
---

# Explainer Comprehension

Use in Phase 7 or for the `quiz` capability. Load Explainer Core, all current certified sections, and `references/comprehension-contract.md`.

## Workflow

1. Freeze the candidate generation, check coverage and freshness, and preserve valid independent records for unchanged claims. Use a fresh source-reading verifier for new, changed, materially dependent, or unverified material and new comprehension claims, following Explainer Core's reuse rules.
2. Demote failures, quarantine unresolved claims, and invalidate dependent sections before question generation.
3. Reuse the unscored predictions authored and resolved during the learning phases under Explainer Core; do not retroactively claim those interactions occurred.
4. Reuse preparation links to earlier concepts from the trace phase onward, adding only what helps test the current model.
5. Build the cumulative gate from confirmed claims already taught in the course. Include path order, rule ownership, state change, and what runs next when those subjects are in scope.
6. Give every option immediate right-or-wrong feedback and an evidence-backed explanation. Balance answer positions and option length so presentation does not reveal answers.
7. Consolidate five distinct course-level things the reader can now explain or predict, using the concrete abilities introduced by capabilities rather than duplicating five per capability.
8. Include one free-text teach-back prompt. Record a submitted answer or unresolved question as a doubt for later evidence-based feedback; do not fabricate a learner response. An offline page does not pretend to grade prose automatically.
9. End with a curated set of source-anchored questions to take to the system's builders, following the reference's builder-conversation method. Author the teach-back followed by this closing in the quiz section's existing `content.consequence`; the publisher places it after the scored questions and before any Codemap section. Unknown rationale is not a quiz answer. No extra phase, capability, agent or interview is required.

## Boundary

This skill evaluates the reader's model, never the repository. Known-bug practice may teach from already observed contradictions but cannot issue a correctness verdict, severity, or fix.

Practice is not a mandatory chat examination. Native question selectors may support an explicitly interactive lesson; their selected default is not an answer or approval. Course publication does not depend on the user completing the quiz. Correct answers demonstrate only the taught distinctions they test, not general repository mastery.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
