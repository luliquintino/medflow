"use client";
import { Clock, DollarSign, CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/format";

interface MonthlySummaryItem {
  month: number;
  year: number;
  totalHours: number;
  totalRevenue: number;
  shiftCount: number;
}

interface HistorySummaryProps {
  monthlySummary: MonthlySummaryItem[];
}

export function HistorySummary({ monthlySummary }: HistorySummaryProps) {
  const t = useTranslations("shiftHistory");

  const totals = monthlySummary.reduce(
    (acc, m) => ({
      hours: acc.hours + m.totalHours,
      revenue: acc.revenue + m.totalRevenue,
      shifts: acc.shifts + m.shiftCount,
    }),
    { hours: 0, revenue: 0, shifts: 0 }
  );

  const cards = [
    { icon: Clock, label: t("summaryHours"), value: `${totals.hours}h`, color: "text-blue-600 bg-blue-50" },
    { icon: DollarSign, label: t("summaryRevenue"), value: formatCurrency(totals.revenue), color: "text-green-600 bg-green-50" },
    { icon: CalendarCheck, label: t("summaryCount"), value: String(totals.shifts), color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-white rounded-2xl border border-cream-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
