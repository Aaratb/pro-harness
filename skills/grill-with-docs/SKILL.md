---
name: grill-with-docs
description: "Stress-test a coding decision against repository evidence, shared terminology, edge cases, and durable architectural consequences."
---

# Grill With Docs

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `workspace-codemap-context` only when this workflow reaches the step that needs it.

## Workflow

1. Load the proposed decision and the smallest relevant repository evidence packet.
2. Challenge ambiguous terms, unsupported assumptions, failure behavior, compatibility, ownership, and alternatives one question at a time.
3. Classify the result as clear, confirmation-needed, or deeper review-needed and capture ADR-worthy decisions.

## Interactive questions

For a decision with meaningful alternatives, use the runtime's native question/option selector when available and permitted in the current mode. Ask one focused question with 2–3 distinct options, each with a short trade-off. Put a recommendation first only when evidence supports it; explain why without steering away from valid alternatives. Always allow a custom free-text answer using the runtime's supported mechanism.

For open discovery, ask an open question rather than inventing choices. If no native selector is available, show the same concise choices in chat and invite a custom answer; do not install tooling or change modes just to render a selector. A suggested or preselected option is not a submitted answer or approval. Wait for the user's actual response when the decision blocks progress. Reuse prior answers; do not add interview rounds to satisfy a checklist.

## Output

Update the decision artifact beneath `artifact_root` with resolved language, evidence, assumptions, and open decisions.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
