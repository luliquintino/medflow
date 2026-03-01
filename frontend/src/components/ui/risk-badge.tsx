import { clsx } from "clsx";
import type { RiskLevel } from "@/types";

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md";
  showDot?: boolean;
}

const CONFIG = {
  SAFE: {
    label: "Seguro",
    dot: "bg-moss-500",
    badge: "bg-moss-100 text-moss-700 border-moss-200",
  },
  MODERATE: {
    label: "Moderado",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  HIGH: {
    label: "Alto",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

export function RiskBadge({ level, size = "md", showDot = true }: RiskBadgeProps) {
  const cfg = CONFIG[level];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        cfg.badge,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {showDot && (
        <span className={clsx("rounded-full", cfg.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      )}
      {cfg.label}
    </span>
  );
}
