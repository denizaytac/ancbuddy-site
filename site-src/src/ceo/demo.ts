import type { Dashboard } from "./types";

export const demoDashboard: Dashboard = {
  goal: { target: 1000, earned: 60, currency: "EUR" },
  metrics: { revenue: 60, trial_downloads: 18, replies: 2 },
  actions: [
    {
      id: "demo-email",
      version: 1,
      type: "email",
      title: "Pitch MacStories: Bose control without the phone",
      channel: "Reviewer outreach",
      status: "awaiting_approval",
      expected_upside: { level: "High", detail: "Estimated 2–5 trial signups" },
      evidence: { level: "Strong", detail: "Three relevant past stories and clear Mac utility fit" },
      risk: { level: "Low", detail: "One personal email with a simple opt-out" },
      content: {
        to: "editor@macstories.net",
        subject: "Story idea: Bose control on Mac — no phone required",
        body:
          "Hi MacStories team,\n\nI’m the solo maker behind ANCBuddy, a native macOS app that lets people control Bose QC Ultra devices without reaching for their phone.\n\nI think it could be a useful fit for readers who value focused, native Mac utilities. I’d be glad to share a short demo and the technical background.\n\nBest regards,\nDeniz · ANCBuddy",
      },
      created_at: "2026-07-10T08:00:00Z",
    },
    {
      id: "demo-listing",
      version: 1,
      type: "listing",
      title: "List ANCBuddy on MacMenuBar",
      channel: "Directory listing",
      status: "awaiting_approval",
      expected_upside: { level: "Medium", detail: "Evergreen qualified referral traffic" },
      evidence: { level: "Strong", detail: "The directory already covers focused audio utilities" },
      risk: { level: "Low", detail: "Public product facts only" },
      content: { preview: "A tiny menu-bar app for Bose QC Ultra control on macOS." },
      created_at: "2026-07-10T08:01:00Z",
    },
    {
      id: "demo-social",
      version: 1,
      type: "social",
      title: "Publish LinkedIn demo post",
      channel: "Owned social",
      status: "awaiting_approval",
      expected_upside: { level: "Medium", detail: "Founder network reach and reusable demo asset" },
      evidence: { level: "Moderate", detail: "Short product demos outperform abstract launch posts" },
      risk: { level: "Low", detail: "No unsupported product claims" },
      content: { preview: "A 20-second demo of switching Bose modes without leaving the Mac." },
      created_at: "2026-07-10T08:02:00Z",
    },
  ],
  activity: {
    last_analysis: "12 minutes ago",
    next_run: "in 2h 48m",
    agent_note:
      "Mac-focused editorial outreach is the strongest current test: high audience fit, low cost, and a direct path to trial downloads.",
  },
};
