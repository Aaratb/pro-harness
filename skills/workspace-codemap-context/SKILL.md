---
name: workspace-codemap-context
description: "Load and verify repository or workspace code maps without treating stale generated documentation as authoritative."
---

# Workspace Codemap Context

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
A supplied root is not write permission. Return read-only context inline to the caller/coordinator. Do not regenerate maps, migrate roots, or create artifacts.

## Workflow

1. Locate repository-local code maps; check their repository/workspace root, scope, revision, and inspected sources against the current task.
   Their absence is not a blocker: use bounded relevant source inspection instead. In an empty repository, report not-applicable without creating a map or asking to generate one.
2. Check relevant tracked changes, dirty files, and untracked sources, not just HEAD. A timestamp or digest of generated Markdown establishes neither source freshness nor truth. If freshness is unknown, fall back to current source.
3. Verify task-relevant boundaries and relationships against import, call, registration, configuration, and test evidence. A file's existence is not proof of its role; declared configuration is not observed runtime behavior.
4. Changed source invalidates affected claims and dependent views, not the whole map. Retain verified unaffected context; an older timestamp alone never requires full regeneration. Extract useful navigation, contracts, reuse candidates, and verification locations; identify stale or unknown claims narrowly.

## Output

Return the verified context summary and cite every code map or source file used.

## Stop conditions

- Stop when context is complete; report unavailable evidence or authority.
- Do not expand repository, network, production, or external-message scope without approval.
