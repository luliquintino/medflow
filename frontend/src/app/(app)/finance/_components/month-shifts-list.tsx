"use client";
import { useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ShiftCard } from "@/components/shifts/shift-card";
import type { Shift, MonthContext } from "@/types";

interface MonthShiftsListProps {
  shifts: Shift[];
  monthContext: MonthContext;
  onEdit: (shift: Shift) => void;
  onDelete: (shiftId: string) => void;
  onAdd: () => void;
}

export function MonthShiftsList({ shifts, monthContext, onEdit, onDelete, onAdd }: MonthShiftsListProps) {
  const [expanded, setExpanded] = useState(shifts.length <= 5);

  // Split confirmed into realized (or pending) vs unrealized — matches finance engine
  const confirmed = shifts.filter((s) => s.status === "CONFIRMED" && s.realized !== false);
  const unrealized = shifts.filter((s) => s.status === "CONFIRMED" && s.realized === false);
  const simulated = shifts.filter((s) => s.status === "SIMULATED");
  // Revenue excludes unrealized shifts (consistent with finance KPIs)
  const confirmedRevenue = confirmed.reduce((sum, s) => sum + s.value, 0);
  const simulatedRevenue = simulated.reduce((sum, s) => sum + s.value, 0);
  const totalRevenue = confirmedRevenue + simulatedRevenue;
  const sorted = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card>
      {/* Header with summary */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Plantões do mês
        </button>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {confirmed.length} confirmado{confirmed.length !== 1 ? "s" : ""}
            {simulated.length > 0 && (
              <> · {simulated.length} simulado{simulated.length !== 1 ? "s" : ""}</>
            )}
            {unrealized.length > 0 && (
              <> · <span className="text-red-500">{unrealized.length} não realizado{unrealized.length !== 1 ? "s" : ""}</span></>
            )}
            {" · "}
            <span className="font-semibold text-moss-600">{formatCurrency(totalRevenue)}</span>
          </span>
        </div>
      </div>

      {/* Shift list */}
      {expanded && (
        <div className="space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhum plantão neste mês.
            </p>
          ) : (
            sorted.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                compact
                onEdit={!monthContext.isPast ? () => onEdit(shift) : undefined}
                onDelete={!monthContext.isPast ? () => onDelete(shift.id) : undefined}
              />
            ))
          )}

          {/* Add button */}
          {!monthContext.isPast && (
            <button
              onClick={onAdd}
              className="w-full py-3 border-2 border-dashed border-cream-300 rounded-xl text-sm font-medium text-gray-500 hover:text-moss-600 hover:border-moss-300 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar plantão
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
