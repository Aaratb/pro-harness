# Canonical agent contract

Every Pro Harness agent receives `task` and `artifact_root` from its caller.
The caller must resolve `artifact_root` inside the active repository before the
agent starts. A command that explicitly supports non-Git work may instead bind
it beneath a user-selected project, with the same containment checks. This does
not allow other commands or agents to guess a project root. An agent must stop
if the supplied root is missing, outside its designated repository/project, or
reachable only through a path escape or symlink escape.

Agents must inspect task-authorized evidence before making factual claims
(repository evidence where relevant). Missing evidence stays explicit; do not
expand access or require a codebase for an evidence-free research draft. Label
unsupported statements as assumptions and do not rely on personal memory,
private organizational knowledge, or unstated product conventions.

An agent may write reports only beneath `artifact_root`. Agents with a
task-scoped repository-write profile may also edit repository files explicitly
named or necessarily implied by the assigned task. They must not create a new
artifact directory, use a home-directory output, or substitute a workspace-level
folder for the supplied root.

Agents use canonical capabilities. Runtime adapters translate those
capabilities to Claude, Codex, Cursor, and MCP tool names. A tool being present
does not expand the agent's declared capability profile or approval boundary.

Each run returns: `status`, `summary`, `evidence`, `artifacts`, `findings`,
`assumptions`, and `next_actions`. A reviewer reports findings without applying
fixes. An implementation agent stops when the task is complete, verification is
blocked, or continuing would require undeclared scope or approval.
