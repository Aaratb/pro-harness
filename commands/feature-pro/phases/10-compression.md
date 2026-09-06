# Phase 10: Compression

> Load this file only when this phase is selected or resumed.

- **Skills**: `code-simplification`, `behavior-preserving-code-simplification`, plus `library-first-engineering` when custom code may duplicate repository, standard-library, or dependency functionality
- **Why this phase exists**: AI in generation mode never volunteers to delete its own lines. A feature can be functionally correct yet still carry 2× the line count it needs. This pass is **separate from generation** — behavior-preserving deletion and deduplication after the implementation works.
- **Auto-skip only when**: no code was written in Phase 8 (pure-docs / planning-only) — announce skip.
- **Cannot be silently skipped.** User may waive with a one-line reason logged in `state.json` → `staff_discipline.compression_pass.waived: true`.
- **Workflow**:
  1. Run lint + typecheck on touched packages (quick green check — full gate is Phase 15).
  2. For each file in `erd.md` affected-files table (especially those > 200 lines or flagged in module map): run behavior-preserving simplification — remove duplication, collapse redundant abstractions, inline one-use helpers, dedupe repeated UI blocks.
  3. Recheck every custom utility introduced by the feature against the library-first decision log; replace redundant reinventions with already-approved repository or library functions when behavior and risk remain equivalent.
  4. Reconcile against **approved line budgets** from `module-map.md` / `erd.md` §7. Any file still > budget → split now (update `erd.md`, do not advance with violations).
  5. Record `.agents/features/<slug>/compression.md`: per-file before/after line counts, what was removed, tests re-run result.
  6. Re-run tests for touched modules if they exist; if refactor slices lacked tests, add minimal characterization tests before aggressive deletion.
- **Agents** (sequential because both cleaners may edit the same files):
  1. `dead-code-refactor-cleaner` — remove only evidence-backed dead code.
  2. Re-run focused checks and record the intermediate result.
  3. `refactor-cleaner` — simplify and deduplicate the verified remainder without changing behavior.
  4. Re-run focused checks, then ask `code-reviewer` to inspect the final compression diff read-only.
- **Exit gate to Phase 11**: `compression.md` written + no unresolved line-budget violations (or explicit waiver).
- **Output**: `.agents/features/<slug>/compression.md`, updated `.agents/features/<slug>/state.json` → `staff_discipline.compression_pass`, slimmer diff ready for reviewers.

## Additional phase requirements

- Compression is not summarization of chat — it is eviction of anything reconstructible from disk. Lane reports, briefs, and diffs are already files; replace them in context with their paths.
- Run `session-checkpoint` before the phase boundary to write summary, decisions, evidence, remaining work, and exact next action. It complements `state.json`; it never replaces it.
