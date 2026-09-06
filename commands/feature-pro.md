---
name: feature-pro
description: Pro-level feature development workflow with repository-owned artifacts, canonical capability routing, and evidence-backed delivery gates.
argument-hint: "<feature description, ticket URL, or screenshot>"
status: active
stage: feature
---

# /feature-pro — Pro-Level Feature Developer

Develop a feature through 20 sequential, review-gated phases. Keep the command runtime-neutral: canonical skills, agents, and capabilities are resolved by the harness; runtime adapters only provide their platform-specific implementations.

## Invocation roadmap

On a fresh invocation, the first user-facing output is the full roadmap below: every phase number, canonical name, and one-line purpose. Show all phases in canonical order, even for focused modes; mark applicability, never invented completion. Only command/phase-index reads may precede it: no repository inspection, artifact/state or trace writes, phase-method loading, or agent dispatch before selection.

Then offer `next` (Phase 1 for a new run) or `phase <N>` and wait for the user's choice. A valid explicit phase/capability selection, identified resume, or instruction to start/continue already supplies that choice: still show the roadmap first, then check prerequisites and enter the selected phase without asking again. A task description alone is not a starting-phase choice.

`next`/resume within the same run does not repeat the opening prompt; `status` shows the map and known progress without starting work. Never invent progress or silently run missing prerequisites. Keep existing approvals and authority gates; this entry choice adds no per-phase pauses. The roadmap is not phase entry; emit the usual phase banner only when entering work.

## Repository-local artifact root (mandatory)

The harness is installed under `~/.agents`; Feature Pro output belongs to the repository being changed.

Before reading, creating, resuming, or updating feature artifacts:

1. Use the user-supplied target path, otherwise the current working directory.
2. Run `bash ~/.agents/scripts/resolve-feature-root.sh <target-path> <feature-slug>`. The resolver handles worktrees where `.git` is a file.
3. Set `REPO_ROOT` to the returned physical repository root and `FEATURE_ROOT` to `$REPO_ROOT/.agents/features/<feature-slug>`.
4. Confine all feature artifacts to `FEATURE_ROOT`. Reject absolute outputs, `..` escapes, and symlinks that resolve outside it.
5. If no Git repository can be resolved, stop and ask the user to select one. Never create an orphan workspace-level artifact folder.
6. If a feature spans multiple repositories, each repository owns its own feature artifacts.

Canonical locations include:

- `.agents/features/<slug>/reviews/code-review.md`
- `.agents/features/<slug>/tests/`
- `.agents/features/<slug>/verification/setup-audit.md`
- `.agents/features/<slug>/release/deployment.md`
- `.agents/features/<slug>/state.json`

## Progressive loading contract

Keep the initial context small:

1. Read this command first; do not preload the reference bundle.
2. Complete the invocation roadmap and entry choice before resolving `FEATURE_ROOT` or reading existing `state.json`.
3. After selecting the appropriate starting phase from the request and current evidence, read `commands/feature-pro/governance.md` and `commands/feature-pro/routing.md` completely once. Record their digests in `state.json` under `loaded_contract`. Do not begin a phase with either global contract missing or stale.
4. Select the named phase, emit its banner, then load its file; retain unchanged globals and replace only the phase-specific context. After context loss, reread this command and both globals; preserve state, waivers and consumed attempts.
5. Resolve capabilities through the phase routes in `mcps/registry.json`.
6. Pass scoped artifact paths to agents; do not paste entire phase histories into prompts.

### Workflow execution trace

After `FEATURE_ROOT` and `run_id` are resolved, append redacted execution events to `$FEATURE_ROOT/run-events.jsonl` with `record-workflow-event.mjs`. Record run start/resume, every phase transition, skill/agent start and end, capability resolution/use, evidence validation, approvals, gates, retries, degradation/failure, and run completion. The JSONL trace is append-only evidence; `state.json` remains the resumable checkpoint. Never record secrets, credentials, raw prompts, hidden reasoning, or raw tool payloads. Retry a tracing failure once, then mark tracing `degraded` in state and surface it rather than blocking unrelated work silently. Validate the trace with `validate-workflow-trace.mjs` before Phase 15 and final handoff.

The split keeps the active context to the compact command, both global contracts, and one phase file. Approved behavior changes are recorded in `reconciliation.json`; it and `contract.json` are validation manifests, not runtime context. Load them only when auditing or modifying this command.

Use exact labels: `run-started` → `phase-started --phase N` → `phase-completed --phase N`; start status is `in-progress`, completion `passed`, skipped skill `skill-completed --status skipped`. The coordinator serializes writes and stops a batch on its first failure. Use writer `--help` for schema vocabulary; never backfill a rejected start after completion.

## Entry context

Use the phase reference index for the opening roadmap; show purposes, not reference paths. After selection, show the selected banner, purpose and next approval boundary; begin authorized work. Ask missing intake without inventing a phase.

Controls: `next | phase <N> | skip | refine | back to <N> | status`. Checkpoints mode is opt-in; these controls do not grant external-write authority.

Announce detected skips briefly. Honor an explicitly requested starting phase or checkpoints mode.

## Smart entry

Inspect only enough evidence to propose a starting point. Announce every skip; never silently skip.

| Signal | Proposed action |
|---|---|
| Active Git repository | Skip Phase 1 |
| Repository `.codemaps/CODEMAP.md` exists | Use it as context; read the app map when the feature names an app |
| No repository codemap | Recommend `/workspace-codemap-pro`; continue without blocking |
| `requirements.md` and `prd.md` exist | Skip Phases 2–3 |
| `competitive-research.md` exists, or no meaningful competitors exist | Skip Phase 4 |
| Current approved direction and relevant visual artifact exist in `design/` | Reuse Phase 5; otherwise refine, not an existence-only skip |
| `spec.md` exists | Skip Phase 6 |
| Certified `.agents/architecture/<slug>/handoff.json` exists | Validate with `validate-architecture-handoff.mjs --require-design`; import only currently reverified constraints |
| `erd.md` exists | Offer to skip or refine Phase 7 |
| Implementation already exists | Suggest Phase 11 or later; ask before jumping |
| No user-facing runnable surface | Skip Phase 9 |
| No code was written | Skip Phase 10 |
| Current branch has a PR | Suggest Phase 17; ask before jumping |
| Reviewer handoff requested | Offer Phase 20 from current evidence |

## Resolution and execution

- Resolve each required skill from `~/.agents/skills/<name>/SKILL.md`. Do not search package namespaces or alternate skill roots. A missing required skill blocks its phase; record optional misses.
- Resolve agents from `~/.agents/agents/definitions/<agent-name>.json`, capability profiles, adapters, and evidence-gated overlays. Every launch receives `task` and `artifact_root: $FEATURE_ROOT`.
- Pass a bounded feature description to `resolve-agent-overlays.mjs --context` so an AI-product overlay can activate from explicit task intent even before AI files or dependencies exist.
- Resolve MCP operations by canonical capability from `~/.agents/mcps/registry.json`. Missing optional capability reduces and records evidence quality; it never weakens a hard gate.
- Use the canonical `grill-with-docs` skill directly; there is no duplicate command.
- Apply skills inline except independent challenge in Phases 3, 5, and 6 and Phase 8's `ralph-loop` fresh implementer attempts. Other agent lists are inventories. Parallelize independent work; sequence dependencies and shared writes.
- Synthesize findings; do not concatenate raw agent transcripts.
- Append the phase-boundary workflow event and update `state.json`; continue within authorized scope unless an approval, material question, or safety boundary requires a pause. Pause at each phase only in user-requested checkpoints mode.
- Apply repository-local instructions before generic workflow defaults. A repository-specific branch, test-placement, pull-request, or deployment policy wins and must be recorded in state.

Generate planning companions only when useful, requested, or required by the repository. When generated, run `generate-artifact-companion.mjs`, validate with `validate-artifact-companion.mjs`, and update `artifact_companions` in `state.json`. Publishing is optional unless requested.

## Phase reference index

| Phase | Name | Reference | Purpose |
|---:|---|---|---|
| 1 | Repo Setup | `feature-pro/phases/01-repo-setup.md` | Establish the repository and working baseline. |
| 2 | Requirements & Framing | `feature-pro/phases/02-requirements.md` | Clarify the problem, users and intended outcome. |
| 3 | PRD | `feature-pro/phases/03-prd.md` | Define product scope and acceptance criteria. |
| 4 | Competitive Research | `feature-pro/phases/04-competitive-research.md` | Compare relevant alternatives and unmet needs. |
| 5 | Design / Options | `feature-pro/phases/05-design.md` | Explore and select the experience and visual direction. |
| 6 | Plan + API Impact | `feature-pro/phases/06-plan.md` | Decide architecture, technical approach and interface changes. |
| 7 | Engineering Requirements & Impact Map | `feature-pro/phases/07-impact-map.md` | Map affected layers, dependencies and implementation tasks. |
| 8 | Build | `feature-pro/phases/08-build.md` | Implement approved tasks with bounded test-driven iterations. |
| 9 | Local Runtime Gate | `feature-pro/phases/09-local-runtime.md` | Exercise the app, APIs and actual visual result. |
| 10 | Compression | `feature-pro/phases/10-compression.md` | Simplify code while preserving behavior. |
| 11 | Review + Legal | `feature-pro/phases/11-review.md` | Review correctness, security and applicable legal risks. |
| 12 | Debug / Fixes | `feature-pro/phases/12-debug.md` | Reproduce and correct confirmed defects. |
| 13 | Test + QA | `feature-pro/phases/13-test-qa.md` | Verify relevant functional and nonfunctional behavior. |
| 14 | Docs + i18n | `feature-pro/phases/14-docs-i18n.md` | Update documentation and localization coverage. |
| 15 | Setup Audit | `feature-pro/phases/15-setup-audit.md` | Check setup and required delivery evidence. |
| 16 | Platform Specialists | `feature-pro/phases/16-specialist-review.md` | Challenge applicable platform-specific risks. |
| 17 | PR & CI | `feature-pro/phases/17-pr-ci.md` | Prepare the authorized review submission and inspect CI. |
| 18 | Staging | `feature-pro/phases/18-staging.md` | Validate the approved change in staging. |
| 19 | Deployment | `feature-pro/phases/19-deployment.md` | Execute and verify a separately authorized release. |
| 20 | Handoff & Reviewer Pack | `feature-pro/phases/20-handoff.md` | Deliver evidence, remaining risks and ownership. |

## Phase boundary response

Start the first user-facing message on entry/transition/revisit/resume (including compaction) with this fenced banner and purpose before phase-specific tools or artifact/state work. Preserve canonical names/numbers, including skips.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase <N>/20: <Name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

A preview does not count as phase entry. No banners for routine updates, worker returns or loop iterations in the same uninterrupted phase. Preserve approvals/waivers; no new pauses or gates. Previews/status: number, name, purpose; offer controls when paused.

For `status`, render all 20 phases from `state.json` using `✓ done`, `► in progress`, `○ pending`, `⊘ skipped`, or `⚠ blocked`. Resume at the first phase that is neither done nor intentionally skipped.
