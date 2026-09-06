---
name: codebase-onboarding
description: "Build a concise evidence-backed map of an unfamiliar repository before planning or implementation."
---

# Codebase Onboarding

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
A supplied root does not grant write permission. Return findings inline when the caller is read-only or another coordinator owns persistence. For authorized writes, stop artifact creation if the root is missing, outside the active repository, or escapes through a symlink; do not invent another folder.

## Workflow

1. Establish the actual repository/workspace root, requested scope, and local instructions. Read relevant manifests, entry points, source, tests, and architecture documentation. Infer the repository shape from evidence, using [repository shapes](../explainer-core/references/repository-archetypes.md) when useful. A library, frontend, worker, infrastructure module, or mixed workspace needs its own vocabulary, not an assumed application stack.
2. Produce a navigation map, not a directory inventory. Follow a representative public action through entry point → rule or invariant owner → state change or external effect → result/error. Explain what the user or downstream caller receives. Cite the actual import, call, registration, or configuration site for each material connection; file existence does not prove an edge. Keep unresolved, dynamic, generated, and external behavior explicit.
3. Distinguish module/package boundaries from process and deployment boundaries. Manifests and schemas describe declarations, not observed runtime enforcement. Where state or deferred work matters, connect the relevant check to its writer and distinguish acceptance, persistence, business completion, and acknowledgement. An asynchronous function is not automatically background work; a successful enqueue is not proof of consumer success.
4. Identify existing reusable functions, services, wrappers, and public contracts near the requested change. Point to their actual callers and direct reverse uses within the inspected scope, including the input/result/error contract and ownership that reuse must preserve. A dependency declaration alone does not establish usage. Complete reverse-use claims require exhaustive scoped search.
5. Give a practical change route: task or question → likely files/symbols → preserved contract or invariant → nearby tests and verification command. Say what those tests assert and where mocks limit their evidence; do not claim an unexecuted command passed. Separate source-backed behavior, documentation-only intent, and unknowns. Stop once the requested navigation is useful rather than mapping every file.

For a material dependency, state, or timing question, selectively reuse [dependency resolution](../explainer-system-views/references/dependency-resolution.md), [data and state](../explainer-system-views/references/data-and-state.md), or [execution timing](../explainer-system-views/references/execution-timing.md). These are evidence methods only: do not import Explainer phases, persisted graphs, claim schemas, courses, or publication requirements. Do not execute package code or fetch external documentation merely to create a map.

## Output

Return the concise map with source locators, inspected scope, useful change routes, and narrow unknowns. If persistence is authorized and caller-owned output conventions require it, write beneath `artifact_root` and return the path; otherwise return content to the caller.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
