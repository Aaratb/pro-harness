# Phase 13: Test + QA

> Load this file only when this phase is selected or resumed.

- **Skills**: `test-driven-development`, `e2e-testing`, `browser-qa`, `webapp-testing`; add `observability-by-design` for telemetry verification and `ai-product-engineering` only when the AI overlay activates
- **Capabilities**: use `browser.navigate`, `browser.inspect`, and `browser.capture` for live browser evidence when a user-facing surface exists.
- **Ordering note**: Phase 8 already required **tests-before-refactors** for restructuring slices. Phase 13 covers **net-new behavior** (fail-first) and gap-fill — not a belated refactor safety net. If Phase 13 discovers refactor slices without characterization tests, send back to Phase 12 to add them before expanding coverage.
- **Workflow**: run a test-verification pass first against the local diff (scope detection + test-map gap analysis) before authoring new tests.
- **Parallel agents** (after verifier pass):
  - `tdd-coach` — fail-first proof for new behavior
  - `end-to-end-tester` — generate missing browser/API and end-to-end tests when gaps are confirmed
  - `unit-test-engineer` — unit and component test gaps
  - `api-test-engineer` — API contract, authentication, authorization, and tenant-isolation cases
  - `mutation-test-engineer` — optional, when mutation tooling exists or is explicitly authorized
  - `visual-tester` — visual and responsive regression for UI changes
  - `performance-benchmarker` — only for performance-sensitive changes
  - `ai-evaluation-engineer` — only when the AI overlay activates; owns deterministic contract tests plus probabilistic evaluation, regression, safety, fallback, cost, and latency evidence
- **Test placement conventions (MANDATORY):**
  Route test work by **feature area → folder**, not by inventing new top-level locations. Open the target folder, find the nearest sibling spec/test, and **honor that file's structure exactly**. Add to an existing file when the surface matches; add a new `*.spec.ts` / `*.test.ts` **inside the same folder** only when no sibling fits.
  - **Follow sibling conventions**: fixtures, tags, describe structure, POM/selector placement, and setup/teardown helpers — mirror the nearest existing test in the chosen folder rather than introducing a new pattern.
  - **No raw selectors in specs**: keep selectors in page objects/components, never inline in specs.
  - **Before authoring**: read any `AGENTS.md` or test-conventions doc in the target test repo.
  - **Test delivery policy:** tests stay with the feature by default so its proof lands atomically. Use a dedicated test branch/PR only when the active repository's instructions require it or the user explicitly approves that delivery shape. When separate, keep only test files and their minimal support changes, record the base relationship, and let Phase 17 open or repair it.
  - **Credentials**: load from a secrets manager — never hardcode.
- **Output**: `.agents/features/<slug>/tests/` containing the test report, fail-first evidence, coverage delta, browser evidence, and links to repository-owned test files.
- **API evidence**: consume Phase 9's discovered contract, tested URL, safe sample-data recipe, and observed sequence. Turn the happy path and key auth/validation/upstream failure into repository-native automated tests; do not ask again for inputs already recorded.
- **UI design evidence**: retain the selected visual direction and Phase 9 comparison, not just a screenshot baseline. Reinspect materially changed screens/states after compression or fixes; reuse source-current evidence for unchanged surfaces. Distinguish functional correctness, accessibility, fidelity and taste. Record unresolved visual drift/waivers in the existing test report; a passing browser test or newly recorded snapshot does not establish visual quality or authorize changing the design.
- **AI release gate (conditional)**: compare the candidate against a named baseline on versioned datasets, important slices, and adversarial cases. Report scorer definitions, sample counts, uncertainty, pass/fail thresholds, deterministic failures, latency and cost budgets, safety and fallback results, and rollback criteria. Averages alone cannot hide a failed critical slice. No threshold evidence means the AI feature is blocked from release.

## Additional phase requirements

Judge proof, not presence. Each of these is a concrete check:
- **Asserts the mock, not the behavior** — if every assertion names a mock/spy and none names a value the system produced, it proves the mock was called.
- **Written to match the implementation** — assertions mirroring internal call order or private field names break on refactor while proving nothing about contract.
- **Snapshot-as-assertion** — a snapshot committed in the same change as the behavior is a recording, not a check. Require one explicit value assertion on the changed logic.
- **Never-failing test** — ask what edit to production code would turn it red. If nothing would, it is theater.
- **Cannot-fail-first** — for a fix, the regression test must have been observed failing pre-fix.
