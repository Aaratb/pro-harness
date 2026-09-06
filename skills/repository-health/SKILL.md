---
name: repository-health
description: "Measure a repository's current build, type, lint, test, dead-code, dependency, and documentation posture as a reproducible baseline."
---

# Repository Health

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Detect only tools and commands configured by the repository.
2. Inspect their side effects before running bounded non-destructive checks; preserve exact status and timing.
3. Score only observed dimensions, redistribute absent-tool weight, and distinguish baseline failures from change regressions.

## Safe and relevant execution

Inspect the selected command, configuration, and lifecycle hooks before execution. A command named test, lint, or build may rewrite snapshots, generate application files, populate caches outside the artifact root, start services, contact external systems, or modify data. In Review Pro, source-read-only applies to those indirect effects too. Use only an already-supported non-mutating invocation or an explicitly approved isolated environment; otherwise report the blocked check. Do not install dependencies, invent commands, update snapshots, write tests, or change configuration to make a check run.

Select configured checks that answer the change's actual risks, then expand when failures or affected consumers warrant it. Preserve the exact command, working directory, reviewed revision, exit status, duration, relevant environment, and bounded redacted output. Separate a failed check from an unavailable or unexecuted check. A cached or historical result needs matching identity and coverage; do not silently relabel it as a fresh run or move Git state to construct a baseline.

## Inspect what the tests can prove

For material changed behavior, read the relevant existing test setup, action, and assertions. Identify the invariant or user outcome the test can actually falsify. A successful exit, high coverage percentage, HTTP 200, snapshot match, or asserted mock call may not establish correct state, durable effects, authorization, or recovery.

Check whether mocks and fixtures bypass the risky boundary, reproduce the same mistaken assumption as the implementation, use the wrong role or tenant, or omit the transition changed by the patch. Look for swallowed failures, disabled assertions, skipped cases, nondeterministic timing, and a setup that cannot reach the claimed scenario. Evaluate negative and adjacent cases proportionately: wrong authority, stale state, repeated action, partial failure, and recovery only where relevant.

Ask whether the existing assertion would fail if the suspected behavior were wrong. This is a read-only reasoning check, not permission to mutate code or author a failing test. Explain the missing assertion or boundary as a verification gap; missing tests alone do not prove a product defect. Likewise, a passing suite does not refute a reachable finding if none of its assertions exercise that path.

For example, a request test that stubs persistence and asserts only success cannot prove that an update survives an independent read. Identify whether another existing test actually crosses that boundary; do not demand a new test layer when the repository already has equivalent evidence.

## Output

Write the repository-health baseline beneath `artifact_root`, or return the caller's assigned evidence/lane report. Distinguish command health, assertion quality, and uncovered risk in the existing fields. List actual checks and results separately from recommended checks; do not create an extra report per tool or convert a missing-tool weight adjustment into readiness certification.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
