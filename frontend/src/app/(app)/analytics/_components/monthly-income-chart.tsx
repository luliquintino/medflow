"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyIncome } from "@/types";

interface Props {
  data: MonthlyIncome[];
}

export function MonthlyIncomeChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita Mensal</CardTitle>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ebe3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#888" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#aaa" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v) => [formatCurrency(Number(v ?? 0)), "Receita"]}
              labelFormatter={(label) => `Mês: ${label}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e8dfd3",
                fontSize: 12,
              }}
            />
            <Bar dataKey="revenue" fill="#638f46" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1 pb-1">
        {data.reduce((sum, m) => sum + m.shiftCount, 0)} plantões no período
      </p>
    </Card>
  );
}
