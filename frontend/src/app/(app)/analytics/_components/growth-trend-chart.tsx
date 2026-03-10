"use client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthGrowth } from "@/types";

interface Props {
  data: MonthGrowth[];
}

export function GrowthTrendChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crescimento Mensal (%)</CardTitle>
      </CardHeader>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v) => [`${Number(v ?? 0)}%`, "Crescimento"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e8dfd3",
                fontSize: 12,
              }}
            />
            <ReferenceLine y={0} stroke="#ccc" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="growthPercent"
              stroke="#638f46"
              strokeWidth={2.5}
              dot={{ fill: "#638f46", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
