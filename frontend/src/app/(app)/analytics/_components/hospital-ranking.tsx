"use client";
import { Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { HospitalRank } from "@/types";

interface Props {
  ranking: HospitalRank[];
}

export function HospitalRanking({ ranking }: Props) {
  if (ranking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Hospitais</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-400 text-center py-6">
          Nenhum hospital com dados no período.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Hospitais</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {ranking.map((h, i) => (
          <div
            key={h.hospitalId}
            className="flex items-center gap-3 p-3 rounded-xl bg-cream-50 border border-cream-100"
          >
            {/* Position badge */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              i === 0
                ? "bg-amber-100 text-amber-700"
                : i === 1
                ? "bg-gray-100 text-gray-600"
                : "bg-cream-200 text-cream-600"
            }`}>
              {i + 1}
            </div>

            {/* Hospital icon */}
            <div className="w-9 h-9 rounded-lg bg-moss-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-moss-600" />
            </div>

            {/* Name + metrics */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {h.hospitalName}
              </p>
              <p className="text-xs text-gray-400">
                {h.shiftCount} plantões &middot; {formatCurrency(h.avgPerShift)}/plantão
              </p>
            </div>

            {/* Revenue + share */}
            <div className="text-right">
              <p className="text-sm font-bold text-moss-700">
                {formatCurrency(h.totalRevenue)}
              </p>
              <p className="text-xs text-gray-400">{h.revenueShare}%</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
