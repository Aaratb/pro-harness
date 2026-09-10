# Phase 1: Repo Setup

> Load this file only when this phase is selected or resumed.

- **Skills**: `codebase-onboarding`, `workspace-codemap-context`
- **Agents**: none (utility skills only)
- **Codemap context** (optional; a missing codemap never blocks):
  1. Use `<repo>/.codemaps/CODEMAP.md` when available and relevant for every repository the feature touches; otherwise inspect only relevant source directly.
  2. Read `<owner-repo>/.codemaps/workspace/MASTER.md` only when an explicitly owned multi-repository map exists.
  3. For application-focused features, use `<repo>/.codemaps/apps/<app>.md` when available, verifying material claims against source.
  4. Missing maps do not require generation or a user question. Offer `/workspace-codemap-pro` only when its coverage would materially help the task.
  5. Keep the codemap available as shared preflight context for Phases 2, 4, 6–10, 12, and 17.
- **Output**: confirmed repo and a concise setup/baseline entry in `state.json`; optional `.agents/features/<slug>/codebase-onboarding.md` only for useful existing-system context. An empty repository records baseline/map as `not-applicable`; do not create empty onboarding, codemap, or separate baseline reports.

## Additional phase requirements

- Take the **health baseline** with `repository-health` inline: inspect configured checks, run applicable checks, and persist their results or explicit absence in state. No existing code/toolchain means no baseline suite to run, not a blocker or a fabricated pass. Phase 15 compares existing results so pre-existing failures are not attributed to the feature.
- **Detect existing isolation before creating any.** If already inside a worktree or dedicated branch, use it; do not nest. When isolation is needed, use the active runtime's approved repository-isolation capability and record the resulting worktree/branch. Verify the baseline test suite before writing code so pre-existing failures remain distinguishable.
