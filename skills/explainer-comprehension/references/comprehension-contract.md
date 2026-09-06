# Comprehension contract

Questions regulate learning depth; they are not decoration.

## Scored question sources

Every scored question, option, and explanation resolves to confirmed claims already taught in the current generation. If a fact is inferred or out of scope, replace it with a confirmed taught fact or record that the concept cannot be tested. The unscored builder conversation below deliberately asks about context the course cannot establish; only its factual premises are confirmed.

Use four cumulative backbone shapes when applicable:

1. order the action's evidenced hops;
2. identify where a demonstrated rule is enforced;
3. predict a demonstrated data or state change;
4. predict what runs next and whether the caller waits.

## Learning mechanics

- One prediction prompt opens each learning phase and is explicitly resolved later.
- Preparation sets from the trace phase onward include one or two earlier concepts.
- Distractors represent plausible misconceptions grounded in the course, not invented behavior.
- Correct positions and option lengths are balanced across a set.
- Feedback explains why each answer is right or wrong and points to the taught model.
- Each capability closes with the concrete new ability it contributes. Final delivery consolidates five distinct course-level outcomes without repeating a fixed five-item list per small capability.
- The terminal gate includes one free-text trace explanation for later human or evidence-based feedback.

The quiz measures the reader's understanding. It never scores repository quality, correctness, security, or performance.

## Diagnose a misconception

Ask the reader to predict an evidenced consequence, not recall a filename or recognize phrasing copied from the explanation. Specify the starting state and boundary conditions so the taught model yields one unambiguous answer. Compare adjacent concepts the course actually distinguished, such as accepting work versus completing it, or a local wrapper versus its external dependency. An option can describe a plausible misconception, but its rationale must explain why confirmed evidence rules it out under those conditions.

For each answer, explain the causal step that makes it right or wrong and point back to the relevant taught claims. If two options could be correct because context is missing, repair the question rather than blaming the learner. Do not manufacture a runtime guarantee, hidden business rule or hypothetical failure as a fact in order to grade a question.

The free-text teach-back asks for a short trace in the reader's own words: what enters, which decision matters, what changes, what returns and what remains unknown. When an actual answer arrives, identify the specific mistaken link, re-ground it and give a targeted explanation or follow-up rather than repeating the whole lesson. If it exposes an error in the course, refresh the owning capability and affected dependents before relying on the corrected claim.

Prediction prompts and practice are not approval gates and do not block publication while awaiting chat answers. Preserve unanswered as unanswered. The offline course grades only its supported option questions; it must not claim to evaluate free-text understanding or overall mastery automatically.

## Questions to take to the builders

Finish the learning journey with curiosity about the why, not another test of what the reader remembers. After the scored quiz and free-text teach-back, author a clearly headed closing in `quiz.content.consequence`, before the optional Codemap section. Include it in focused/change courses too, scaled to their actual scope; skipping Codemap does not remove it. Reuse this existing field, not new quiz options, state fields or an interview workflow.

Choose the few consequential puzzles this course uncovered: an unusual boundary, apparent duplication, asymmetry, deliberately unsupported case, surprising dependency, product rule or trade-off. Prefer a question a maintainer would recognize over generic architecture interview prompts. A light, memorable hook is welcome when it fits the evidence; avoid forced jokes, accusation, or invented incident stories. Do not pad a small code path into a whole-system discussion.

For each topic, connect:

- **What caught our attention:** the exact taught behavior or decision, with a chapter/source locator. Include its supporting claim IDs in the quiz section's `claim_ids`, so changes invalidate the closing too; prose citations alone do not bind dependencies.
- **What to ask:** an open, respectful question about original constraints, alternatives, failure experience or intent. Separate what the source establishes, what a cited decision record says, and what remains unknown. Do not ask a question the course already answered unless the follow-up probes a real remaining gap.
- **Why the answer matters:** the nuance it could add and a follow-up about which assumptions still hold or would differ elsewhere. Help the reader investigate whether a decision transfers to their context; do not prescribe keeping or changing the system.
- **Where to take it:** the relevant owning role or maintainer, when supported, and any known decision record or code path to bring along. If ownership is unknown, say so; never invent a person, team, interview, consensus or expert answer. An AI specialist is not the original builder.

Ground the premise in already taught evidence; do not introduce an unverified defect inside a leading question. A plausible rationale remains a hypothesis, not recovered tribal knowledge. Reuse supplied/local rationale when available and in scope, with provenance; code alone cannot establish the original author's motive. Missing history is a worthwhile conversation topic, not a certification failure or permission to contact people, fetch remote history, or perform research.

The closing is readable without interaction and publication never waits for answers. Later user-supplied context uses the existing doubts/re-grounding path, keeping attributed testimony separate from independently established behavior. Preserve existing published generations; do not relabel an old generic conclusion as builder questions it never contained.
