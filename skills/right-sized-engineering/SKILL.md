---
name: right-sized-engineering
description: "Judge whether a proposed solution matches the actual complexity of the problem, refusing both over-engineering and under-engineering."
---

# Right-Sized Engineering

Use the caller-supplied `artifact_root` for every workflow-owned artifact.

1. State the problem's actual complexity before proposing anything: the invariants it imposes, the failure modes that matter, the scale and lifetime it must survive, and the cost of being wrong. Complexity is a property of the problem, not of the solution you already have in mind.
2. Size the solution to that reading, then say so in one line: the complexity, the size it warrants, and what you deliberately did not build. A judgement nobody wrote down cannot be challenged.
3. Refuse over-engineering. A new service, queue, cache, abstraction layer, versioned interface, extension point, or configuration surface requires a requirement behind it that exists today. Generality built for an unnamed future caller is cost paid now for a benefit nobody has asked for.
4. Refuse under-engineering with equal force. A domain with real relationships modelled as one blob, integrity left to application code that cannot enforce it, a money or identity path with no idempotency, or a schema change with no backfill plan are not simplicity — they are deferred failures. "Simple" is not a defence when the problem is not.
5. Distinguish the two failure directions by asking what breaks. Over-engineering wastes effort and slows change; under-engineering corrupts data, loses money, or cannot be rolled back. Where the evidence is genuinely balanced, prefer the reversible choice and record why.
6. Anchor the judgement in what is knowable now. Cite the requirement, the constraint, or the observed access pattern that forces each decision; label a projection as a projection and name who owns it.
7. Treat a fixed threshold as a proxy, never as the rule. File length, service count, table count, and layer count are signals that something may be carrying more than one job. Investigate what the signal points at; never split a coherent unit or merge an incoherent one to satisfy a number.
8. Carry the judgement forward rather than re-deciding it. A later phase that disagrees returns to the phase that made the call; it does not quietly resize the solution while implementing it.
