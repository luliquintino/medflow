"use client";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import {
  getCalendarDays,
  groupShiftsByDay,
  detectDayConflicts,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  formatMonthLabel,
  addMonths,
  subMonths,
} from "@/lib/calendar";
import type { Shift, ShiftType } from "@/types";

const SHIFT_DOT_COLORS: Record<ShiftType, string> = {
  TWELVE_DAY: "bg-blue-500",
  TWELVE_NIGHT: "bg-indigo-500",
  TWENTY_FOUR: "bg-purple-500",
  TWENTY_FOUR_INVERTED: "bg-violet-500",
};

const SHIFT_BLOCK_COLORS: Record<ShiftType, string> = {
  TWELVE_DAY: "bg-blue-100 text-blue-700 border-blue-200",
  TWELVE_NIGHT: "bg-indigo-100 text-indigo-700 border-indigo-200",
  TWENTY_FOUR: "bg-purple-100 text-purple-700 border-purple-200",
  TWENTY_FOUR_INVERTED: "bg-violet-100 text-violet-700 border-violet-200",
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface ShiftCalendarProps {
  shifts: Shift[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onDayClick: (date: Date) => void;
  selectedDay?: Date | null;
}

export function ShiftCalendar({
  shifts,
  currentMonth,
  onMonthChange,
  onDayClick,
  selectedDay,
}: ShiftCalendarProps) {
  const t = useTranslations("calendar");

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const shiftsByDay = useMemo(() => groupShiftsByDay(shifts), [shifts]);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg hover:bg-cream-100 flex items-center justify-center transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h3 className="text-sm font-semibold text-gray-800">
          {formatMonthLabel(currentMonth)}
        </h3>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg hover:bg-cream-100 flex items-center justify-center transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-cream-100">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayShifts = shiftsByDay.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;
          const { hasOverlap, hasRestWarning } = detectDayConflicts(dayShifts);
          const hasWarning = hasOverlap || hasRestWarning;

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={clsx(
                "relative min-h-[72px] sm:min-h-[88px] p-1 border-b border-r border-cream-100 transition-colors text-left",
                "hover:bg-cream-50 focus:outline-none focus:ring-1 focus:ring-moss-300 focus:ring-inset",
                !inMonth && "bg-cream-50/50",
                selected && "ring-2 ring-moss-400 ring-inset bg-moss-50/30"
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-0.5 px-0.5">
                <span
                  className={clsx(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    !inMonth && "text-gray-300",
                    inMonth && !today && "text-gray-700",
                    today && "bg-moss-600 text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasWarning && (
                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
              </div>

              {/* Shift blocks — desktop: show labels, mobile: show dots */}
              <div className="space-y-0.5">
                {/* Desktop view: shift labels */}
                <div className="hidden sm:block space-y-0.5">
                  {dayShifts.slice(0, 2).map((shift, idx) => (
                    <div
                      key={`${shift.id}-${idx}`}
                      className={clsx(
                        "text-[10px] leading-tight px-1 py-0.5 rounded border truncate",
                        SHIFT_BLOCK_COLORS[shift.type]
                      )}
                    >
                      {shift.hospital?.name || shift.location}
                    </div>
                  ))}
                  {dayShifts.length > 2 && (
                    <div className="text-[10px] text-gray-400 px-1">
                      +{dayShifts.length - 2} {t("moreShifts")}
                    </div>
                  )}
                </div>

                {/* Mobile view: colored dots */}
                <div className="flex sm:hidden gap-0.5 flex-wrap px-0.5">
                  {dayShifts.slice(0, 4).map((shift, idx) => (
                    <div
                      key={`${shift.id}-dot-${idx}`}
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        SHIFT_DOT_COLORS[shift.type]
                      )}
                    />
                  ))}
                  {dayShifts.length > 4 && (
                    <span className="text-[8px] text-gray-400">+{dayShifts.length - 4}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
