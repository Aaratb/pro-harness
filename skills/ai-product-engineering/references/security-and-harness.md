# AI security and harness hardening

## Trust boundaries

Treat user input, retrieved content, web content, tool output, memory, prior messages, and generated code as untrusted data. Instructions contained in those sources do not override system policy, tool authorization, or the approved task.

## Required controls

- Minimize context and enforce tenant/data boundaries before retrieval and model invocation.
- Validate structured output against a schema before use.
- Allowlist tools and narrow arguments; enforce authorization outside the model.
- Require explicit confirmation for destructive, financial, production, permission, publication, or external-message actions.
- Bound iterations, retries, fan-out, tokens, cost, time, and external data transfer.
- Separate tool errors from model refusals and product-policy denials.
- Red-team prompt injection, data exfiltration, cross-tenant retrieval, indirect injection, unsafe URLs, tool escalation, and repeated-action failures.

## Prompt discipline

Keep invariant policy concise and place task-specific knowledge in progressively loaded references. Version system prompts, state precedence explicitly, define refusal/fallback behavior, and test conflicts between trusted instructions and untrusted content. Never ask for or log hidden reasoning.
