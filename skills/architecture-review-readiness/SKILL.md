---
name: architecture-review-readiness
description: "Turn certified architecture evidence into a concise decision memo, uncertainty register, failure defense, and review rehearsal."
---

# Architecture Review Readiness

Prepare a 250–400 word decision memo plus an evidence appendix. Include the problem, constraints, credible viable options, evidence-backed exclusions and fresh independent challenge when the set is narrow, recommendation, choice costs, rejected alternatives, dissent, decision request, and the exact section `What I'm least sure about`. Reuse the governed option set; do not invent alternatives to meet a quota.

Test the boring baseline, validity envelope, falsifiers, and material dependency failure, races, malicious input, overload, and scaling behavior. Reuse verified evidence and justified immaterial dispositions from the design; reopen gaps rather than replaying unchanged analysis. Mark decision-sensitive product or provider facts unverified until primary evidence resolves them.

Defend the decision, not the paperwork. Can a builder explain which component owns each important invariant, why a simpler boundary fails or succeeds, and what must stay true during migration and rollback? Use the strongest actual counterexample from independent challenge and the resulting design change or evidence-backed rebuttal. “The agents agreed” and an average score are not a defense. Keep unresolved dissent visible and return user-owned trade-offs to the user.

Explain the first likely break inside the design's validity envelope and the signal that would change the recommendation. Distinguish a specified fitness check, modeled feasibility, and executed proof. A statically coherent new design is not a claim that an unbuilt system has passed production performance, security, recovery, or AI-quality tests. Preserve the governing certification requirements and identify missing evidence, owner, and next safe proof instead of relabeling unknowns.

Include an Engineering Fitness Matrix covering material query performance, recovery, approved capacity targets, security, end-to-end latency, sync and async boundaries, concurrency, and overload. Include 1x, 10x, and 100x when material to the requested scale or risk. Each material row has separate health, target-attainment, and evidence-confidence outcomes, evidence references, next proof, owner, and deadline. Reference scoped immaterial dispositions without redundant filler rows.

Run the architect's two-minute teach-back: explain the capability, chosen shape, one end-to-end request, important trade-off, first likely failure, and recovery or change path. This is not a quiz or memory exam for the user. Invite corrections and ask for explicit author approval; silence or a suggested answer is not consent. Reopen material corrections through the existing legal transition.

Write `ARCHITECT_REVIEW.md` beneath the caller-supplied `artifact_root` when authorized as the orchestrator. A static lane returns the same substance in the supplied report contract without writing files. The concise memo is the front door, not a word limit on necessary evidence in the appendix; reuse existing evidence instead of duplicating it.
