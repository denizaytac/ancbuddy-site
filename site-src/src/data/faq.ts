export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Is this an official Bose product?",
    a: "No. ANCBuddy is an independent third‑party utility. Bose, QuietComfort, and QC Ultra are trademarks of Bose Corporation. ANCBuddy is not affiliated with, endorsed by, or sponsored by Bose.",
  },
  {
    q: "Which Macs and macOS versions are supported?",
    a: "macOS 12 Monterey and newer, Apple Silicon and Intel Macs are supported. ANCBuddy is signed and notarized for normal macOS installation.",
  },
  {
    q: "Do I need the Bose Music app open?",
    a: "No. ANCBuddy talks directly to your paired Bose QC Ultra headphones over Bluetooth for mode control, so the phone app does not need to be open.",
  },
  {
    q: "How does AI Auto‑EQ handle my music data?",
    a: "AI Auto‑EQ is opt‑in. When enabled, ANCBuddy sends the current artist, title, and album to the AI service only to generate a 3‑band EQ profile for that track. Results are cached by a hashed track key, and raw song names are not stored.",
  },
  {
    q: "What's the difference between Quiet, Aware, and Immersion?",
    a: "Quiet is full noise cancellation. Aware lets more of your surroundings through. Immersion is Bose's wider, more spacious listening mode.",
  },
  {
    q: "How do updates work?",
    a: "ANCBuddy includes a Check for Updates action in the panel and can check for updates in the background. Installs are user-confirmed.",
  },
  {
    q: "Can it launch at login?",
    a: "Yes. The panel includes a Launch at Login switch, so you can decide whether ANCBuddy starts automatically with your Mac.",
  },
  {
    q: "I bought BoseControl. Do I need to buy again?",
    a: "No. The ANCBuddy 2.x app migrates existing BoseControl license and trial data automatically when it starts.",
  },
  {
    q: "Will it work with my Sony / Sennheiser / AirPods?",
    a: "No. ANCBuddy is built specifically for Bose QC Ultra headphones and earbuds. Other manufacturers use different control systems.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. The trial runs for 14 days. If you like it, $9.99 unlocks ANCBuddy permanently.",
  },
  {
    q: "Refunds?",
    a: "Yes — 14‑day no‑questions refund through Lemon Squeezy.",
  },
];
