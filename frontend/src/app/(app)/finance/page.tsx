"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Target } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { ShiftFormModal } from "@/components/shifts/shift-form-modal";
import { useConfirm } from "@/hooks/use-confirm";
import type { FinanceSummary, Shift } from "@/types";

import { MonthNavigator } from "./_components/month-navigator";
import { FinanceKPIs } from "./_components/finance-kpis";
import { FinanceProgress } from "./_components/finance-progress";
import { MonthShiftsList } from "./_components/month-shifts-list";
import { ProjectionChart } from "./_components/projection-chart";
import { FinanceInsights } from "./_components/finance-insights";
import { BudgetModal } from "./_components/budget-modal";
import { AnalyticsPreview } from "./_components/analytics-preview";

export default function FinancePage() {
  const qc = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const { data: finance, isLoading } = useQuery({
    queryKey: ["finance", month, year],
    queryFn: () =>
      api.get("/finance/summary", { params: { month, year } })
        .then((r) => unwrap<FinanceSummary>(r)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance-insights"] });
    },
  });

  function handleMonthChange(m: number, y: number) {
    setMonth(m);
    setYear(y);
  }

  function handleEditShift(shift: Shift) {
    setEditingShift(shift);
    setShowShiftForm(true);
  }

  async function handleDeleteShift(shiftId: string) {
    const ok = await confirm({
      title: "Remover plantão",
      message: "Tem certeza que deseja remover este plantão? Esta ação não pode ser desfeita.",
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (ok) deleteMutation.mutate(shiftId);
  }

  function handleAddShift() {
    setEditingShift(null);
    setShowShiftForm(true);
  }

  function handleShiftFormClose() {
    setShowShiftForm(false);
    setEditingShift(null);
  }

  // Default date for new shift: 1st of selected month at 08:00
  const defaultDate = `${year}-${String(month).padStart(2, "0")}-01T08:00`;

  if (isLoading || !finance) return <PageSpinner />;

  const { monthContext } = finance;
  const isCurrent = monthContext.isCurrent;
  const isPast = monthContext.isPast;

  return (
    <div className="max-w-4xl space-y-6">
      {ConfirmDialogComponent}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Painel Financeiro</h2>
        <Button
          variant="secondary"
          size="sm"
          icon={<Target className="w-4 h-4" />}
          onClick={() => setShowBudgetModal(true)}
        >
          Editar Metas
        </Button>
      </div>

      <MonthNavigator month={month} year={year} onChange={handleMonthChange} />

      {/* Past month badge */}
      {isPast && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          Mês encerrado — dados históricos
        </div>
      )}

      {/* Status message */}
      {!isPast && (
        <div className={`rounded-2xl p-5 border ${finance.isIdealReached
          ? "bg-moss-50 border-moss-200"
          : finance.isMinimumReached
          ? "bg-amber-50 border-amber-200"
          : "bg-cream-100 border-cream-200"}`}>
          <p className={`font-semibold text-sm ${finance.isIdealReached ? "text-moss-700" : finance.isMinimumReached ? "text-amber-700" : "text-gray-700"}`}>
            {finance.isIdealReached
              ? "🎉 Meta ideal atingida! Você pode descansar com tranquilidade."
              : finance.isMinimumReached
              ? "✅ Meta mínima garantida. Mais plantões vão te aproximar da meta ideal."
              : `Você precisa de mais ${formatCurrency(finance.revenueToMinimum)} para atingir a meta mínima.`}
          </p>
        </div>
      )}

      {/* KPIs */}
      <FinanceKPIs finance={finance} />

      {/* Progress (current and future only) */}
      {!isPast && (
        <FinanceProgress finance={finance} />
      )}

      {/* Shifts list */}
      <MonthShiftsList
        shifts={finance.shifts || []}
        monthContext={monthContext}
        onEdit={handleEditShift}
        onDelete={handleDeleteShift}
        onAdd={handleAddShift}
      />

      {/* Shifts needed (current month only) */}
      {isCurrent && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Plantões para meta mínima</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">
                  {finance.minimumShiftsRequired}
                </p>
                <p className="text-xs text-gray-400">por mês</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-moss-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-moss-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Plantões para meta ideal</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">
                  {finance.idealShiftsRequired}
                </p>
                <p className="text-xs text-gray-400">por mês</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Projection chart (current month only) */}
      {isCurrent && <ProjectionChart finance={finance} />}

      {/* Intelligent agent insights (current month only) */}
      {isCurrent && <FinanceInsights />}

      {/* Analytics preview (current month only) */}
      {isCurrent && <AnalyticsPreview />}

      {/* Shift form modal */}
      <ShiftFormModal
        isOpen={showShiftForm}
        onClose={handleShiftFormClose}
        editingShift={editingShift}
        defaultDate={defaultDate}
        onSuccess={handleShiftFormClose}
      />

      {/* Budget modal */}
      {finance && (
        <BudgetModal
          isOpen={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
          profile={finance.profile}
        />
      )}
    </div>
  );
}
