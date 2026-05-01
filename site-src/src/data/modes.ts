import type { IconName } from "@/components/Icon";

export interface Mode {
  id: number;
  name: string;
  desc: string;
  shortcut: string;
  icon: IconName;
}

export const MODES: Mode[] = [
  { id: 0, name: "Quiet", desc: "Block out the world", shortcut: "⌃⌥1", icon: "quiet" },
  { id: 1, name: "Aware", desc: "Stay in the room", shortcut: "⌃⌥2", icon: "aware" },
  { id: 2, name: "Immersion", desc: "360° spatial audio", shortcut: "⌃⌥3", icon: "immersion" },
];
