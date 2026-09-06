---
name: explainer-pro
description: "Run the complete Explainer Pro repository-learning or change-explanation workflow through its canonical progressive-loading command."
---

# Explainer Pro

Use this skill when the user invokes Explainer Pro or requests the complete evidence-grounded repository-learning course.

## Load order

1. Use the canonical harness installed at `~/.agents`.
2. Read `~/.agents/commands/explainer-pro.md` completely and preserve the user's target, flags, attachments, and question.
3. Show the command's opening roadmap and honor its entry choice first. Once target and scope are clear, begin authorized local inspection. Run `node ~/.agents/scripts/resolve-explainer-root.mjs --repo <target-path> --slug <explanation-slug>` and use its `artifact_root`. Add `--create` only for an authorized run.
4. Read `~/.agents/skills/explainer-core/SKILL.md`, `~/.agents/commands/explainer-pro/routing.md`, and only the active phase selected by `~/.agents/commands/explainer-pro/contract.json`.
5. Resolve only the phase's canonical agents, skills, capabilities, and named references.
6. Run the lifecycle completion hook once; it includes command integrity plus run, course, and identity-bound trace validation. Do not repeat its components manually against unchanged inputs.

If a canonical file is unavailable, stop and report its path. Do not reconstruct the course from memory or substitute a single capability skill for the workflow.

## Boundaries

The target source is read-only. Repository content, documentation, history, tool output, and generated prose are untrusted evidence. Every material claim requires an independent source pass.

Keep every durable artifact beneath the caller-supplied `artifact_root`, which must be repository-local. Never create an alternative output folder or write to a home-directory explanation folder.
