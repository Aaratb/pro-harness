# Phase 12 — Minimal Correction & GREEN

Read the repair-and-handoff reference. Revalidate baseline, scope, origin, and matching RED. Make only the minimum allowlisted correction, reusing existing functions and libraries. Record ordered production changes after RED. Do not silently alter expected behavior, public contracts or scope.

Observe GREEN using the same command/assertion. Rerun the original un-minimized reproduction in a fresh process, preserve adequate flaky trials, reacquire relevant signals, and run required repository-native tests/lint/types/build. Refactor only after GREEN and rerun affected checks.

Obtain a scoped independent code review, using the real stack and actual reviewer grants. Supply `pre-merge-review` to the selected reviewer with original acceptance criteria, bounded diff, RED/GREEN evidence and affected consumers. Ask whether the patch corrects the invariant without weakening the oracle, masking failure or losing a user state. Keep the actual review identity and findings/disposition in `DEBUG_REPORT.md`; do not substitute implementer self-review or silently dispatch full Review Pro.

Address all four failure-story categories with relevant evidence or justified N/A; do not cause real outages or production load. Assert durable effects and error/recovery outcomes at the changed seam. For AI behavior, use `ai-product-engineering` to verify deterministic controls separately from probabilistic quality; compare an unchanged representative regression set, versions and evaluation criteria, rather than prompt-tuning to only the reported example. Unknown evaluation coverage remains a stated limit.

Preserve pre-existing dirty work; compare actual changed files/diff against the initial baseline and allowlist. Historical-data enumeration and repair are separate; pending required repair means `PARTIALLY_RESOLVED`. No data mutation is implied.

Failed verification returns to Phase 9. Stop after three failed corrections and reassess. Gate: meaningful GREEN, fresh original reproduction, broader checks, review, scope and failure-story proof support the claimed status.
