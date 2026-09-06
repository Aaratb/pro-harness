# Safe change intake

## Base discovery

Resolve a comparison base in this order: explicitly supplied base, approved pull-request metadata, current branch upstream, remote default branch, then ask the user. Never guess a conventional branch name.

Validate every ref as a commit before diffing. Use argument-array process execution and a controlled Git environment with hooks, pagers, text conversions, and external diff commands disabled.

## Working-tree scope

Working mode combines committed changes since the merge base, staged changes, unstaged changes, and eligible untracked files. Apply exclusions before reading content:

- exact Explainer Pro artifact root;
- ignored credential and secret paths;
- symlinks;
- binary files;
- files over the configured size limit;
- VCS internals, dependency caches, and build output.

List excluded paths and reasons without publishing their contents.

## Evidence

Record base and head identifiers, changed paths, statuses, line statistics, sanitized hunks, and surrounding files inspected. A hunk proves what changed, not why. Confirm intent only from cited commit, plan, issue, or pull-request evidence; otherwise label it inferred.

