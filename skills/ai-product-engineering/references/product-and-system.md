# AI product and system contract

## Product gate

Answer before architecture:

1. What user or business outcome requires probabilistic behavior?
2. What deterministic or manual baseline exists?
3. Which failure modes are merely inconvenient, and which cause financial, legal, privacy, safety, or trust harm?
4. How will users understand uncertainty, correction, refusal, and fallback?
5. What measurable improvement justifies added cost and operational risk?

## Versioned contracts

Record independently versioned identifiers for:

- provider and model;
- system and developer prompts;
- input/output schemas;
- retrieval/index configuration and source policy;
- tool schemas, authorization, and confirmation rules;
- safety policy and refusal behavior;
- evaluation dataset and scoring rubric.

Do not hide model, prompt, or retrieval changes inside unrelated application releases.

## Architecture questions

- What remains deterministic before and after the model call?
- Which context is necessary, who is authorized to disclose it, and how is it minimized?
- What happens on timeout, rate limit, malformed output, refusal, tool failure, provider outage, or budget exhaustion?
- What stays synchronous, what becomes asynchronous, and how are duplicates/cancellation handled?
- Where are retries safe, and where could they duplicate consequential actions?
- Which decisions require a human confirmation or review?

Include a sequence diagram showing context assembly, model invocation, retrieval, tools, validation, fallback, telemetry, and user-visible outcome.
