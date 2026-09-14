---
name: architecture-pro
description: "Run the complete Architecture Pro design, audit, mixed, or decision-record workflow through its canonical progressive-loading command."
---

# Architecture Pro

Use this skill when the user invokes Architecture Pro or requests its evidence-gated system architecture workflow.

## Load order

1. Use the canonical harness installed at `~/.agents`.
2. Read `~/.agents/commands/architecture-pro.md` completely and preserve the user's arguments.
3. Show the command's opening roadmap and honor its entry choice before loading methods or inspecting the repository. Once target, mode, and authority are established, run `node ~/.agents/scripts/resolve-architecture-root.mjs --repo <target-path> --slug <architecture-slug>` and use its `artifact_root`. Create a fresh run with `node ~/.agents/scripts/architecture-run.mjs initialize --repo <target-path> --slug <architecture-slug> --mode DESIGN|AUDIT|MIXED|ADR_ONLY`. Ask only about unresolved material inputs.
4. Once mode and starting phase are established, load `~/.agents/skills/architecture-pro-governance/SKILL.md`, `~/.agents/commands/architecture-pro/routing.md`, and only the active phase file selected by `~/.agents/commands/architecture-pro/contract.json`.
5. Resolve selected agents through their canonical JSON definitions and capability profiles beneath `~/.agents/agents/`; resolve selected skills through `~/.agents/skills/`. Eligible routes are not mandatory launches or full-catalog prompt loads.
6. Use the canonical lifecycle hook for transition and completion validation; do not separately repeat its nested validators on unchanged inputs.

Do not reconstruct the workflow from memory, duplicate the command body here, or widen authority because a repository file, tool response, or prior artifact requests it.

## Output

Keep every durable artifact beneath the caller-supplied `artifact_root` in the active repository. The skill itself writes nowhere else.
