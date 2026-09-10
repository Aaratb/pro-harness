---
name: debug-pro
description: Resolve existing defects through adaptive evidence gathering, exact reproduction, causal confirmation, bounded RED-to-GREEN repair, and independent Review Pro return.
argument-hint: "<symptom | failing test | error text | incident ref | --working> [--local] [--from-review <path>] [--fast|--deep|--observe-only] [--repro] [--bisect] [--live <environment>] [--phase <1-13>] [--capability <name>] [--yolo]"
status: active
stage: debug
---

# /debug-pro — Pro-Level Defect Resolver

Debug Pro owns existing defects through diagnosis, regression testing, minimal correction, verification and review return. Direct reports need no prior review. Genuinely new capability belongs to Feature Pro; a repair does not.

## Invocation roadmap

On a fresh invocation, the first user-facing output is the full roadmap below: every phase number, canonical name, and one-line purpose. Show all phases in canonical order, even for focused modes; mark applicability, never invented completion. Only command/phase-index reads may precede it: no repository inspection, artifact/state or trace writes, phase-method loading, or agent dispatch before selection.

Then offer `next` (Phase 1 for a new run) or `phase <N>` and wait for the user's choice. A valid explicit phase/capability selection, identified resume, or instruction to start/continue already supplies that choice: still show the roadmap first, then check prerequisites and enter the selected phase without asking again. A task description alone is not a starting-phase choice.

`next`/resume within the same run does not repeat the opening prompt; `status` shows the map and known progress without starting work. Never invent progress or silently run missing prerequisites. Keep existing approvals and authority gates; this entry choice adds no per-phase pauses. The roadmap is not phase entry; emit the usual phase banner only when entering work.

## Adaptive depth, preserved gates

Start with the smallest trustworthy feedback loop and evidence needed for this symptom. The thirteen phases preserve the investigation order; they are not thirteen mandatory workloads. Mark an inapplicable phase with its evidence-backed reason and continue. Read source early when it sharpens a reproduction or locates relevant evidence. Telemetry is valuable when it distinguishes the failure; no unconditional seven-lane sweep precedes source inspection.

Deeper tools, agents, instrumentation, and reports are need-triggered. Do not create a state database, evidence ledger, confidence score, or probe registry merely to run this command. Complexity may justify a checkpoint note, never invented execution evidence.

Explain the failed invariant, evidence separating cause from symptom, and how the correction preserves intended outcomes. Prioritize consequential uncertainty over administration. Updates state what we learned, remaining uncertainty, and what the next check distinguishes.

## Phase presentation

Start the first user-facing message for each selected phase with the fenced banner below, then one short sentence explaining its purpose, before phase-specific tools or artifact/state work. This includes initial entry, actual transitions, explicit revisits, and resume after interruption or compaction. Use the actual phase number and canonical name; never renumber skipped phases.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase <N>/13: <Name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

A next-phase preview does not count as phase entry. Do not repeat banners for routine updates, worker returns, or loop iterations within the same uninterrupted phase. Preserve approvals and waivers; add no pauses or gates.

## Phase roadmap

Use this compact roadmap at invocation:

```text
DEBUG PRO — PRO-LEVEL DEFECT RESOLVER

 1. Roadmap and Resume — Establish symptom, scope and reusable prior evidence.
 2. Symptom Contract and Evidence Plan — Define expected behavior and discriminating checks.
 3. Targeted Observation — Inspect relevant source, logs or runtime signals.
 4. Evidence and Reproduction Recipe — Assemble a reliable minimal reproduction recipe.
 5. Observability Gaps — Identify missing signals that matter to diagnosis.
 6. Reproduction — Demonstrate the original failure reliably.
 7. Causal Trace and Hypotheses — Trace mechanisms and compare possible causes.
 8. Targeted Instrumentation — Add only authorized signals needed to distinguish causes.
 9. Causal Experiments — Test predictions and eliminate competing explanations.
10. Confirmation and Independent Challenge — Independently challenge the proposed root cause.
11. Repair Plan and RED — Plan the correction and observe a meaningful failing regression.
12. Minimal Correction and GREEN — Apply the scoped fix and verify passing behavior.
13. Report and Review Return — Deliver evidence, limits and a review-ready resolution.

Say: next · phase <N> · capability <name> · refine · status
```

After the opening choice, show the selected phase's banner and purpose, name the symptom, source, requested outcome, mode and next gate, then proceed with the first useful authorized investigation. A diagnosis-only request does not authorize a correction. Ask only for a decision, access, or authority that actually blocks the next safe action.

## Location and loading

Resolve `HARNESS_ROOT` from the installed command or skill, not the target directory. Missing contracts or helpers are build prerequisite failures, not unavailable telemetry. Stop affected actions; never reconstruct them from memory.

Read this command first. After the opening choice, read `skills/debug-core/SKILL.md` and `commands/debug-pro/routing.md` completely under `HARNESS_ROOT`. Then load only the current phase and its routed skills/references from `commands/debug-pro/contract.json`. Do not preload all phases or all three detailed references.

Resolve target and artifact root (add `--local` for standalone projects):

```bash
node "$HARNESS_ROOT/scripts/resolve-debug-root.mjs" --repo "$REPO_ROOT" --slug "$DEBUG_SLUG" --create
```

Use the returned physical project and exact `artifact_root`:

`$PROJECT_ROOT/debug/<debug-slug>/`

The resolver reports `scope`: `project` sits beside the initiative, `repository` and `local-project` are unchanged. On `status=needs-initiative`, ask, then re-run with `--initiative <name>`.

All generated artifacts and agent outputs stay there; only eligible, scoped project edits may live outside it. Never invent alternate roots. The harness installation owns artifacts only when explicitly selected as the project.

## Modes and controls

- Default: adaptive evidence depth; full repair gates remain mandatory.
- `--deep`: expand pertinent hypotheses, evidence, and challenge; do not manufacture irrelevant work.
- `--fast`: bounded triage. Report uncertainty honestly; speed never weakens repair eligibility or proof.
- `--observe-only`: existing-evidence inspection through Phases 1–5, then Phase 13. No project edits, instrumentation, active probes, replays, or failing-operation invocation. Harness-owned reporting remains allowed.
- `--working`: include actual committed, staged, unstaged, and untracked context without moving HEAD.
- `--local`: bind an explicit standalone directory and scope as `local-directory`. Read `docs/local-review-debug.md` before intake. Use pre-edit snapshots without Git prerequisites; preserve repair gates. Never silently fall back from Git failures.
- `--from-review <path>`: independently validate a repository-owned `review-pro/debug-handoff@2`; preserve original identity and acceptance criteria, not its suspected cause.
- `--repro`: request a stronger reusable reproduction when appropriate. It does not authorize side effects.
- `--bisect`: use a separately authorized throwaway worktree only after verifying a passing good point and a code-change search axis. Never bisect the user's checkout.
- `--live <environment>`: propose bounded evidence acquisition. Execute only after explicit scoped authorization; production needs a second confirmation naming environment, identity, scope, and expiry. Record approval against the exact proposed operation in the report.
- `--phase <1-13>` and `--capability <name>` select one route after checking prerequisites. They cannot jump over missing repair proof.
- `--yolo`: remove routine pauses only. No additional execution, mutation, network, production, deployment, data-repair, or external-message authority follows.

Resolve contradictory requests such as `--observe-only --repro` before execution. Previous run formats are read-only historical evidence: do not reinterpret old numeric phases or assume old proof is fresh. Revalidate into a new run when compatibility cannot be established.

## Non-negotiable repair boundary

Require the exact symptom, agreed expected behavior, a confirmed origin mechanism, a scoped repair plan, trusted commit or pre-edit content-snapshot baseline, and an explicit file allowlist. Reuse a qualifying existing permanent regression test or write one after eligibility, with observed meaningful RED before production edits. A setup, syntax, fixture, or nearby failure is not RED.

Apply the smallest origin correction, then observe GREEN for the same assertion, rerun the original un-minimized reproduction in a fresh process, run required stack-appropriate broader checks, and obtain a scoped independent code review. Address dependency failure, concurrency, malicious input, and 10× volume with relevant checks or evidence-grounded non-applicability. Remove temporary probes without disturbing existing dirty work.

Do not self-certify Review Pro's readiness verdict. No automatic commit, pull request, deployment, historical-data repair, or Review dispatch occurs.

## Durable output and completion

Every terminal result produces `DEBUG_REPORT.md` and privacy-safe `run-events.jsonl`, including failed or incomplete investigations. Every repair attempt also produces the single canonical nested `debug-pro/resolution@1` in `resolution.json`. Use qualitative causal tiers; its compatibility field `diagnosis.confidence` is `null`, never a fabricated score.

Validate source context, the command contract, repair packets when present, and the shared workflow trace. Report real commands and exit codes. A failing validator blocks a success claim; it does not suppress the honest report.

Terminal status is `RESOLVED`, `PARTIALLY_RESOLVED`, `UNRESOLVED`, `SPEC_DECISION_REQUIRED`, `ARCHITECTURE_DECISION_REQUIRED`, or `NEW_CAPABILITY_REQUIRED`. Only the last may recommend `/feature-pro`. Wrong-shape decisions route to `/architecture-pro`; explanations to `/explainer-pro`; direct and Review-origin repairs return to `/review-pro` for independent re-verification.
