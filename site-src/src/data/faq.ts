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
    a: "macOS 13 Ventura and newer, Apple Silicon and Intel. The app is signed and notarized by Apple — no security warnings on first launch.",
  },
  {
    q: "How does it talk to the headphones?",
    a: "Direct Bluetooth Low Energy. ANCBuddy uses the Bose BMAP protocol (the same one the official iOS/Android app uses) over the FEBE service UUID. No cloud round‑trip, no Bose Music app required.",
  },
  {
    q: "What's the difference between Quiet, Aware, and Immersion?",
    a: "Quiet = full noise cancellation. Aware = transparency mode (lets ambient sound through). Immersion = Bose's spatial audio mode. ANCBuddy maps each to BMAP mode index 0/1/2.",
  },
  {
    q: "Will it work with my Sony / Sennheiser / AirPods?",
    a: "No. ANCBuddy speaks Bose's proprietary BMAP. Other manufacturers use their own protocols. (If there's enough demand, multi‑brand support might come later.)",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Drop your email and get the same DMG with a 14‑day timer. If you like it, $9.99 unlocks it permanently.",
  },
  {
    q: "Refunds?",
    a: "Yes — 14‑day no‑questions refund through Lemon Squeezy.",
  },
];
