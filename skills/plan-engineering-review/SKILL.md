---
name: plan-engineering-review
description: "Review an implementation plan for boundaries, dependencies, sequencing, failure modes, verification, migration, and rollback."
---

# Plan Engineering Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Trace every planned slice to interfaces, files, dependencies, and acceptance evidence.
2. Challenge hidden coupling, unsafe sequencing, unclear ownership, missing migrations, and rollback gaps.
3. Require executable verification targets and explicit blockers.

## Failure-oriented design review

Review the actual path, not just the file list: input → branches → durable state/side effects → user outcome. For material boundaries, simulate a plausible failure and record trigger, affected state/users, detection, and recovery. Consider delayed responses, concurrent edits, retries, duplicates, unavailable dependencies, and authorization where applicable; explain N/A rather than forcing distributed concerns onto local work.

Ask who owns each invariant and whether it is enforceable at that boundary. Challenge unnecessary services, duplicated repository capabilities, hidden synchronous dependencies, and abstractions without a present consumer. Show why the simpler alternative does or does not satisfy the approved constraints.

Map the most consequential risks to exact assertions and test levels. A test file, line-count budget, or green mock is not proof of behavior. Identify the real integration that a mock can hide, the negative case that would falsify the design, and what data/state recovery must preserve. For probabilistic components, keep deterministic contract tests separate from quality evaluations.

Example: “retry safely” is incomplete if the remote operation may have succeeded before the timeout. Require an explicit duplicate-effect policy and evidence for recovery. Prefer a few decision-changing findings over an exhaustive catalogue of theoretical risks; preserve unknowns and dissent rather than manufacturing certainty.

## Output

Return engineering-plan findings and concrete amendments.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
