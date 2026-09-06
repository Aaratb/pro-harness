---
name: library-first-engineering
description: "Select and reuse existing repository code, language standard-library functions, installed dependencies, and mature libraries before authoring custom implementations. Use during implementation planning, dependency selection, coding, refactoring, compression, and code review."
---

# Reuse-First Engineering

Use the caller-supplied `artifact_root`. The canonical skill ID stays `library-first-engineering` for compatibility. Reuse means existing services, functions, components, utilities, generated clients, and established code patterns first—not a mandatory library-selection exercise. Read `references/decision-framework.md` only when there is a real choice left to evaluate.

## Workflow

1. Search relevant repository code, call sites, and tests for the required behavior. Reuse the existing decision and evidence if already established.
2. Prefer using, extending, or extracting suitable local code while respecting its ownership and boundaries. Suitable local reuse closes the gate with a brief source/test reference and reason. No external documentation or comparison matrix is required for a purely local decision.
3. If local code does not fit, consider standard APIs and installed dependencies before a new package or custom implementation. Do not exhaust every level after finding a suitable answer.
4. For a selected external API, verify its current primary documentation and version compatibility rather than coding from memory. Source and tests are the evidence for local APIs.
5. Use the decision framework only for genuinely competing alternatives or material risk.
6. Record the decision briefly in the existing plan or reuse log, including compatibility or custom-code rationale only when applicable. Do not create a separate library report or research task for each function.
7. Use the public API as intended. Add only the adapter needed to preserve repository boundaries and testability.

## Guardrails

- Never add a dependency solely to avoid a small, clear standard-library implementation.
- Never reimplement security, parsing, protocol, concurrency, date/time, serialization, or cryptographic behavior casually.
- Do not install, upgrade, or replace a dependency without task authority and repository-native verification.
- Do not force a library whose abstraction conflicts with the repository or whose maintenance/security posture is unacceptable.
- Custom code is allowed when the alternatives fail the documented requirements; record why.

## Output

Return the existing code being reused/extended/extracted and its source/test evidence, or the justified API/custom choice. Include compatibility, risk, and verification notes proportionate to the actual decision.

## Stop conditions

- Stop only the affected implementation when a necessary selected external API/version cannot be verified; this is not a reason to block verified local reuse.
- Stop before adding a package when installation authority, compatibility, or repository policy is unresolved.
