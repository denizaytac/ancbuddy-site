#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

worktree_count=0
dirty_count=0
stale_count=0

while IFS= read -r line; do
  case "$line" in
    "worktree "*)
      worktree_path="${line#worktree }"
      worktree_count=$((worktree_count + 1))

      if [[ ! -d "$worktree_path" ]]; then
        printf 'FAIL stale worktree metadata: %s\n' "$worktree_path"
        stale_count=$((stale_count + 1))
        continue
      fi

      status_output="$(git -C "$worktree_path" status --porcelain=v1 --untracked-files=all)"
      if [[ -n "$status_output" ]]; then
        printf 'FAIL dirty worktree: %s\n' "$worktree_path"
        git -C "$worktree_path" status --short
        dirty_count=$((dirty_count + 1))
      fi
      ;;
  esac
done < <(git worktree list --porcelain)

if (( dirty_count > 0 || stale_count > 0 )); then
  printf '\nStop here: preserve or commit the listed work before continuing.\n' >&2
  exit 1
fi

printf 'OK   %d linked worktree(s), all clean\n' "$worktree_count"
if (( worktree_count > 1 )); then
  printf 'WARN additional worktrees exist; remove them after their merge\n'
  git worktree list
fi

if current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null)"; then
  printf 'OK   current branch: %s\n' "$current_branch"
else
  printf 'WARN current checkout has a detached HEAD\n'
fi

if upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)"; then
  read -r behind_count ahead_count <<<"$(git rev-list --left-right --count "${upstream}...HEAD")"
  printf 'INFO %s: %s ahead, %s behind\n' "$upstream" "$ahead_count" "$behind_count"
else
  printf 'WARN current branch has no upstream\n'
fi

stash_count="$(git stash list --format='%gd' | wc -l | tr -d '[:space:]')"
if (( stash_count > 0 )); then
  printf 'WARN %d recovery stash(es); keep only until durable backup exists\n' "$stash_count"
else
  printf 'OK   no recovery stashes\n'
fi
