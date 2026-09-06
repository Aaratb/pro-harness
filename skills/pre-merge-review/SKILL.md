---
name: pre-merge-review
description: "Run a structured pre-merge review over the complete diff, tests, architecture, risks, and release implications before specialist synthesis."
---

# Pre Merge Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `general-coding-standards` only when this workflow reaches the step that needs it.
- Load `security-review` only when this workflow reaches the step that needs it.

## Workflow

1. Freeze the diff revision and load surrounding code, contracts, tests, and repository rules.
2. Establish the intended user or operator outcome, then trace the change through affected callers, state, contracts, tests, and visible effects.
3. Review correctness, maintainability, reliability, security indicators, performance, compatibility, and evidence gaps in that path, not as unrelated checklists.
4. Separate findings from preferences and independently verified defects from candidates. Do not edit reviewed source, tests, configuration, or Git state.

## Before and after, not just the patch

Use the accepted requirement, documented contract, existing behavior, and repository conventions to establish what should remain true. When they conflict, identify the ambiguity rather than inventing a product promise. Review completed work against the agreed outcome; do not reopen product strategy or demand a redesign simply because another implementation is possible.

Compare meaningful states before and after the change: existing and new users, roles and tenants, entitlements, empty and populated data, loading, error, retry, cancellation, and recovery where relevant. Read removed branches, affected consumers, tests, and orphaned locale keys as clues to lost behavior. A deleted string or branch is not itself a defect; show the reachable state and consequence. For example, a redesigned upgrade flow may preserve new-user messaging while silently dropping the billing disclosure for an already-paying user.

Follow a material path from entry and preconditions through authorization, validation, computation, persistence or external effects, and the result the user receives. Check invariants across boundaries: an accepted action happens once, a failed action does not leave a partial result, a stale response cannot replace newer state, and ownership cannot change through an untrusted identifier. Select the invariants the actual change threatens; do not force every example onto every file.

Inspect neighboring consumers and existing services, functions, and shared contracts before criticizing reuse. A local difference may be intentional; duplication matters when it causes conflicting behavior, inconsistent policy, or a concrete maintenance hazard. Compare the smallest compatible correction with any proposed abstraction. Style, naming, file length, preferred libraries, or architectural fashion alone cannot establish a production blocker.

## Make a finding survive challenge

For each material candidate, explain expected versus actual behavior, the trigger, changed-path reachability, observable impact, and the evidence that would disprove it. Look for caller guarantees, constraints, feature flags, transaction boundaries, fallback paths, and tests that might already prevent the failure. Separate a change regression, a newly exposed pre-existing condition, and an unrelated baseline defect; do not attribute all existing problems to the patch.

Use source evidence to describe the suspected failing boundary and a falsifiable validation target. Do not claim executed behavior from a code walkthrough or turn review into root-cause diagnosis, exploratory debugging, test authoring, or repair. In Review Pro, only its independent evidence gate can confirm a material candidate. Preserve uncertainty when the intended contract, reachability, or protection is unresolved.

## Output

Write a severity-sorted pre-merge report beneath `artifact_root`, or return the caller's assigned lane report when one is supplied. Lead with the release-relevant findings and their customer or operator consequence, then evidence gaps and non-blocking advice. Reuse existing report fields; do not create a parallel checklist or extra artifact for each review lens.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
