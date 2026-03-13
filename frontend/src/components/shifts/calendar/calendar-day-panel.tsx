"use client";
import { X, Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ShiftCard } from "@/components/shifts/shift-card";
import { detectDayConflicts } from "@/lib/calendar";
import type { Shift } from "@/types";

interface CalendarDayPanelProps {
  date: Date;
  shifts: Shift[];
  onClose: () => void;
  onAddShift: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shift: Shift) => void;
  onRealize: (shiftId: string, realized: boolean) => void;
}

export function CalendarDayPanel({
  date,
  shifts,
  onClose,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onRealize,
}: CalendarDayPanelProps) {
  const t = useTranslations("calendar");
  const { hasOverlap, hasRestWarning } = detectDayConflicts(shifts);
  const dateLabel = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white w-full sm:w-[420px] sm:max-h-[80vh] max-h-[70vh] rounded-t-2xl sm:rounded-2xl border border-cream-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 capitalize">
              {dateLabel}
            </h3>
            <p className="text-xs text-gray-500">
              {shifts.length === 0
                ? t("noShifts")
                : `${shifts.length} plantão(ões)`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-cream-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Warnings */}
        {(hasOverlap || hasRestWarning) && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            {hasOverlap && (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t("conflictBadge")}</span>
              </div>
            )}
            {hasRestWarning && (
              <div className="flex items-center gap-2 text-xs text-amber-700 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t("restBadge")}</span>
              </div>
            )}
          </div>
        )}

        {/* Shift list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {shifts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{t("noShifts")}</p>
          ) : (
            shifts
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  compact
                  onEdit={() => onEditShift(shift)}
                  onDelete={() => onDeleteShift(shift)}
                  onRealize={onRealize}
                />
              ))
          )}
        </div>

        {/* Footer — add shift button */}
        <div className="px-4 py-3 border-t border-cream-200">
          <Button
            onClick={() => onAddShift(date)}
            icon={<Plus className="w-4 h-4" />}
            className="w-full"
          >
            {t("addShift")}
          </Button>
        </div>
      </div>
    </div>
  );
}
