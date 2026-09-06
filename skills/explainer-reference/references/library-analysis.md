# Library analysis

Parse the repository's relevant dependency manifests and lockfiles without executing install hooks or package code. For each material direct dependency record declared version or range, resolved version when safely available, call sites, repository purpose, public surfaces used, tests, configuration, and evidence level.

Before offering usage guidance, read the local wrapper or call site and its tests end to end. Distinguish:

- `the repository uses it here`, proven locally;
- `the library currently behaves this way`, proven only by approved authoritative documentation;
- `the team chose it because`, inferred without a cited decision or history record.

Do not turn the course into a generic framework tutorial. Teach only the dependency behavior needed to understand this repository.

