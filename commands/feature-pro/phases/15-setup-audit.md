# Phase 15: Setup Audit

> Load this file only when this phase is selected or resumed.

- **Skills**: `verification-before-completion`, `repository-health`; add `observability-by-design` and conditional `ai-product-engineering` for their release evidence
- Run sequentially: lint -> types -> build -> test suite.
- If anything fails, dispatch only the matching canonical build/runtime resolver, re-run, and loop until green or 3 retries.
- **Cannot be skipped.** Must pass before Phase 16.
- Validate `$FEATURE_ROOT/run-events.jsonl` with `validate-workflow-trace.mjs`. For applicable runtime/API/AI work, verify the product observability contract, API evidence and sequence comparison, and conditional AI evaluation gate; an INFERRED result cannot satisfy these release checks.
- For approved sequence-only trace recovery, follow `observability-by-design/references/workflow-tracing.md`. The validator automatically follows the hash-linked continuation and reports historical gaps. `recovered-with-gaps` satisfies tracing only; reconcile stale checkpoint and earlier gate evidence before Phase 16. Never restart completed work solely for recorder damage, rewrite history, or substitute trace recovery for product checks.
- On success: pause and show user the green report.
- **Output**: `.agents/features/<slug>/verification/setup-audit.md` with exact commands, exit codes, and the repository revision tested.
