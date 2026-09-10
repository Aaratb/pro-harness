# Phase 13: Debug / Fixes

> Load this file only when this phase is selected or resumed.

- **Skills**: `systematic-debugging`, `test-driven-development`, `incremental-delivery`; add `observability-by-design` and conditional `ai-product-engineering` when their evidence planes are involved
- Run `systematic-debugging` before dispatching implementation agents whenever Phase 12 findings or seam failures require root-cause analysis.
- **Purpose**: Apply fixes for **all Phase 12 review findings** *before* the expensive Phase 14 SDET wave runs. Authoring tests against code that is about to be rewritten by security/reliability/architecture fixes is wasted effort — fix first, then QA the stabilized code.
- **Inputs**: `reviews/code-review.md` (Phase 12 consolidated findings + open questions), the Phase 9 seam-checkpoint outcome, and any failing checks from prior phases.
- **Auto-skip only if**: Phase 12 found **zero findings** AND the Phase 9 seam checkpoint passed (or was auto-skipped as not applicable).
- **Fix-all policy**: per the confirmed scope for this command, **all** Phase 12 findings — including maintainability and cosmetic nits — are addressed here before advancing to Phase 14. Triage is *order of work*, not *whether to fix*: start with security / legal / reliability / correctness, finish with style / naming / docs.
- **Parallel agents** (single batch — pick by what the diff and `reviews/code-review.md` actually touch):
  - **Code-writer agents (apply the fixes)**:
    - `backend-developer` — backend fixes
    - `frontend-developer` — frontend fixes
    - `database-engineer` — schema / query / migration fixes
    - `platform-engineer` — infrastructure / CI fixes (if Phase 12 touched platform files)
  - **Build / type / runtime resolvers (only the ones matching the failing stack)**:
    - `typescript-build-resolver` — TypeScript/JavaScript compiler, type, module, and bundler failures
    - `go-build-resolver`, `rust-build-resolver`, `kotlin-build-resolver`, `java-build-resolver`, `cpp-build-resolver`, `pytorch-runtime-resolver`
- **Re-verify before advancing**: re-run the failing checks and walk back through `reviews/code-review.md` to confirm every finding is resolved (or has an explicit, owner-tagged deferral recorded in `state.json`). Update `reviews/code-review.md` with the resolution status for each item.
- **Output**: applied fixes (committed), an updated `.agents/features/<slug>/reviews/code-review.md` with each finding marked resolved/deferred, and `.agents/features/<slug>/state.json` reflecting Phase 13 complete.

## Additional phase requirements

- **No fix before root cause.** State the mechanism — what actually happens, in what order, that produces the observed symptom — before editing. A fix that cannot name the mechanism is a guess with a passing test.
- For a multi-component symptom, instrument each boundary and confirm which one first sees bad data, rather than reasoning about which is likeliest.
- Use correlation identifiers and redacted product telemetry to reconstruct the sequence. For AI behavior, capture version identifiers, input/output classifications, tool/retrieval decisions, scorer outputs, latency, cost, and fallback results—never chain-of-thought or raw sensitive prompts.
- **Count failed fixes. After 3 on one symptom, STOP fixing and question the design.** Three failures is evidence the model of the problem is wrong, not that the fourth patch will land. Escalate as a design concern — this is the bridge to `/architecture-pro`.
- Every bug fix ships a regression test **shown to fail against the unfixed code**. Absent that proof, the fix is `unproven`, never `done`.
