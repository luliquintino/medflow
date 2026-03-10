"use client";
import { DollarSign, Clock, Building2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { AnalyticsSummary } from "@/types";

interface Props {
  summary: AnalyticsSummary;
}

export function AnalyticsKPIs({ summary }: Props) {
  const kpis = [
    {
      label: "Receita Total",
      value: formatCurrency(summary.totalRevenue),
      sub: `${summary.totalShifts} plantões`,
      icon: DollarSign,
      color: "bg-moss-50 text-moss-600",
    },
    {
      label: "Média por Plantão",
      value: formatCurrency(summary.avgPerShift),
      sub: `${formatCurrency(summary.avgPerHour)}/hora`,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Melhor Hospital",
      value: summary.bestHospital ?? "—",
      sub: "por receita total",
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Tendência",
      value:
        summary.overallGrowthPercent !== null
          ? `${summary.overallGrowthPercent > 0 ? "+" : ""}${summary.overallGrowthPercent}%`
          : "—",
      sub: "crescimento no período",
      icon: TrendingUp,
      color:
        summary.overallGrowthPercent !== null && summary.overallGrowthPercent >= 0
          ? "bg-moss-50 text-moss-600"
          : "bg-red-50 text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, sub, icon: Icon, color }) => (
        <Card key={label}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5 truncate">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
