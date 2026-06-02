import type { IconName } from "@/components/Icon";

export interface Mode {
  id: number;
  name: string;
  desc: string;
  icon: IconName;
}

export const MODES: Mode[] = [
  { id: 0, name: "Quiet", desc: "Full noise cancellation", icon: "quiet" },
  { id: 1, name: "Aware", desc: "Hear your surroundings", icon: "aware" },
  { id: 2, name: "Immersion", desc: "Wider, more spacious sound", icon: "immersion" },
];
