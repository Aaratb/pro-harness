---
name: debug-pro
description: Run the canonical adaptive Debug Pro workflow for direct defects or Review Pro handoffs, preserving exact reproduction, bounded repair, and independent re-verification.
---

# Debug Pro

This is a thin discovery adapter; the command owns the workflow.

1. Preserve the complete symptom, flags, attachments, and requested outcome.
2. Resolve the harness root from this installed skill's location and read `commands/debug-pro.md` completely. Show its opening roadmap and honor its entry choice before the steps below.
3. Read `skills/debug-core/SKILL.md` and `commands/debug-pro/routing.md` completely.
4. Follow the current phase from the contract, loading only its needed skills and references.
5. Preserve adaptive depth, repository-local artifacts, scope, repair gates, and completion validation.

If the command is unavailable, report the missing prerequisite. Do not reconstruct it from memory or substitute an unrelated debug workflow.

Write generated artifacts only beneath the caller-supplied `artifact_root`; never invent an alternate output folder. Project edits require the command's distinct repair eligibility and authorization gates.
