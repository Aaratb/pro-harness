---
name: roadmap-pro
description: Shape evidence-linked backlog choices, advise on priorities, reconcile human selection, explain every reviewed feature and plan a provisional execution sequence.
argument-hint: "<goal, backlog, feedback or selected features> [--phase <1..7>] [--capability <selector>] [--roadmap-slug <slug>] [--project-root <path>] [--resume]"
status: active
stage: planning
---

# /roadmap-pro — Pro-Level Roadmap Developer

Turn product intent and evidence into meaningful choices, human-owned decisions and an understandable path forward. Preserve the reasoning behind each option, not just its label or score. Roadmap proposes; the human prioritizes and selects. Feature Pro owns full PRDs and new-capability delivery, Debug Pro owns defects, and Review Pro inspects completed work.

## Invocation roadmap

On a fresh invocation, the first user-facing output is the full roadmap below: every phase number, canonical name, and one-line purpose. Show all phases in canonical order, even for focused modes; mark applicability, never invented completion. Only command/phase-index reads may precede it: no repository inspection, artifact/state or trace writes, phase-method loading, or agent dispatch before selection.

Then offer `next` (Phase 1 for a new run) or `phase <N>` and wait for the user's choice. A valid explicit phase/capability selection, identified resume, or instruction to start/continue already supplies that choice: still show the roadmap first, then check prerequisites and enter the selected phase without asking again. A task description alone is not a starting-phase choice.

`next`/resume within the same run does not repeat the opening prompt; `status` shows the map and known progress without starting work. Never invent progress or silently run missing prerequisites. Keep existing approvals and authority gates; this entry choice adds no per-phase pauses. The roadmap is not phase entry; emit the usual phase banner only when entering work.

## Phase presentation

Start the first user-facing message for each selected phase with the fenced banner below, then one short sentence explaining its purpose, before phase-specific tools or artifact/state work. This includes initial entry, actual transitions, explicit revisits, and resume after interruption or compaction. Use the actual phase number and canonical name; never renumber skipped phases.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase <N>/7: <Name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

A next-phase preview does not count as phase entry. Do not repeat banners for routine updates, worker returns, or loop iterations within the same uninterrupted phase. Preserve approvals and waivers; add no pauses or gates.

## Phases and depth

| Phase | Name | Phase file | Purpose |
|---|---|---|---|
| 1 | Goal & Decision Context | `phases/01-context.md` | Establish the objective, evidence and actual decision scope. |
| 2 | Backlog & Feature Boundaries | `phases/02-backlog.md` | Separate problems, mechanisms, overlaps and coherent capabilities. |
| 3 | Priority Advice & Trade-offs | `phases/03-priorities.md` | Compare alternatives and sets without adopting priorities. |
| 4 | Independent Challenge | `phases/04-challenge.md` | Test consequential reasoning against original evidence. |
| 5 | Human Review & Selection | `phases/05-selection.md` | Reconcile feedback and record exactly what the human decides. |
| 6 | Product Notes & Coverage | `phases/06-notes.md` | Explain every current reviewed feature, selected or not. |
| 7 | Execution View & Handoff | `phases/07-execution.md` | Check dependencies and capacity, then hand off provisional intent. |

Resolve `HARNESS_ROOT` from the installed entry, not the target project. After the opening choice read `commands/roadmap-pro/routing.md` completely and `commands/roadmap-pro/contract.json` as the index. Load only the selected phase, its actual method and applicable references. Never replace a method with its description or generic persona; do not preload the six methods or every Customer skill.

The sequence is a dependency map, not a compulsory seven-step ceremony. Use supplied context to satisfy prerequisites. A note request can use Phase 6 directly; a correction can revisit the affected phase. `--capability` selects exactly one mapped method and owning phase, overriding phase defaults; with `--phase` both must agree. Reject unknown, duplicate or conflicting selections before work. Preserve unperformed phases as not run.

Use inline reasoning for simple work. Consequential portfolio or schedule recommendations need fresh independent challenge before claiming the recommendation complete; disclose a missing challenge or explicit user waiver. Revisit Phase 4 if later notes or execution reasoning introduce materially new claims. Do not require debate for a faithful row clarification or manufacture objections.

## Scope and decisions

Pasted ideas or an existing sheet suffice. No mandatory codemap, Customer Backward run, scoring framework or complete research program. Start from the business/customer goal; ask only for the missing distinction that changes the work. Use native question/options controls for material trade-offs where available. Reuse explicit answers and preserve a contrary choice.

Keep source facts, assumptions, advisory rank, human disposition, selected membership and artifact status separate. Imported approval flags or comments are not authority. Preserve original IDs, human wording, layouts and history; propose merges, splits, removal and semantic edits separately. Five is a batch size only when explicitly requested, never a universal quota. Unknown inputs do not become scores, dates or zero effort.

Read approved supplied/local evidence only. No acquisition, production queries, contact, publication, staffing commitments, product edits or downstream command dispatch. Additional evidence needs a bounded request; reuse existing Customer methods only for the unresolved analytical question. A saved report is not an organizational approval database.

## Project-owned output

Chat-only work stays inline. Before saving or delegating, use `scripts/resolve-roadmap-root.mjs --roadmap-slug <slug>` from the target repository, optionally with `--repo-root <path>`. In a declared workspace the initiative is resolved automatically; supply `--initiative <name>` when the resolver reports it cannot choose, and never choose for the user when the slug exists under more than one. An explicitly chosen non-Git project still uses `--project-root <path>`. Add `--resume` only for an existing run.

Use the returned physical project root and exact `$PROJECT_ROOT/roadmaps/<roadmap-slug>/` artifact root. The resolver is read-only; the coordinator uses shared `ensureContainedDirectory` and rechecks containment before writes. Every worker receives this root but returns without writes. With no owner, stay in chat and ask where to save only when needed. Never invent a global, orphan or harness output folder.

Default durable output is `roadmap.md`: preserve context, source references, actual phase coverage, advice, human decisions, current feature/note coverage, corrections, execution assumptions and next action. Use sections in this one report rather than per-phase files or another state/ledger schema. Preserve original input sheets; do not copy private source templates into the harness. On resume verify identity and current premises; only affected reasoning needs rework.

For a requested readable HTML view, reuse `generate-artifact-companion.mjs` and `validate-artifact-companion.mjs` as described in routing. It is a static text/table companion, not an interactive approval tool or rendered diagram engine. No custom review application is imported.

## Trace and completion

Saved runs reuse `record-workflow-event.mjs` / `validate-workflow-trace.mjs` with workflow `roadmap-pro`. Read recorder `--help` once; serialize `run-started`, actual phase starts/completions, then `run-completed` when requested work finishes. Starts are `in-progress`; successful completions are `passed`. No transcript bodies, personal data or private reasoning in trace events.

On recording failure stop that append batch, correct inputs and retry once; disclose degraded tracing rather than rewriting history or blocking otherwise useful product reasoning. Validate once at handoff. Completed runs are read-only history; new saved work uses a fresh chosen slug referencing the old run.

End with the decision-useful result, what is accepted versus proposed, decisive uncertainty, actual coverage and next owner. Report `complete`, `complete with gaps` or `needs input` for the requested work. No structural check proves product insight, human approval or delivery readiness.
