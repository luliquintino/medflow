"use client";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { FinanceSummary } from "@/types";

interface FinanceKPIsProps {
  finance: FinanceSummary;
}

export function FinanceKPIs({ finance }: FinanceKPIsProps) {
  const { monthContext } = finance;
  const isFuture = monthContext.isFuture;

  const kpis = isFuture
    ? [
        { label: "Confirmado", value: formatCurrency(finance.confirmedRevenue), color: "text-moss-700" },
        { label: "Simulado", value: formatCurrency(finance.simulatedRevenue), color: "text-gray-500" },
        { label: "Meta mínima", value: formatCurrency(finance.minimumMonthlyGoal), color: "text-gray-800" },
        { label: "Falta para ideal", value: formatCurrency(finance.revenueToIdeal), color: "text-amber-700" },
      ]
    : [
        { label: "Receita atual", value: formatCurrency(finance.currentRevenue), color: "text-moss-700" },
        { label: "Meta mínima", value: formatCurrency(finance.minimumMonthlyGoal), color: "text-gray-800" },
        { label: "Meta ideal", value: formatCurrency(finance.idealMonthlyGoal), color: "text-gray-800" },
        { label: "Falta para ideal", value: formatCurrency(finance.revenueToIdeal), color: "text-amber-700" },
      ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, color }) => (
        <Card key={label} padding="sm">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
        </Card>
      ))}
    </div>
  );
}
