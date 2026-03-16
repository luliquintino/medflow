"use client";

import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import type { FlowScore } from "@/types";

interface RiskHistoryRecord {
  riskLevel: FlowScore;
}

const LEVEL_COLORS: Record<FlowScore, string> = {
  PILAR_SUSTENTAVEL: "#638f46",
  PILAR_CARGA_ELEVADA: "#f59e0b",
  PILAR_RISCO_FADIGA: "#f97316",
  PILAR_ALTO_RISCO: "#ef4444",
};

const LEVEL_KEYS: FlowScore[] = ["PILAR_SUSTENTAVEL", "PILAR_CARGA_ELEVADA", "PILAR_RISCO_FADIGA", "PILAR_ALTO_RISCO"];

export function RiskDistributionChart({ history }: { history: RiskHistoryRecord[] }) {
  const t = useTranslations("riskHistory");

  const LEVEL_NAMES: Record<FlowScore, string> = {
    PILAR_SUSTENTAVEL: "safe",
    PILAR_CARGA_ELEVADA: "moderate",
    PILAR_RISCO_FADIGA: "high",
    PILAR_ALTO_RISCO: "altoRisco",
  };

  const counts: Record<FlowScore, number> = { PILAR_SUSTENTAVEL: 0, PILAR_CARGA_ELEVADA: 0, PILAR_RISCO_FADIGA: 0, PILAR_ALTO_RISCO: 0 };
  history.forEach((r) => counts[r.riskLevel]++);

  const data = LEVEL_KEYS
    .map((level) => ({
      name: t(LEVEL_NAMES[level]),
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
