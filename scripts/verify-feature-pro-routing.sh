#!/usr/bin/env bash
set -euo pipefail

agents_home="${AGENTS_HOME:-$HOME/.agents}"
canonical="$agents_home/commands/feature-pro.md"

resolve_path() {
  python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

if [[ ! -f "$canonical" ]]; then
  printf 'status=error\nsummary=missing canonical Feature Pro command\npath=%s\n' "$canonical" >&2
  exit 1
fi

canonical_real="$(resolve_path "$canonical")"
checked=0

for adapter in "$HOME/.claude/commands/feature-pro.md" "$HOME/.cursor/commands/feature-pro.md"; do
  if [[ ! -e "$adapter" ]]; then
    continue
  fi

  checked=$((checked + 1))
  adapter_real="$(resolve_path "$adapter")"
  if [[ "$adapter_real" != "$canonical_real" ]]; then
    printf 'status=error\nsummary=Feature Pro adapter does not resolve to the canonical command\ncanonical=%s\nadapter=%s\n' "$canonical_real" "$adapter_real" >&2
    exit 1
  fi
done

printf 'status=success\nsummary=Feature Pro command routing is consistent\ncanonical=%s\nadapters_checked=%s\n' "$canonical_real" "$checked"
