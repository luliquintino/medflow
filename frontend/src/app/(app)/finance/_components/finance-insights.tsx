"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import type { FinanceInsight } from "@/types";

const BORDER_COLORS: Record<FinanceInsight["type"], string> = {
  positive: "border-l-green-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
  action: "border-l-moss-500",
};

const BG_COLORS: Record<FinanceInsight["type"], string> = {
  positive: "bg-green-50/50",
  warning: "bg-amber-50/50",
  info: "bg-blue-50/50",
  action: "bg-moss-50/50",
};

export function FinanceInsights() {
  const t = useTranslations("financeInsights");

  const { data: insights = [] } = useQuery({
    queryKey: ["finance-insights"],
    queryFn: () => api.get("/finance/insights").then((r) => unwrap<FinanceInsight[]>(r)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span>💡</span> {t("title")}
      </h3>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-xl border-l-4 ${BORDER_COLORS[insight.type]} ${BG_COLORS[insight.type]} px-4 py-3`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0 mt-0.5">{insight.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
