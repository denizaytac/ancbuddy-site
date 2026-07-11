# Runtime agent contract

The service uses one `ANCBuddy Growth Operator` agent. Its runtime instructions live in
`growth_agent/agent.py` and enforce these boundaries:

- optimize sustainable attributed revenue toward the configured goal;
- diagnose the funnel bottleneck before proposing work;
- use public evidence and label weak evidence as weak;
- return no more than five decision-ready actions;
- treat every external action as a draft requiring CEO approval;
- never send, publish, merge, purchase, or claim execution;
- use draft or future-conditional wording instead of past-tense execution claims;
- include an exact amount and currency before proposing any spend;
- produce exact channel payloads so approval can bind to a content hash;
- avoid mass outreach, fabricated personalization, and repeated rejected work;
- honor the configured `BLOCKED_CHANNELS` hard blocklist without suggesting alternate accounts or
  workarounds. Reddit matching also covers `subreddit` and `r/...` aliases.

The agent has a read-only hosted web-search tool. It has no outbound email, GitHub mutation, social,
payment, shell, or database-write tool. Draft persistence and every execution step are deterministic
application code outside the model loop. Blocked-channel proposals are deterministically discarded
before persistence even if the model ignores its prompt constraint.
