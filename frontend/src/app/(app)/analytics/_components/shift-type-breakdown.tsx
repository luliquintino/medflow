"use client";
import { Sun, Moon, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ShiftTypeIncome } from "@/types";

interface Props {
  data: ShiftTypeIncome[];
}

const TYPE_ICONS: Record<string, typeof Sun> = {
  TWELVE_HOURS: Sun,
  TWENTY_FOUR_HOURS: Clock,
  NIGHT: Moon,
};

const TYPE_COLORS: Record<string, string> = {
  TWELVE_HOURS: "bg-amber-50 text-amber-600",
  TWENTY_FOUR_HOURS: "bg-blue-50 text-blue-600",
  NIGHT: "bg-indigo-50 text-indigo-600",
};

export function ShiftTypeBreakdown({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita por Tipo de Plantão</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.map((t) => {
          const Icon = TYPE_ICONS[t.type] || Clock;
          const colorClass = TYPE_COLORS[t.type] || "bg-gray-50 text-gray-600";

          return (
            <div
              key={t.type}
              className="flex flex-col items-center p-4 rounded-xl bg-cream-50 border border-cream-100 text-center"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{t.typeLabel}</p>
              <p className="text-lg font-bold text-moss-700 mt-1">
                {formatCurrency(t.totalRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t.shiftCount} plantões &middot; {formatCurrency(t.avgPerHour)}/h
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
