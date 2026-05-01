import type { SVGProps } from "react";

export type IconName =
  | "headphones"
  | "quiet"
  | "aware"
  | "immersion"
  | "menubar"
  | "bolt"
  | "shield"
  | "command"
  | "code"
  | "check"
  | "arrow"
  | "plus"
  | "github"
  | "battery"
  | "wifi"
  | "search"
  | "keyboard"
  | "device"
  | "earbud"
  | "x-mark"
  | "moon"
  | "sun";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };

  switch (name) {
    case "headphones":
      return (
        <svg {...common}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
        </svg>
      );
    case "quiet":
      return (
        <svg {...common}>
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <path d="M22 9 16 15" />
          <path d="M16 9l6 6" />
        </svg>
      );
    case "aware":
      return (
        <svg {...common}>
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 5a9 9 0 0 1 0 14" />
        </svg>
      );
    case "immersion":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="7" opacity="0.6" />
          <circle cx="12" cy="12" r="11" opacity="0.3" />
        </svg>
      );
    case "menubar":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="3" rx="1" />
          <circle cx="6" cy="5.5" r="0.5" fill="currentColor" />
          <circle cx="9" cy="5.5" r="0.5" fill="currentColor" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="m13 2-3 7h5l-3 13 8-12h-5l3-8z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" />
        </svg>
      );
    case "command":
      return (
        <svg {...common}>
          <path d="M18 6V4a2 2 0 1 0-2 2zM18 6h-2M6 18v2a2 2 0 1 1-2-2zM6 18h2M18 18v2a2 2 0 1 0 2-2zM18 18h-2M6 6V4a2 2 0 1 1 2 2zM6 6h2M6 6v12M18 6v12M6 6h12M6 18h12" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      );
    case "battery":
      return (
        <svg {...common}>
          <rect x="2" y="7" width="16" height="10" rx="2" />
          <line x1="22" y1="11" x2="22" y2="13" />
        </svg>
      );
    case "wifi":
      return (
        <svg {...common}>
          <circle cx="12" cy="20" r="0.5" fill="currentColor" />
          <path d="M5 12.55a11 11 0 0 1 14 0M2 8.82a16 16 0 0 1 20 0M8.5 16.43a6 6 0 0 1 7 0" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "keyboard":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h0M10 10h0M14 10h0M18 10h0M6 14h12" />
        </svg>
      );
    case "device":
      return (
        <svg {...common}>
          <path d="M12 2a8 8 0 0 0-8 8v6a4 4 0 0 0 4 4h0V12a4 4 0 0 1 8 0v8h0a4 4 0 0 0 4-4v-6a8 8 0 0 0-8-8z" />
        </svg>
      );
    case "earbud":
      return (
        <svg {...common}>
          <path d="M12 4a6 6 0 0 0-6 6v6a3 3 0 0 0 3 3 3 3 0 0 0 3-3v-6" />
          <path d="M18 10a6 6 0 0 0-6-6" />
        </svg>
      );
    case "x-mark":
      return (
        <svg {...common}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    default:
      return null;
  }
}
