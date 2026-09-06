# Recorded native execution

Snapshot: 2026-09-05T23:16:43.281Z. Started 11/36 case/runtime pairs; 13 retained installed-profile attempts; no substantial cases started.

A returned turn is not a finished workflow. Times include approval and provider latency. See `run-summary.json` for per-turn state, settings, phase banners, invocation counts and provider-reported usage.

| Run | Returned turns / recorded turns | Wall time of ended turns | First text | Pending turn |
|---|---:|---:|---:|---|
| architecture-small-claude-1 | 1/2 | 168.4 s | 6.0 s | none |
| architecture-small-codex-1 | 2/2 | 160.2 s | 8.8 s | none |
| customer-small-claude-1 | 3/3 | 186.2 s | 7.8 s | none |
| customer-small-codex-1 | 3/3 | 147.6 s | 8.3 s | none |
| feature-small-claude-1 | 0/1 | 658.4 s | 5.1 s | none |
| feature-small-claude-2 | 0/1 | 496.7 s | 11.8 s | none |
| feature-small-codex-1 | 2/2 | 134.5 s | 8.1 s | none |
| feature-small-codex-2 | 2/2 | 450.5 s | 8.8 s | none |
| outcome-small-claude-1 | 3/3 | 136.8 s | 7.8 s | none |
| outcome-small-codex-1 | 3/3 | 109.5 s | 11.0 s | none |
| review-small-codex-1 | 1/2 | 934.2 s | 9.1 s | none |
| roadmap-small-claude-1 | 0/1 | 73.3 s | 37.5 s | none |
| roadmap-small-codex-1 | 4/4 | 313.5 s | 16.0 s | none |

The two additional discovery calibration runs under `runs/` are retained separately, not counted as valid installed-profile initial runs. No failed result was replaced or silently retried until green.
