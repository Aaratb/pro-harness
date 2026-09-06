---
name: systematic-debugging
description: "Diagnose failures through reproducible evidence, causal tracing, hypothesis testing, and bounded fixes rather than patch iteration."
---

# Systematic Debugging

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Scope before technique

The caller's authority, evidence and repair gates govern this method. A diagnosis-only request does not authorize a correction; a read-only analyst proposes experiments but does not execute them. In Debug Pro, preserve its permanent-write eligibility, RED before production edits, fresh original reproduction and independent repair review. Reuse its report; do not introduce another workflow, schema or artifact family.

## Frame the actual failure

Name the promised behavior, observed deviation and affected user or operator outcome. Compare affected and unaffected cases at the nearest useful boundary: input, identity/session, data shape, version, configuration, timing or load. A difference is a lead, not proof. Inspect existing callers, services, shared functions and tests before assuming a library or platform is broken.

Build the smallest safe loop whose assertion still describes the reported defect. Preserve the original recipe before reducing it. A browser-only auth failure may disappear when replayed without that session; a mock returning success may remove the dependency behavior that caused the bug. Track which important conditions the reduction retained and which conclusions it cannot support. Check operation side effects before repeating it.

## Find the invariant and its owner

Trace from the visible symptom to the earliest supported divergence between expected and actual state. Identify the last known-correct boundary, first known-wrong boundary, violated invariant and component responsible for enforcing it. A throwing frame often detects damage introduced elsewhere. For asynchronous paths, distinguish request acceptance, effect application, acknowledgement and retry; temporal proximity is not causal ordering.

Separate an initiating trigger, latent defect and contributing conditions where that distinction changes the repair. Explain why the proposed mechanism produces this signature, timing and affected population, including why similar unaffected cases remain healthy. Keep an unresolved boundary explicit instead of filling it with a plausible story.

## Choose a discriminating experiment

For a clear deterministic failure, an exact loop and origin check can be enough. For material ambiguity, choose credible rivals and the strongest counterevidence to the leading explanation. Predict what each would produce under the same controlled observation; prefer a low-risk experiment whose outcomes separate them. No fixed hypothesis count or exhaustive tool ladder is required.

Before execution, state the changed factor, held conditions, observable prediction and what would make the result inconclusive. A setup error, altered fixture, dropped request or bypassed assertion cannot count as disconfirmation. Record actual outcomes, update the explanation and stop repeating a probe that provides no new information. Reversal/counterfactual tests belong in a safe isolated target, not a shared production effect.

For intermittent failures, record trials and conditions, improve deterministic scheduling or fixtures where faithful, and compare like-for-like outcomes. One passing attempt or disappearance under logging is not a repair. Scope statistical claims to the observations and their dependence; do not manufacture certainty.

## Repair the mechanism, preserve the outcome

Only after the caller's gates and authorization, choose the smallest change at the boundary that owns the invariant. Reuse repository-native behavior. A retry, timeout increase, error catch or suppressed assertion is mitigation unless evidence shows it corrects the mechanism. Label containment separately from correction and identify residual harm, including already-written data.

Verify the same observable assertion, the original un-minimized path and affected shared consumers. Check that a green result did not weaken an oracle, move the expected outcome, hide an error or drop a user state. Distinguish a deterministic guard/contract failure in an AI system from probabilistic output quality; a fixed example is regression evidence, not a population-quality claim. Stop after three failed fixes on the same symptom to reassess the causal model or request a real specification/architecture decision.

## Output

Return the exact reproduction, supported causal chain, decisive experiment and counterevidence, remaining uncertainty, and next safe action. For an authorized repair include the correction and regression evidence. Use the caller's existing report beneath `artifact_root`; static delegates return content for orchestrator persistence. Explain what changed your conclusion, not every tool call.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
