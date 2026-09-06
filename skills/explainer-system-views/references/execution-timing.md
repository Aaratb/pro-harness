# Execution-timing evidence

Classify timing from mechanisms, not naming.

Confirmed signals include awaited calls, returned promises or futures, callback registration, event publication, queue production and consumption, worker registration, scheduled tasks, subprocesses, background tasks, streams, reactive subscriptions, and explicit concurrency primitives.

For every hop record whether the caller waits, what durable boundary exists, what acknowledges completion, where errors surface, whether retries are configured, and what observable outcome occurs before return. Missing `await` alone is meaningful only after confirming the returned value and caller behavior.

Timeouts, retry counts, backoff, ordering, delivery guarantees, and SDK defaults require cited configuration or approved current vendor documentation. A single observed log or trace is one example, not a universal guarantee.

An `async` declaration does not mean background work, and an awaited call does not necessarily block a thread. Explain both the immediate return value, such as a promise, and when the relevant caller considers the operation complete. Work awaited before that completion may finish within the caller's operation; work started without an await may still run synchronously or have an unknown completion relationship. Follow the actual call and continuation rather than assigning timing from keywords.

For the running example, distinguish acceptance, persistence, business completion, and acknowledgement at the boundaries the code exposes. A producer's successful enqueue or publish establishes only what its supported contract promises; it does not prove consumer execution, durable business effects, ordering, or exactly-once delivery. Show where failures return to the caller versus surface in another worker or callback, and where repository evidence ends. Reconcile these boundaries with the selected path's sequence and state transition rather than inventing a second timing story.
