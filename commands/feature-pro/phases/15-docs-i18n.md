# Phase 15: Docs + i18n

> Load this file only when this phase is selected or resumed.

- **Skills**: `documentation-maintenance`, `architecture-decision-records`, `workspace-codemap-context`; add `observability-by-design` and conditional `ai-product-engineering` when those surfaces need documentation
- Select `documentation-maintenance` mode explicitly: `generate` only for a genuinely undocumented public surface, otherwise `update`. Read the implementation and its tests before either mode. This phase does not regenerate the changelog; use `changelog-generator` separately only when release scope or repository policy requires it.
- **Parallel agents**:
  - `documentation-updater` — codemap + READMEs. **Must run `/workspace-codemap-pro <touched-repo>`** (or full `/workspace-codemap-pro` when many repos changed) so `.codemaps/` stays current with the PR. This refresh also updates `.codemaps/VIEW.html` for visual verification.
  - `i18n-reviewer` — translation key compliance (UI only)
- **Output**: `.agents/features/<slug>/docs/doc-delta.md` and `.agents/features/<slug>/docs/i18n-report.md`; updated HTML companions remain beside their feature documents. Existing repository-owned `.codemaps/` files may be refreshed in place and are referenced from the feature packet.
- Update API examples, safe sample-data instructions, observability ownership, and the intended-versus-observed sequence diagram when those surfaces exist. For AI features, document versioning, limitations, fallback, evaluation methodology, monitoring, and user-visible controls without exposing system prompts, hidden reasoning, or sensitive datasets.

## Additional phase requirements

- Build a **coverage map** of every new public surface against the four doc kinds (reference · how-to · tutorial · explanation). A surface with zero coverage is a named gap in the PR body, not a silent omission.
- **Detect diagram drift:** extract entity and participant names from committed Mermaid/ASCII diagrams—including the API/runtime sequence—and cross-reference the diff and observed runtime sequence. A diagram that no longer matches the code it documents is worse than no diagram, because it is trusted.
- Never write a doc for a surface whose implementation and tests were not read; mark it INFERRED instead.
- Re-run the **health baseline** from Phase 1 and report the delta by category, ranked by `weight × (10 − score)`. This gives the polish phase a numeric exit criterion instead of a judgement call.
