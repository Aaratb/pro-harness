---
name: feature-pro
description: "Run the full feature-pro SDLC orchestrator for complex feature delivery, including planning, implementation, review, testing, deployment, and post-deploy handoff. Use when the user invokes /feature-pro, names $feature-pro, or requests the gated end-to-end pro feature workflow."
---

# Feature Pro

Use this skill to invoke the harness's end-to-end feature delivery workflow.
Keep this adapter thin; the command owns the workflow.

## Required load order

Before taking any feature action:

1. Read `~/.agents/commands/feature-pro.md` completely. It is the canonical
   orchestration contract and the single source of truth.
2. Preserve the invoking user's target, flags, attachments, and remaining
   request as the canonical command's `$ARGUMENTS`.
   Show its opening roadmap and honor the entry choice before the steps below.
3. Resolve every skill, agent, command, script, rule, and reference named by
   the active phase through `~/.agents`, then read the applicable contracts
   before using them.
4. For each agent, read its canonical JSON definition, capability profile, and
   runtime capability adapter under `~/.agents/agents/`. Pass the resolved
   `artifact_root` to every agent and do not grant tools outside its profile.
5. Resolve the repository-local artifact root with
   `bash ~/.agents/scripts/resolve-feature-root.sh <target-path> <feature-slug>`
   before reading, creating, or resuming feature state.
6. Preserve the command's opening roadmap, phase-entry banners (including
   resume), phase order, approval boundaries, hard gates, evidence requirements,
   and handoff formats exactly.
7. When checking command installation or routing, run
   `bash ~/.agents/scripts/verify-feature-pro-routing.sh`; it is a verifier and must not
   create command copies.

If the canonical command is unavailable, stop and report the missing path.
Do not reconstruct the workflow from memory or substitute `flow-feature`.

## Authority boundaries

Continue within authorized scope by default; pause-every-phase checkpoints are
opt-in. `--yolo` grants no additional authority: never network, production, deployment, secret, package,
live-probe, external-message, or destructive-write permission.

Respect every approval boundary and repository-local instruction loaded by the
canonical command. Use only tools and agents available in the current runtime,
following the command's explicit fallback rules when names differ.

## Maintenance rule

Never copy the command body into this skill. Update
`~/.agents/commands/feature-pro.md` for workflow behavior and update this
adapter only when Codex discovery or load-order behavior changes.
