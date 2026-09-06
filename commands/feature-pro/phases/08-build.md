# Phase 8: Build

> Load this file only when this phase is selected or resumed.

- **Skills**: `incremental-delivery`, `test-driven-development`, `search-first`, `task-wave-execution`, `library-first-engineering`, `ralph-loop`; add `observability-by-design` for runtime boundaries and `ai-product-engineering` only when the AI overlay activates
- **Execution model:** Phase 7 dependency order, with fresh-context `ralph-loop` attempts. Runtime verification and compression remain Phases 9 and 10.
- **Ralph loop:** Load `skills/ralph-loop/SKILL.md`; the task/budget announcement does not replace the phase banner. Retain parent presentation on resume/handoff. Announce budget once; preserve every gate.
- **Entry gate**: `erd.md` §6 module map has no unresolved line-budget violations; `staff_discipline.module_map_approved: true`.
- **Reuse-first gate (mandatory before every new capability / composable / component / shared helper; canonical skill `library-first-engineering`):**
  1. Search repository services, functions, components, utilities, generated clients and patterns. Suitable local reuse closes the gate; no package search or alternatives matrix.
  2. Otherwise consider standard APIs, installed dependencies, then approved new dependencies or justified custom code. Verify selected external APIs against current primary documentation; use supported functions rather than recreating them.
  3. Reuse planning decisions unless evidence changes. Record one source/test reference and **reuse** | **extend** | **extract** | **approved library** | **custom (justify)**; no per-function report.
  4. New dependencies require repository/user authority; parallel implementations require evidence in `state.json` → `staff_discipline.reuse_gate_log[]`.
- **Tests before refactors (mandatory for refactor / extract / move slices):**
  1. If the slice restructures existing code (not net-new behavior): write tests that capture **current observable behavior** and confirm they pass on the pre-refactor code.
  2. Refactor with tests green; add new tests only for behavior that changed.
  3. Purpose: enable fearless compression (Phase 10) and review — not coverage theater.
- **Polish checklist (apply during every layer pass — do not defer to review):**
  - Icon-only buttons → `aria-label` (or equivalent accessible name).
  - Colors → design tokens only; **no new hex literals**.
  - Config / env / build hacks → add a **"CI builds identically"** note to `spec.md` or the relevant ADR.
  - Caught errors → user-visible notification **or** `console.error` with context; **never** `console.log` for errors.
  - Runtime boundaries → implement the approved logs, metrics, traces, correlation propagation, privacy controls, and failure signals in the same slice as the behavior.
  - AI boundaries when active → implement versioned model/prompt/context/tool/retrieval/output contracts, authorization outside the model, input/output validation, safety limits, fallback, cost/latency controls, and evaluation hooks without logging raw prompts or hidden reasoning.
- **Line-budget enforcement during build**: if any file crosses its approved budget mid-pass, **stop the pass**, update `module-map.md` + `erd.md` with a split plan, get user acknowledgment if boundaries change materially, then continue.
- **Layer → agent map** (a pass only uses the agent(s) for its layer, and only layers actually in scope run):
  - data → `database-engineer` — repository-native schema, queries, and migrations
  - backend → `backend-developer`
  - frontend → `frontend-developer`
  - platform → `platform-engineer` — repository-native infrastructure, CI, deployment, and runtime configuration
- **Derive the pass plan** from `erd.md` + `tasks.md`; announce dependency order. Frontend-first requires a frozen API contract.
- **Parallel within a pass, sequential across passes**: if a single layer has >1 independent agent, fan them out in one parallel batch; passes themselves run one at a time in dependency order.
- **Scoped context per pass**: pass relevant `erd.md` rows, tasks, frozen contracts and Ralph's approved visual inputs when applicable. Persist concise results before dependent work; no raw transcripts.
- **First-screen comparison**: coordinator compares the representative render before visual propagation via `browser.navigate`, `browser.inspect`, `browser.capture` and minimal local preview, not full Phase 9 setup. Follow `ralph-loop` for inputs/evidence. Correct material drift within budget. Missing rendering stops visual propagation unless explicitly waived; nonvisual work continues within approved scheduling. Small changes compare only the changed portion.
- **Vertical slices:** collapse single-layer or thin end-to-end work to one pass. Do not force layer separation on small features.
- **`erd.md` is a living document**: if a pass reveals the impact map / data model / contract was wrong, **update `erd.md`** and flag any downstream passes that depend on the change.
- **Single-layer re-run controls**: after each pass, report meaningful progress and continue in dependency order. Pause only for a material decision, failed gate, or requested checkpoints mode. When paused, offer:
  - `continue` → run the next layer pass in the plan
  - `rebuild <layer>` → re-run only that one layer's pass against current code + the frozen contract (fast iteration; does not touch other layers)
  - `pause` → stop here
  - `skip <layer>` → skip a planned pass (ask one-line reason, log it)

- **Seam checkpoint (bounded).** After the last dependent pass, or a contract-facing rebuild, smoke-test this feature's integration seam. This is not full QA or runtime setup.
  - **Auto-skip** when the feature touched **fewer than 2 layers** (backend-only / single-layer features have no seam).
  - **Scope**: only **this feature's** seam (FE↔BE, BE↔data) — not the whole app.
  - **Depth**: one happy-path round trip through the new seam (UI action → API → data → response renders), plus optionally one key error path. **Full coverage is Phase 13 — this is explicitly capped at smoke level.**
  - **No runnable environment:** perform and label a static request/response contract-consistency check. Starting the full stack/browser belongs to Phase 9; do not claim static evidence is runtime proof.
  - **Strictness — soft signal with friction** (not a hard gate; Phase 15 remains the hard gate). On failure: surface it clearly and **default to routing into `rebuild <layer>`**. The user may explicitly choose to proceed anyway, in which case **record the failing seam** (in the Phase 8 notes and `state.json`) so Phase 9 (live runtime), Phases 11 and 13 (review + QA) scrutinize it.
- **Exit gate to Phase 9**: all planned layer passes complete (or explicitly skipped with reason) + seam checkpoint done + polish checklist self-checked per touched file.

## Additional phase requirements

- **No production code without a failing test first**, for every behavior change. Watch the test fail before implementing — a test never observed red proves nothing, and this step is where the discipline is actually lost.
- **Findings and briefs travel as files, not as chat.** Implementers receive briefs and write reports under `.agents/features/<slug>/work/`; the coordinator inspects actual diffs and referenced proof.
- Maintain the git-ignored **progress ledger** (`.agents/features/<slug>/work/ledger.md`) through Ralph: `state.json` records phases, the ledger records work, including after compaction.
