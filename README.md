# ANCBuddy

Website and approval-gated Growth Agent for [ANCBuddy](https://ancbuddy.com) — a macOS menu bar app for Bose QC Ultra headphones (Gen 1 & Gen 2) and Earbuds (2nd Gen).

## Repository

- `site-src/` builds the public GitHub Pages site and the protected `/ceo/` approval inbox.
- `growth-agent/` is the FastAPI and OpenAI Agents SDK service.
- `supabase/migrations/` contains attribution and durable Growth Agent state.
- `.github/workflows/growth-agent-schedule.yml` triggers daily and weekly analysis runs.

The agent may research, analyze, and draft autonomously. Email, posts, listings, website pull requests, and other external actions require an exact-version CEO approval before an adapter can execute them. Simulation mode is the default.

Start with [Growth Agent operations](docs/growth-agent-operations.md), then use the component READMEs for local commands.

## Repository hygiene

Install the versioned push guard once per clone:

```bash
git config core.hooksPath .githooks
```

Run `./scripts/repo-health.sh` before starting and after finishing a task. It
checks every linked worktree and stops when tracked or untracked work would be
left behind. The pre-push hook runs the same check automatically.

For non-trivial work, use a dedicated branch/worktree. Before a push or
Supabase deployment, commit the implementation, run the relevant component
tests, and confirm the repository-health check passes. After merging, remove
the temporary worktree and branch; keep recovery stashes only until the commits
are stored remotely or in another durable backup.

> Independent app. Not affiliated with Bose Corporation. Bose® and QuietComfort® are trademarks of Bose Corporation.
