"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import type { AnalyticsData } from "@/types";

import { AnalyticsKPIs } from "./_components/analytics-kpis";
import { MonthlyIncomeChart } from "./_components/monthly-income-chart";
import { HospitalRanking } from "./_components/hospital-ranking";
import { HospitalIncomeChart } from "./_components/hospital-income-chart";
import { ShiftTypeBreakdown } from "./_components/shift-type-breakdown";
import { GrowthTrendChart } from "./_components/growth-trend-chart";

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const [monthsBack, setMonthsBack] = useState(6);

  const PERIODS = [
    { label: t("period6months"), value: 6 },
    { label: t("period12months"), value: 12 },
  ] as const;

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", monthsBack],
    queryFn: () =>
      api.get("/analytics", { params: { monthsBack } })
        .then((r) => unwrap<AnalyticsData>(r)),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !analytics) return <PageSpinner />;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header + period toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <div className="flex gap-1 bg-cream-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setMonthsBack(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                monthsBack === p.value
                  ? "bg-white text-moss-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <AnalyticsKPIs summary={analytics.summary} />

      {/* Monthly income bar chart */}
      <MonthlyIncomeChart data={analytics.monthlyIncome} />

      {/* Hospital ranking + donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HospitalRanking ranking={analytics.hospitalRanking} />
        <HospitalIncomeChart ranking={analytics.hospitalRanking} />
      </div>

      {/* Shift type breakdown */}
      <ShiftTypeBreakdown data={analytics.incomeByShiftType} />

      {/* Growth trend */}
      <GrowthTrendChart data={analytics.monthOverMonthGrowth} />
    </div>
  );
}
