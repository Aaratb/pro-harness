---
name: change-explanation
description: "Explain a pull request, branch, or working-tree change through surrounding context, core intent, conceptual code groups, consequences, and comprehension practice."
---

# Change Explanation

Use for Explainer Pro `CHANGE` mode or `--capability change`. Load Explainer Core and `references/change-intake.md` first.

## Workflow

1. Resolve the change and comparison base without assuming `main` or `master`.
2. Use the safe Node change-intake helper for local Git evidence. Use source-control read capability only for an approved remote pull-request lookup.
3. Explore surrounding code, callers, tests, contracts, and configuration. A diff alone cannot establish background.
4. Explain the prior system, the smallest useful mental model of the change, and the implementation in execution or dependency order rather than filename order.
5. Distinguish observed effects from inferred intent. Intent is confirmed only by cited commit, plan, issue, or pull-request evidence.
6. Show before/after behavior, data flow, edge cases, and consequences where evidence supports them.
7. Publish the change section into the course generation and create comprehension practice from confirmed taught claims.

## Explain the semantic change

Compare before and after for the same evidenced input, caller and state. Name what changed and what stayed unchanged: eligibility, authority, data shape, ordering, durable effects, returned result or failure behavior. Explain the diff in conceptual groups that answer the reader's question; a rename, file move or added abstraction is not automatically a behavior change. Check callers and surrounding contracts before drawing that conclusion.

Use relevant tests to show the expected outcome and what their assertion or mock omits; do not say the tests passed without execution evidence, and this workflow does not run them. Keep the reason for the change inferred unless a cited decision establishes it. A lost state or contradictory path discovered during explanation is a severity-free question for Review, not a diagnosis or prescribed fix.

Carry the same safe illustrative example through both versions, labeling any hypothetical values. Distinguish a source-grounded prediction from an observed runtime outcome. End with the new mental model and affected dependencies, not a file-by-file changelog or a quality verdict.

## Boundaries

Never grade the change, execute it, or modify the target. Exclude credentials, ignored secret paths, symlinks, binary files, and oversized untracked files before reading content. All Git calls use argument arrays, an allowlist, disabled hooks/pagers/external diffs, and a controlled environment.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
