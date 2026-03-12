"use client";

import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import type { RiskLevel } from "@/types";

interface RiskHistoryRecord {
  riskLevel: RiskLevel;
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  SAFE: "#638f46",
  MODERATE: "#f59e0b",
  HIGH: "#ef4444",
};

const LEVEL_KEYS: RiskLevel[] = ["SAFE", "MODERATE", "HIGH"];

export function RiskDistributionChart({ history }: { history: RiskHistoryRecord[] }) {
  const t = useTranslations("riskHistory");

  const counts: Record<RiskLevel, number> = { SAFE: 0, MODERATE: 0, HIGH: 0 };
  history.forEach((r) => counts[r.riskLevel]++);

  const data = LEVEL_KEYS
    .map((level) => ({
      name: t(level === "SAFE" ? "safe" : level === "MODERATE" ? "moderate" : "high"),
      value: counts[level],
      level,
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <Card padding="sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">
        {t("distributionTitle")}
      </h3>
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={LEVEL_COLORS[entry.level]} />
              ))}
            </Pie>
            <Tooltip
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
              formatter={(value: string) => (
                <span className="text-xs text-gray-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
