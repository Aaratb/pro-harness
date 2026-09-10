---
name: workspace-learning-pro
description: "Run the complete workspace-wide repository learning workflow through its canonical progressive-loading command."
---

# Workspace Learning Pro

Use this skill when the user invokes Workspace Learning Pro or asks to learn every local repository through CodeQA interrogation, Explainer Pro courses, course publication, and canonical code maps.

## Load order

1. Resolve `HARNESS_ROOT` from the adapter-provided canonical harness root first. If the adapter supplies no root, default to `~/.agents`; expand the leading tilde before filesystem access. Never derive the harness root from the target workspace or current directory.
2. Read `$HARNESS_ROOT/commands/workspace-learning-pro.md` completely and preserve the workspace, repository selection, arguments, and requested continuation.
3. Show the command's opening roadmap and honor its entry choice before any repository inspection, writes, skill loading, or agent dispatch. Only then resolve scope and continue.
4. Read `$HARNESS_ROOT/skills/workspace-learning-core/SKILL.md`, `$HARNESS_ROOT/commands/workspace-learning-pro/routing.md`, and only the active phase selected by `$HARNESS_ROOT/commands/workspace-learning-pro/contract.json`.
5. Resolve only that phase's agents, skills, external runtime skills, and downstream commands.

If the resolved root or a canonical file is unavailable, stop and report its exact path. Do not fall through to a second installation, reconstruct the workflow from memory, or replace Explainer Pro, the docs publisher, CodeQA, or Workspace Codemap Pro with a generic approximation.

## Boundaries

Keep target source and configuration read-only. Use the exact caller-supplied `artifact_root` for each repository learning lane, and preserve the command-owned workspace state root. Never redirect generated learning artifacts into the harness installation.
