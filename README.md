# ANCBuddy

Website and approval-gated Growth Agent for [ANCBuddy](https://ancbuddy.com) — a macOS menu bar app for Bose QC Ultra headphones (Gen 1 & Gen 2) and Earbuds (2nd Gen).

## Repository

- `site-src/` builds the public GitHub Pages site and the protected `/ceo/` approval inbox.
- `growth-agent/` is the FastAPI and OpenAI Agents SDK service.
- `supabase/migrations/` contains attribution and durable Growth Agent state.
- `.github/workflows/growth-agent-schedule.yml` triggers daily and weekly analysis runs.

The agent may research, analyze, and draft autonomously. Email, posts, listings, website pull requests, and other external actions require an exact-version CEO approval before an adapter can execute them. Simulation mode is the default.

Start with [Growth Agent operations](docs/growth-agent-operations.md), then use the component READMEs for local commands.

> Independent app. Not affiliated with Bose Corporation. Bose® and QuietComfort® are trademarks of Bose Corporation.
