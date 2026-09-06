# Phase 11 — Repair Plan & RED

Read the repair-and-handoff reference before permanent writes. Verify exact reproduction, agreed expected behavior, confirmed origin and evidence the value is correct upstream. Preserve the initial trusted commit or content-snapshot baseline; declare every intended file and forbidden symptom-masking changes.

Write the smallest plan in `DEBUG_REPORT.md`: origin, assertion, tests/production/adjacent allowlist, safety, rollback, required checks and four failure-story obligations. A separate plan file is optional, not mandatory.

Check for a specification defect and enumerate the existing user-visible states before requesting one precise product decision. No correct seam yields `ARCHITECTURE_DECISION_REQUIRED`. Only new capability yields `NEW_CAPABILITY_REQUIRED`; ordinary correction remains here.

Honor repository-native test placement. After eligibility, reuse a qualifying existing permanent regression or add the smallest observable regression test and run it against unfixed production code. Existing RED is reusable only under Debug Core's unchanged-context and chronology checks. Record meaningful matching RED before any production edit; reject setup, syntax, fixture and unrelated failures. Static-only work uses its real failing pre-change check.

Explain why the assertion would catch this mechanism at the real caller seam, and which adjacent user states and shared consumers must remain correct. Keep a separate existing expected-outcome oracle; do not copy the bug into the test expectation or mock away the suspect effect. Prefer an existing service/function that already enforces the invariant over a parallel implementation.

Gate: scope, baseline, eligibility and exact RED are proven. Plans and test authoring alone are not RED.
