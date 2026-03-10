"use client";
import { Pencil, Trash2, MapPin, Clock, Building2, CheckCircle2, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { Shift, ShiftType } from "@/types";
import { SHIFT_TYPE_LABELS } from "@/types";

const SHIFT_COLORS: Record<ShiftType, string> = {
  TWELVE_HOURS:      "bg-blue-100 text-blue-700 border-blue-200",
  TWENTY_FOUR_HOURS: "bg-purple-100 text-purple-700 border-purple-200",
  NIGHT:             "bg-indigo-100 text-indigo-700 border-indigo-200",
};

interface ShiftCardProps {
  shift: Shift;
  onEdit?: () => void;
  onDelete?: () => void;
  onRealize?: (shiftId: string, realized: boolean) => void;
  compact?: boolean;
}

export function ShiftCard({ shift, onEdit, onDelete, onRealize, compact }: ShiftCardProps) {
  const isPast = new Date(shift.date) < new Date(new Date().toDateString());
  const needsRealization =
    shift.status === "CONFIRMED" &&
    isPast &&
    shift.realized == null;

  return (
    <Card padding="sm" className="flex flex-col gap-0 overflow-hidden">
      <div className="flex items-center gap-4 p-0">
        <div className="w-12 h-12 rounded-xl bg-moss-50 flex flex-col items-center justify-center flex-shrink-0 border border-moss-100">
          <span className="text-xs font-bold text-moss-700">
            {new Date(shift.date).getDate()}
          </span>
          <span className="text-xs text-moss-500">
            {new Date(shift.date).toLocaleString("pt-BR", { month: "short" })}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx("text-xs px-2 py-0.5 rounded-full border font-medium", SHIFT_COLORS[shift.type])}>
              {SHIFT_TYPE_LABELS[shift.type]}
            </span>
            {shift.status === "SIMULATED" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                Simulado
              </span>
            )}
            {shift.realized === true && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Realizado
              </span>
            )}
            {shift.realized === false && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Não realizado
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              {shift.hospital ? <Building2 className="w-3 h-3 text-gray-400" /> : <MapPin className="w-3 h-3 text-gray-400" />}
              <span className="truncate max-w-[140px]">{shift.hospital?.name || shift.location}</span>
            </span>
            {!compact && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                {shift.hours}h
              </span>
            )}
            <span className="text-moss-700 font-semibold">
              {formatCurrency(shift.value)}
            </span>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors">
                <Pencil className="w-3.5 h-3.5 text-gray-500" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {needsRealization && onRealize && (
        <div className="mt-3 pt-3 border-t border-cream-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">Este plantão aconteceu?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRealize(shift.id, true)}
              className="text-xs px-3 py-1 rounded-lg bg-moss-50 text-moss-700 hover:bg-moss-100 font-medium transition-colors"
            >
              Sim
            </button>
            <button
              onClick={() => onRealize(shift.id, false)}
              className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
            >
              Não
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
