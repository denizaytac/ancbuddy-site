import type { IconName } from "@/components/Icon";

export interface Mode {
  id: number;
  name: string;
  desc: string;
  shortcut: string;
  icon: IconName;
}

export const MODES: Mode[] = [
  { id: 0, name: "Quiet", desc: "Full noise cancellation", shortcut: "⌃⌥1", icon: "quiet" },
  { id: 1, name: "Aware", desc: "Hear your surroundings", shortcut: "⌃⌥2", icon: "aware" },
  { id: 2, name: "Immersion", desc: "Wider, more spacious sound", shortcut: "⌃⌥3", icon: "immersion" },
];
