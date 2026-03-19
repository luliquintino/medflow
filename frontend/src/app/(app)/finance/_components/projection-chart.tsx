"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { clsx } from "clsx";
import type { FinanceSummary } from "@/types";

interface ProjectionChartProps {
  finance: FinanceSummary;
}

function TrendBadge({ trend }: { trend: "growing" | "stable" | "declining" }) {
  const t = useTranslations("enhancedProjections");

  const config = {
    growing: { icon: "\u2191", label: t("growing"), bg: "bg-moss-100 text-moss-700" },
    stable: { icon: "\u2192", label: t("stable"), bg: "bg-cream-200 text-gray-600" },
    declining: { icon: "\u2193", label: t("declining"), bg: "bg-red-100 text-red-700" },
  };

  const c = config[trend];

  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", c.bg)}>
      {c.icon} {c.label}
    </span>
  );
}

export function ProjectionChart({ finance }: ProjectionChartProps) {
  const t = useTranslations("enhancedProjections");

  const sixMonthData = finance.projections.sixMonths.map((p) => ({
    name: p.label,
    receita: p.projectedRevenue,
    meta: finance.idealMonthlyGoal,
    abaixo: !p.goalMet,
  }));

  if (sixMonthData.length === 0) return null;

  // Determine trend from data
  const revenues = sixMonthData.map((d) => d.receita);
  const firstHalf = revenues.slice(0, Math.ceil(revenues.length / 2));
  const secondHalf = revenues.slice(Math.ceil(revenues.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
  const trend: "growing" | "stable" | "declining" =
    avgSecond > avgFirst * 1.05 ? "growing" : avgSecond < avgFirst * 0.95 ? "declining" : "stable";

  // Color bars: green if meets ideal, amber if meets min but not ideal, red if below min
  function getBarColor(projected: number): string {
    if (projected >= finance.idealMonthlyGoal) return "#638f46"; // moss green
    if (projected >= finance.minimumMonthlyGoal) return "#d97706"; // amber
    return "#dc2626"; // red
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção 6 meses</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t("trend")}</span>
          <TrendBadge trend={trend} />
        </div>
      </CardHeader>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sixMonthData} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = Number(payload[0].value ?? 0);
                const gapToIdeal = finance.idealMonthlyGoal - value;
                const avgShift = finance.profile.averageShiftValue || 1;
                const suggestedShifts = gapToIdeal > 0 ? Math.ceil(gapToIdeal / avgShift) : 0;

                return (
                  <div className="bg-white rounded-xl border border-cream-200 shadow-md px-3 py-2 text-xs">
                    <p className="font-semibold text-gray-700">{label}</p>
                    <p className="text-gray-600 mt-1">{formatCurrency(value)}</p>
                    {gapToIdeal > 0 && (
                      <>
                        <p className="text-amber-600 mt-1">
                          {t("goalGap", { amount: formatCurrency(gapToIdeal) })}
                        </p>
                        <p className="text-gray-500">
                          {t("tooltipGap", { count: suggestedShifts, value: formatCurrency(avgShift) })}
                        </p>
                      </>
                    )}
                  </div>
                );
              }}
            />
            {/* Minimum goal — dashed amber */}
            <ReferenceLine
              y={finance.minimumMonthlyGoal}
              stroke="#d97706"
              strokeDasharray="6 3"
              label={{ value: "Min", position: "right", fontSize: 10, fill: "#d97706" }}
            />
            {/* Ideal goal — solid green */}
            <ReferenceLine
              y={finance.idealMonthlyGoal}
              stroke="#638f46"
              strokeWidth={2}
              label={{ value: "Ideal", position: "right", fontSize: 10, fill: "#638f46" }}
            />
            <Bar dataKey="receita" radius={[8, 8, 0, 0]}>
              {sixMonthData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.receita)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">
        Baseado no ritmo atual de plantões do mês
      </p>
    </Card>
  );
}
