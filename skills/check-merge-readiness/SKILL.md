---
name: check-merge-readiness
description: "Synthesize review, CI, risk, compatibility, migration, and approval evidence into a clear merge-readiness decision."
---

# Check Merge Readiness

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `score-change-risk` only when this workflow reaches the step that needs it.
- Load `verification-before-completion` only when this workflow reaches the step that needs it.

## Workflow

1. Load the exact revision, findings, check status, approvals, migration, rollout, and rollback evidence.
2. Apply an explicit readiness rubric and distinguish blockers, conditions, and follow-up work.
3. Return a decision with confidence and evidence gaps rather than treating absence of findings as approval.

When the caller is reviewing local working files or an initial snapshot, distinguish completed local inspection from unperformed PR/CI/release checks. No remote or initial commit is needed to inspect local work. Review Pro caps these modes at `SAFE_WITH_CONDITIONS`; never imply merge readiness or weaken defect and evidence gates.

## Output

Write the merge-readiness verdict beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
