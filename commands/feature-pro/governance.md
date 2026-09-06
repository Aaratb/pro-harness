# Feature Pro Governance

> When a phase is selected from the request or current evidence, read this governance contract completely once and bind its digest in `state.json`. Then load only the selected phase file; phase-specific instructions live in `phases/`.

## Delivery stance

- Phases 2–4 use a product-development stance: establish the problem, users, reach, outcomes, evidence, and market context before selecting implementation details. The Phase 2 engineering-impact lens stays coarse and must not become a design.
- Phase 5 uses a design stance grounded in approved product evidence and repository conventions.
- Phases 6–20 use an engineering-delivery stance. They may challenge an approved product direction only as an explicit, evidence-backed user decision—not by silently rewriting scope.
- Repository-local instructions override generic workflow defaults. Record the applied policy and never transplant a branch, test, deployment, or framework convention from an unrelated repository.

## Completion evidence contract

The dominant failure mode of a long orchestration is accepting a weaker signal that resembles the required one. Before any phase may report success:

| Claim | Required evidence | NOT sufficient |
|---|---|---|
| "it compiles / type-checks" | the compiler's own exit code and output | the linter passing; the diff looking right |
| "tests pass" | the test runner's output naming the tests that ran | "no errors appeared" |
| "the test proves the fix" | the test failing against unfixed code, THEN passing | the test passing once |
| "X is missing / unused / never called" | a grep whose pattern and full result set are shown | not having seen it |
| "the subagent did it" | the VCS diff of what actually changed on disk | the subagent reporting success |
| "CI is green" | the check rollup for THIS head SHA | a green run on an earlier SHA |
| "the runtime works" | the actual response/render observed, quoted | the server having started |

A gate whose evidence cannot be produced FAILS. It is never waived silently — record the waiver with a reason in `state.json`.

## Business requirement and product solution boundary

- Phase 2 freezes an approved business requirement: problem, users, evidence, measurable goal, owner, constraints, and non-goals. If no credible goal exists, define it before discussing solutions.
- Phase 3 compares two viable solutions plus do nothing, records trade-offs/rejections, and requires explicit approval. Later evidence may challenge these decisions only by returning to their approval boundary.

## Observability and execution tracing

Two distinct evidence planes apply. **Product observability** covers privacy-safe logs, metrics, traces/correlation, dashboards, alerts, and ownership for runtime, API, async, external, sensitive-data, and AI work. **Harness execution tracing** appends redacted phase/skill/agent/capability/approval/gate events to `$FEATURE_ROOT/run-events.jsonl`.

Use `observability-by-design`; never rewrite prior JSONL rows or record secrets, raw prompts, hidden reasoning, or tool payloads. Retry a trace failure once, then set status to `degraded` and expose the gap unless a gate requires validity. Validate before Phases 15 and 20.

## Conditional AI-product discipline

When repository evidence or task language activates the `ai-product` overlay, load `ai-product-engineering`. Version model/prompt/context/retrieval/tool/output contracts; require deterministic tests, probabilistic thresholds and slices, safety, fallback, cost/latency, monitoring, and rollback. Authorization remains outside the model; never request chain-of-thought. Non-AI features do not inherit this work.

## Reuse-first engineering gate

Apply `library-first-engineering`: repository-native code, language/runtime standard library, already-installed dependency, evaluated mature dependency, then custom implementation. Existing services, functions, components, utilities, generated clients, and patterns are the first candidates. Suitable local reuse closes the gate with a source/test reference and a brief decision; no package search or comparison matrix is needed. Verify current primary docs only for a selected external API. New dependencies require normal user/repository authority and risk evidence; only an unresolved choice necessary to implementation blocks Phase 6.

## Staff-Level Engineering Discipline

Preserve these engineering checks while scaling their execution to the change. Evidence and approval boundaries matter; elaborate reports and extra agents do not substitute for them.

| Rule | Phase(s) | What happens |
|---|---|---|
| **1. Budget before generating** | 6 → 7 → 8 | Propose `module-map.md` with per-module line budgets. Default: **no file > 400 lines** — if a module exceeds budget, **stop and re-split** before writing code. User must approve the map before Phase 7 starts. |
| **2. Reuse gate** | 6 → 8 → 11 | Before any new capability, composable, component, or helper: follow the library-first order, list overlapping repository and dependency candidates, then **reuse**, **extend**, **extract**, adopt an approved library, or justify custom work. Log the decision. |
| **3. Tests before refactors** | 8 (refactor slices) | For restructuring existing code: confirm **characterization tests capturing current behavior pass before refactoring**, then keep them green. Not coverage theater — tests are what make compression safe. New behavior follows fail-first TDD. |
| **4. Compression pass** | **10** [mandatory] | AI in generation mode never volunteers to delete its own lines. After Phase 8 layers + seam check pass, run a dedicated **behavior-preserving** simplify pass (`code-simplification` / `behavior-preserving-code-simplification`). Record before/after line counts. |
| **5. Polish checklist** | 8 (apply), 11 (audit) | Every icon-only button → `aria-label`. No new hex colors — **design tokens only**. Any config hack → document **"CI builds identically"** in spec/ADR. Every caught error → user notification **or** `console.error` — never silent `console.log`. |
| **6. Slice PRs** | 17 | Past **~800 changed LOC**, human and AI reviewers stop catching structural issues. **Must** split into 3–4 stacked PRs via `split-large-pull-request` before opening. An oversized feature PR is a process failure — block and split. |

**Approval gates (do not skip silently):**
- Phase 2 → 3: business requirement and measurable goal approved.
- Phase 3 → 4: selected product solution approved after alternatives are compared.
- Phase 6 → 7: `module-map.md` approved by user (`state.json` → `staff_discipline.module_map_approved: true`).
- Phase 7 → 8: `erd.md` includes the approved module map + line-budget column; no planned file exceeds budget without a logged split plan.
- Phase 9 → 10: implementation, seam check, and applicable local runtime evidence complete.
- Phase 10 → 11: compression pass complete (or explicit user waiver logged).
- Phase 17: if `git diff --stat` vs base > 800 LOC and not already stacked → **split first**, then open PRs.

## Phase Execution Pattern

1. Follow the command's entry/resume banner before phase work; a preview is not phase entry. Keep progress concise; ask material missing questions promptly.
2. Apply skills inline except independent challenge before approval/freeze in Phases 3, 5, and 6 and Phase 8's `ralph-loop` fresh implementer attempts. Other agent lists are inventories. Bound context, separate write ownership; never substitute self-review for required challenge.
3. Reuse accepted answers, opened evidence, and existing artifacts; do not repeat discovery/grilling or research settled choices. Synthesize findings only when there are findings to reconcile.
4. Append the redacted phase-boundary event, then update `state.json` with phase state, canonical `skill_runs[<phase>]` (name, status, time, artifact paths, reason if skipped/waived/blocked), actual `agent_runs`, and `workflow_trace.last_event_id` from the accepted writer result. Batch related bookkeeping; never invent activity to fill a field.
5. Continue within the authorized scope. Pause for business/product/module-map approval, material uncertainty, external-write authority, a failed hard gate, or the user's requested checkpoints mode—not merely because a phase ended.

Keep setup in state and framing in `requirements.md`; create additional notes or HTML companions only when useful, requested, or required by repository policy. Required later evidence artifacts remain required. Report a short result and next action rather than a full per-phase status form. Do not spend prolonged analysis optimizing the wording of a simple question; ask it when the missing decision is identified. Explain any actual long-running check while it runs, without claiming control of model latency.

## State persistence

Use `state.example.json` as the canonical shape. Copy it to `$FEATURE_ROOT/state.json` for a new run and update it at every phase boundary. Keep all 20 integer phase keys, the current phase, canonical `skill_runs` and `agent_runs`, business and product approvals, verification contract, product observability, conditional AI delivery, workflow trace, artifact companions, local-runtime evidence, architecture-handoff intake, engineering-discipline gates, release links, handoff status, and the digests of the loaded command/governance/routing contracts. Valid phase states are `done`, `in_progress`, `skipped`, `pending`, and `blocked`.

On resume, read repository-local state and restore command presentation. Lead with the selected banner and 20-phase tracker; continue at the first phase that is neither complete nor intentionally skipped. Never infer completion from an absent artifact.

## Skipping Rules

| Skip type | Behavior |
|---|---|
| Auto-skip (nonsensical phase) | Announce + skip — e.g., already in repo, no UI to design |
| Phase 4 auto-skip | Backend-only / internal / no competitors — announce + skip without asking |
| Phase 9 auto-skip | No user-facing runnable surface (pure infra / migrations-only / library-only) — announce + skip without asking |
| Phase 10 auto-skip | No code written in Phase 8 (planning/docs only) — announce + skip without asking |
| Phase 10 user waiver | User may waive compression with one-line reason → log `staff_discipline.compression_pass.waived: true` |
| User-requested skip | Ask one-line reason, log it, proceed |
| Hard-gate phase (15, 17) | **Cannot be skipped.** Must pass. Phase 17 includes PR slice gate when >800 LOC. |
| Phase 20 (Handoff) | Optional final phase — not a gate. Skippable with reason; runnable at any time on the current state, and re-runnable via `refine`. |

```
○ Skipping Phase <N> (<Name>) — <reason>.
```

```
> Skipping Phase <N> (<Name>).
  Quick note: why? (Helps me adjust later phases.)
```

## Hard Gates

- **Phase 2 → 3**: business requirement includes an approved measurable goal and owner.
- **Phase 3 → 4**: product solution and its rejected alternatives are explicitly approved.
- **Phase 6 → 7**: `module-map.md` requires **user approval** (`staff_discipline.module_map_approved: true`).
- **Phase 7 → 8**: `erd.md` §7 has no unresolved line-budget violations.
- **Phase 10 (Compression)**: mandatory for code features — default **block** Phase 11 until `compression.md` exists; user may waive explicitly.
- **Phase 15 (Setup Audit)** must pass before Phase 16.
- **Phase 17 (PR & CI)** runs automatically after PR creation. **Blocks** opening a single PR when changed LOC > ~800 — must stack/split first. Auto-loops on conflicts and CI failures without user prompts. Only interrupts user for business-logic decisions.

## Parallel Agent Launch Rules

When launching parallel agents within a phase:

1. Launch independent agents together. Sequence agents that share write ownership or have explicit dependencies. Phase 8 follows `erd.md` dependency order; Phase 10 runs the two write-capable cleaners sequentially with verification between them.
2. Each agent gets:
   - The PRD/spec/diff path relevant to its scope
   - A targeted prompt (don't dump the whole context)
   - Explicit instruction to return findings in the standard severity format (CRITICAL/HIGH/MEDIUM/LOW)
3. After all return, **synthesize into one consolidated report** — do not just concatenate.
4. Surface material open questions promptly.
5. **Deliberation escalation**: for material unresolved conflicts, consider `multi-model-debate-room` or `stochastic-multi-agent-consensus` only after concise inline comparison. Do not launch panels for ordinary judgment calls.

## Must Not Do

- Must not advance past explicit approval, authority, or failed evidence gates; user-requested checkpoints mode adds phase-boundary pauses
- Must not skip phases silently (including Phase 10 Compression)
- Must not start Phase 7 without **user-approved** `module-map.md`
- Must not start Phase 8 with planned files exceeding line budget without a split plan
- Must not add a new composable/component without running the **reuse gate** and logging the decision
- Must not reinvent a language/runtime/library capability before completing and recording the library-first decision order
- Must not conflate product telemetry with harness workflow tracing, or place secrets, raw prompts, hidden reasoning, or raw tool payloads in either artifact
- Must not treat an AI feature as a normal deterministic feature; activate the AI overlay and require evaluation, safety, fallback, cost, latency, and production-monitoring evidence
- Must not ask the user for an API contract, runnable URL, authentication setup, or sample data that can be discovered safely from the active repository and runtime
- Must not refactor existing code in Phase 8 without **tests-before-refactors** characterization tests
- Must not open a feature PR > ~800 changed LOC without **stacked/split PRs** (Phase 17)
- Must not rely on prompting alone for smaller diffs — run Phase 10 Compression, do not skip it by default
- Must not run agents serially when they are independent; do sequence dependency-ordered work and overlapping write ownership
- Must not ask the user to manually paste CI logs when `ci.read` can retrieve bounded evidence; never expose secrets or dump unbounded logs into chat
- Must not duplicate work an existing skill already does — apply it inline or delegate a justified bounded task
- Must not launch many overlapping security auditors in parallel during Phase 11 — use **Security review routing** and a single coordinated security pass when multiple lanes apply
- Must not use code-writer/engineer agents in Phase 16 — reviewers and verifiers only
- Must not skip the test-verification pass before authoring net-new Playwright/API tests in Phase 13 when the feature touches runtime behavior
- Must not create or update a pull request before the Phase 17 slice gate when changed LOC exceeds the approved threshold
- Must not skip updating `skill_runs` with canonical names and repository-local artifacts at phase boundaries
- Must not search historical package namespaces or alternate skill roots when canonical skill resolution fails
- Must not import repository-specific test-branch, pull-request, framework, or deployment conventions without evidence from the active repository
- Must not claim a gate passed without its evidence row from the completion contract — a linter passing is not a compiler passing, and a subagent reporting success is not a diff
- Must not write a Phase 2 requirement about current behavior without a `path:line` cite from a file actually opened
- Must not write production code for a behavior change before a test has been **observed failing** (Phase 8), and must not close a Phase 12 fix without a regression test shown to fail pre-fix
- Must not emit a Phase 6 task with a placeholder, an unresolved library choice, or a `Consumes` entry no earlier task `Produces`
- Must not auto-resolve a **User Challenge** decision — surface it; the stated direction is the default
- Must not attempt a 4th fix on one symptom (Phase 12) — stop and question the design, escalate to `/architecture-pro`
- Must not run the same Phase 9 check a third time, and must not let an INFERRED evidence tier satisfy a gate requiring TESTED
- Must not treat a pre-existing Phase 1 baseline failure as caused by this feature, or report a Phase 14 documentation pass without the baseline delta
- Must not publish a production rollout stage on the author's behalf — prepare it and ask
- Must not proceed past Phase 18 on a 4+-commit review-staleness result without re-review
- Must not use `HEAD~1` as a diff base anywhere — it silently truncates multi-commit work

## Phase boundary output

Follow command presentation; preserve approval/blocker reporting. No extra reports, questions, pauses or gates. Actual agent verdicts only; inventories/tracker via `status`.
