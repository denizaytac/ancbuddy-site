# Repository hygiene

These rules supplement the parent ANCBuddy instructions.

- Ensure `git config --local core.hooksPath .githooks` is set for this clone.
- Before editing, run `./scripts/repo-health.sh`. If any linked worktree is
  dirty, preserve and classify that work before starting something unrelated.
- Use a dedicated branch/worktree for non-trivial work. Do not accumulate
  unrelated changes directly on `main`.
- Before ending a task, run the relevant tests, create coherent commits, and
  leave the worktree clean. If work is intentionally incomplete, use a named
  stash and report it explicitly.
- Never push or deploy while any linked worktree is dirty. Supabase migrations
  and functions must be committed before their live deployment.
- After a merge, verify the source commit is an ancestor of the destination,
  then remove the temporary worktree and merged branch. Keep recovery stashes
  until the commits exist on a remote or another durable backup.
