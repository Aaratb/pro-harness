---
name: architecture-security-review
description: "Run one coordinated architecture security review with triggered API, identity, privacy, AI-tool, and infrastructure focus packets."
---

# Architecture Security Review

Always produce a minimal map of assets, actors, identities, trust boundaries, entry points, authority, sensitive data classes, transfers, sinks, and abuse cases.

Route only the focus packets triggered by evidence:

- `api-and-authorization`: authentication, object and function authorization, validation, webhooks, replay, errors, and outbound destinations;
- `secrets-and-machine-identity`: secret lifecycle, service identities, scope, rotation, revocation, and environment isolation;
- `privacy-and-data-transfer`: tenant provenance, minimization, redaction, retention, deletion, analytics, models, exports, and external transfers;
- `ai-and-tool-boundaries`: untrusted context, prompts, retrieval, memory, model output, tool schemas, approvals, excessive agency, and destination control;
- `infrastructure-and-delivery`: workloads, identity, exposure, configuration, build inputs, supply chain, deployment, and rollback.

## Follow authority into an effect

For a material abuse case, trace the actor and preconditions → attacker-controlled input → trust boundary → claimed identity and authority → protected action or data sink. Identify the component that actually enforces authorization, not merely the component that displays a permission or validates input shape. Cite the enforcement and every relevant alternate entry path; a controller check does not protect an unguarded worker, export, or internal caller.

Challenge that path with the smallest credible bypass: a different tenant or object identifier, stale or revoked authority, replay after a timeout, a redirected destination, or a privileged service acting on untrusted instructions. Explain which invariant fails, what the attacker gains, and how far the effect can spread. Then specify the negative assertion that would refute the concern. Distinguish source-confirmed controls from unverified runtime behavior; absence of a visible exploit is not proof of protection.

For example, schema-valid tool arguments can still request another tenant's document. Trace how trusted tenant context reaches retrieval and the final action, and whether changing a model-supplied identifier can override it. When AI or tools are material, reuse `ai-product-engineering` and its `references/security-and-harness.md` for prompt, retrieval, and tool-boundary methods rather than inventing a second security framework.

Choose controls at the boundary that owns the authority and compare the simplest effective control with its operational and user cost. Keep abuse analysis bounded to credible paths and approved scope. This is a static review. Describe adversarial cases and required verification, but do not execute attacks, invoke tools on the target's behalf, or widen access.

Deduplicate findings by root cause and assign one owner. Never expose sensitive values or claim runtime posture from static configuration. Return the threat and transfer map, focused findings, and verification needs beneath the caller-supplied `artifact_root`.
