"use client";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { HospitalRank } from "@/types";

interface Props {
  ranking: HospitalRank[];
}

const COLORS = ["#638f46", "#a8c490", "#d4900a", "#7ab5d6", "#c49a6c", "#8b7bb3"];

export function HospitalIncomeChart({ ranking }: Props) {
  if (ranking.length === 0) return null;

  const data = ranking.map((h) => ({
    name: h.hospitalName,
    value: h.totalRevenue,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita por Hospital</CardTitle>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [formatCurrency(Number(v ?? 0)), "Receita"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e8dfd3",
                fontSize: 12,
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
