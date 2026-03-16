"use client";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import type { FlowScore } from "@/types";

interface FlowBadgeProps {
  level: FlowScore;
  size?: "sm" | "md";
  showDot?: boolean;
  onClick?: () => void;
}

const CONFIG: Record<FlowScore, { key: string; dot: string; badge: string }> = {
  PILAR_SUSTENTAVEL: {
    key: "pilar_sustentavel",
    dot: "bg-moss-500",
    badge: "bg-moss-100 text-moss-700 border-moss-200",
  },
  PILAR_CARGA_ELEVADA: {
    key: "pilar_carga_elevada",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  PILAR_RISCO_FADIGA: {
    key: "pilar_risco_fadiga",
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  PILAR_ALTO_RISCO: {
    key: "pilar_alto_risco",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

export function FlowBadge({ level, size = "md", showDot = true, onClick }: FlowBadgeProps) {
  const t = useTranslations("flowScore");
  const cfg = CONFIG[level] ?? CONFIG.PILAR_SUSTENTAVEL;

  const classes = clsx(
    "inline-flex items-center gap-1.5 rounded-full border font-medium",
    cfg.badge,
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
    onClick && "cursor-pointer hover:opacity-80 transition-opacity"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {showDot && (
          <span className={clsx("rounded-full", cfg.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
        )}
        {t(cfg.key)}
      </button>
    );
  }

  return (
    <span className={classes}>
      {showDot && (
        <span className={clsx("rounded-full", cfg.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      )}
      {t(cfg.key)}
    </span>
  );
}
