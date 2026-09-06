---
name: explainer-orientation
description: "Build an evidence-backed repository atlas, learner-focused file classification, local-run guide, and dependency-aware reading plan."
---

# Explainer Orientation

Use in Phase 2 or for `repo-map` and `reading-plan` capabilities. Load Explainer Core first.

## Selective references

- Read `references/file-role-classification.md` for repository mapping.
- Read `references/reading-order.md` for the reading plan.

## Repository atlas

1. Establish product purpose, customer-facing surfaces, repository type, packages, and entry points from checked-in evidence.
2. Count the scoped corpus with generated, vendor, build, cache, and artifact-root exclusions.
3. Assign each significant file one learner-facing role and cite content that confirms the role.
4. Rank a start-here shortlist by entry-point relevance, rule ownership, cross-boundary importance, fan-in, and downstream use.
5. State which folders can be deferred and why; never call an unread area irrelevant.
6. Describe the repository's documented run path, prerequisites, configuration variable names, and success signal without executing it.
7. Seed glossary terms at first use.

## Reading plan

Use the persisted dependency graph and atlas. Order files from entry and contracts toward decisions, state, integration boundaries, and tests. Cite factual edges; label the learning order itself `INFERRED`. Each step names what to learn, why now, its prerequisite concept, and the next file.

Let the reader's question determine the first useful path. Introduce the product or package through one supported caller action, then show the files that answer its next questions. High fan-in alone does not make a generic utility a good starting point. Separate source, generated output, runtime entry and build tooling so the reader does not mistake a directory map for an execution path.

At each step name the question the file resolves and one concrete fact the reader should carry forward. Read the adjacent test for its promised outcome and fixture limits, without claiming it executed. Skip repeated scaffolding in the narrative and explain what can wait within this learning scope; unread areas are unknown, not irrelevant. A missing or stale code map is a hint-quality limitation, not a prerequisite for source-based orientation.

## Completion

The reader must be able to state what the repository does, where an action enters, which files matter first, what can wait, how it is intended to run, and why the sequence reduces backtracking.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
