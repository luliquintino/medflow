"use client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import type { Shift, ShiftType } from "@/types";
import { SHIFT_TYPE_LABELS } from "@/types";
import { formatCurrency } from "@/lib/format";

const TYPE_COLORS: Record<ShiftType, string> = {
  TWELVE_DAY: "bg-blue-500",
  TWELVE_NIGHT: "bg-indigo-500",
  TWENTY_FOUR: "bg-purple-500",
  TWENTY_FOUR_INVERTED: "bg-violet-500",
};

interface HistoryTimelineProps {
  shifts: Shift[];
}

export function HistoryTimeline({ shifts }: HistoryTimelineProps) {
  // Group by month
  const grouped = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const d = new Date(shift.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const arr = grouped.get(key) || [];
    arr.push(shift);
    grouped.set(key, arr);
  }

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sortedKeys.map((monthKey) => {
        const monthShifts = grouped.get(monthKey)!;
        const sample = new Date(monthShifts[0].date);
        const monthLabel = format(sample, "MMMM yyyy", { locale: ptBR });

        return (
          <div key={monthKey}>
            <h3 className="text-sm font-semibold text-gray-600 capitalize mb-3">
              {monthLabel}
            </h3>

            <div className="relative pl-6 border-l-2 border-cream-200 space-y-3">
              {monthShifts.map((shift) => (
                <div key={shift.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={clsx(
                      "absolute -left-[25px] top-3 w-3 h-3 rounded-full border-2 border-white",
                      TYPE_COLORS[shift.type]
                    )}
                  />

                  {/* Card */}
                  <div className="bg-white rounded-xl border border-cream-200 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {format(new Date(shift.date), "dd/MM · HH:mm")} – {format(new Date(shift.endDate), "HH:mm")}
                      </span>
                      <span className="text-xs font-semibold text-gray-800">
                        {formatCurrency(shift.value)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        shift.type === "TWELVE_DAY" && "bg-blue-100 text-blue-700",
                        shift.type === "TWELVE_NIGHT" && "bg-indigo-100 text-indigo-700",
                        shift.type === "TWENTY_FOUR" && "bg-purple-100 text-purple-700",
                        shift.type === "TWENTY_FOUR_INVERTED" && "bg-violet-100 text-violet-700",
                      )}>
                        {SHIFT_TYPE_LABELS[shift.type]}
                      </span>
                      <span className="text-xs text-gray-600">
                        {shift.hospital?.name || shift.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
