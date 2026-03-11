"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Building2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsData } from "@/types";

export function AnalyticsPreview() {
  const t = useTranslations("analyticsPreview");

  const { data: analytics } = useQuery({
    queryKey: ["analytics", 6],
    queryFn: () =>
      api.get("/analytics", { params: { monthsBack: 6 } })
        .then((r) => unwrap<AnalyticsData>(r)),
    staleTime: 5 * 60 * 1000,
  });

  if (!analytics) return null;

  const { summary } = analytics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-moss-600" />
            {t("title")}
          </CardTitle>
          <Link
            href="/analytics"
            className="flex items-center gap-1 text-xs text-moss-600 hover:text-moss-700 font-medium transition-colors"
          >
            {t("viewFull")}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">{t("totalRevenue")}</p>
          <p className="text-base font-bold text-gray-800 mt-0.5">
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t("trend")}</p>
          <p className={`text-base font-bold mt-0.5 flex items-center justify-center gap-1 ${
            summary.overallGrowthPercent !== null && summary.overallGrowthPercent >= 0
              ? "text-moss-700"
              : "text-red-500"
          }`}>
            <TrendingUp className="w-3.5 h-3.5" />
            {summary.overallGrowthPercent !== null
              ? `${summary.overallGrowthPercent > 0 ? "+" : ""}${summary.overallGrowthPercent}%`
              : "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t("bestHospital")}</p>
          <p className="text-base font-bold text-gray-800 mt-0.5 flex items-center justify-center gap-1 truncate">
            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{summary.bestHospital ?? "—"}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
