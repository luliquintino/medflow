"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, AlertTriangle, BookOpen, MessageCircle, Clock, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { FlowBadge } from "./flow-badge";
import type { FlowScore, RiskResult } from "@/types";
import { formatCurrency } from "@/lib/format";

interface RiskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  risk: RiskResult;
}

const LEVEL_ICON: Record<FlowScore, { icon: typeof Shield; color: string; bg: string }> = {
  PILAR_SUSTENTAVEL: { icon: Shield, color: "text-moss-600", bg: "bg-moss-50" },
  PILAR_CARGA_ELEVADA: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  PILAR_RISCO_FADIGA: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
  PILAR_ALTO_RISCO: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
};

export function RiskDetailModal({ isOpen, onClose, risk }: RiskDetailModalProps) {
  const t = useTranslations("simulate");
  const tModal = useTranslations("riskModal");
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen) return null;

  const cfg = LEVEL_ICON[risk.level] ?? LEVEL_ICON.PILAR_SUSTENTAVEL;
  const Icon = cfg.icon;
  const triggeredRules = risk.rules?.filter((r) => r.triggered) ?? [];
  const isHighRisk = risk.level === "PILAR_RISCO_FADIGA" || risk.level === "PILAR_ALTO_RISCO";

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-detail-title"
        className="bg-cream-50 rounded-t-2xl sm:rounded-2xl shadow-float border border-cream-200 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-cream-50 border-b border-cream-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", cfg.bg)}>
              <Icon className={clsx("w-5 h-5", cfg.color)} />
            </div>
            <div>
              <h3 id="risk-detail-title" className="text-base font-semibold text-gray-800">
                {tModal("title")}
              </h3>
              <FlowBadge level={risk.level} size="sm" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Recommendation */}
          {risk.recommendation && (
            <div className={clsx("rounded-xl p-4 border", isHighRisk ? "bg-red-50 border-red-200" : "bg-sand-100 border-cream-200")}>
              <p className={clsx("text-sm leading-relaxed", isHighRisk ? "text-red-700" : "text-gray-700")}>
                {risk.recommendation}
              </p>
            </div>
          )}

          {/* Workload summary */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t("workloadImpact")}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t("weekHours"), value: `${risk.workload.totalHoursThisWeek}h`, limit: "60h" },
                { label: t("monthHours"), value: `${risk.workload.totalHoursThisMonth}h` },
                { label: t("consecutiveNight"), value: `${risk.workload.consecutiveNightShifts}x`, limit: "3x" },
                { label: t("consecutiveShifts"), value: `${risk.workload.consecutiveShifts}x`, limit: "3x" },
              ].map(({ label, value, limit }) => (
                <div key={label} className="bg-sand-100 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-gray-800">
                    {value} {limit && <span className="text-[11px] font-normal text-gray-400">/ {limit}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Exhaustion */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t("energyCost")}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className={clsx("rounded-lg p-2.5", risk.exhaustionScore >= 10 ? "bg-red-50" : risk.exhaustionScore >= 7 ? "bg-amber-50" : "bg-sand-100")}>
                <p className="text-[11px] text-gray-500">{t("totalExhaustion")}</p>
                <p className={clsx("text-sm font-bold", risk.exhaustionScore >= 10 ? "text-red-600" : risk.exhaustionScore >= 7 ? "text-amber-700" : "text-gray-800")}>
                  {risk.exhaustionScore?.toFixed(1) ?? "0.0"} <span className="text-[11px] font-normal text-gray-400">/ 10.0</span>
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-sand-100">
                <p className="text-[11px] text-gray-500">{t("sustainability")}</p>
                <p className="text-sm font-bold text-gray-800">
                  {risk.sustainabilityIndex ? formatCurrency(risk.sustainabilityIndex) : "—"}
                  <span className="text-[11px] font-normal text-gray-400"> {t("perExhaustion")}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Triggered rules */}
          {triggeredRules.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t("triggeredRules")}
              </h4>
              <div className="space-y-1.5">
                {triggeredRules.map((r, i) => (
                  <div key={i} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                    <p className="text-xs text-amber-700">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {risk.insights && risk.insights.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {t("insights")}
              </h4>
              <ul className="space-y-1.5">
                {risk.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-gray-600 bg-sand-100 rounded-lg px-3 py-2">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scientific evidence */}
          {risk.evidence && risk.evidence.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {t("evidence")}
              </h4>
              <div className="space-y-1.5">
                {risk.evidence.map((e, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-xs text-gray-700">{e.summary}</p>
                    <p className="text-[11px] text-blue-600 mt-0.5 italic">{e.citation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
