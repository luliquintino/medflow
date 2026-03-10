"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceSummary } from "@/types";

interface ProjectionChartProps {
  finance: FinanceSummary;
}

export function ProjectionChart({ finance }: ProjectionChartProps) {
  const sixMonthData = finance.projections.sixMonths.map((p) => ({
    name: p.label,
    receita: p.projectedRevenue,
    meta: finance.idealMonthlyGoal,
    abaixo: !p.goalMet,
  }));

  if (sixMonthData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção 6 meses</CardTitle>
      </CardHeader>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sixMonthData} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v) => [formatCurrency(Number(v ?? 0)), ""]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e8dfd3", fontSize: 12 }}
            />
            <ReferenceLine y={finance.idealMonthlyGoal} stroke="#d4900a" strokeDasharray="4 4" label={{ value: "Meta ideal", position: "right", fontSize: 10, fill: "#d4900a" }} />
            <Bar dataKey="receita" radius={[8, 8, 0, 0]}>
              {sixMonthData.map((entry, i) => (
                <Cell key={i} fill={entry.abaixo ? "#a8c490" : "#638f46"} />
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
