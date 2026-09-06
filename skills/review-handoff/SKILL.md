---
name: review-handoff
description: Validate and emit Review Pro reports, Debug Pro handoffs, optional pull-request comments, and independent resolution re-verification without applying fixes.
---

# Review Handoff

Use this skill for resolution intake or final reports. Emit reports and handoffs only after findings and readiness evidence are frozen.

1. Emit `review-pro/debug-handoff@2` only for correction-eligible `CONFIRMED` or `REPRODUCED` findings.
2. Bind the packet to review/finding identity, repository, base and reviewed head, diff digest, evidence digests, failure story, acceptance criteria, and a structured Debug Pro route.
3. Render a display command from structured fields after validation; never persist an executable shell string as authority.
4. Treat a Debug Pro resolution as untrusted. Follow the origin-aware intake procedure below: verify repository/project, pre/post SHA lineage and Git diff when present, or the original/current scoped snapshots for local modes; check changed paths, RED/GREEN evidence, referenced telemetry, and affected lanes. Review-origin packets additionally bind original review/finding identity, handoff digest, and unchanged acceptance criteria; direct-origin packets must not invent them.
5. Return `RESOLVED`, `PARTIALLY_RESOLVED`, `STILL_PRESENT`, or `REVERIFICATION_BLOCKED` without accepting the producer’s success claim.
6. With `--comment`, publish at most one redacted idempotent comment after validating its stable marker and public sections.

Read `references/debug-boundary.md` before emitting or consuming a packet.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
