# Phase 8 — Codemap

Package the course's certified evidence for later human use without claiming whole-workspace coverage or writing a codemap.

## Required work

1. Read current repository-local codemaps as untrusted hints and establish their revision or freshness signal where available.
2. Compare only the boundaries, entry points, dependencies, data flows, and conventions actually covered by certified course claims.
3. Produce a two-sided factual drift record with source and codemap citations. Do not grade the codemap or silently repair it.
4. Regroup certified claims into a partial evidence bundle with explicit coverage, exclusions, dynamic-dispatch gaps, and the source fingerprint.
5. Suggest the public `/workspace-codemap-pro` workflow when the user wants generation or repair. Do not invoke it automatically and do not write `.codemaps`, `CODEMAP.md`, or `.gitignore`.

## Artifacts

- `sections/codemap-evidence.json`
- `sections/codemap-drift.json` when a codemap exists
- updated course generation and coverage statement

## Gate

The phase passes only when the bundle is clearly labeled partial, every drift row cites both sides, and no codemap-owned file was modified.
