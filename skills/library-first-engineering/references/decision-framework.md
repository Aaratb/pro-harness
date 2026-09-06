# Reuse decision framework

Use this order unless repository constraints justify otherwise:

Stop once a suitable option is verified. Existing local code needs a source/test reference and a brief reuse, extend, or extract decision, not the full matrix below. Apply the dimensions only when comparing genuinely competing options or assessing a material new dependency.

1. existing repository function, module, service, component, or generated client;
2. language or platform standard library;
3. already-installed and repository-approved dependency;
4. new mature dependency;
5. custom implementation.

## Compare candidates

| Dimension | Evidence when relevant |
|---|---|
| Functional fit | Required behavior, edge cases, and unsupported cases |
| Compatibility | Language/runtime/framework versions and module format |
| Security | Trust boundary, known advisories, update path, and dangerous defaults |
| Maintenance | Release activity, ownership, documentation, and deprecation status |
| Operational cost | Bundle/binary size, startup, memory, latency, network, and observability |
| API quality | Public API stability, error model, cancellation, retries, and testability |
| Repository fit | Existing conventions, abstraction boundaries, and duplication avoided |
| Exit cost | Lock-in, data/format coupling, and replacement strategy |

Prefer the smallest existing capability that fully satisfies the requirement. Popularity alone is not evidence of fit. A new dependency requires an explicit repository change, focused tests, and lockfile verification.
