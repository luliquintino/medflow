"use client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { FinanceSummary } from "@/types";

interface FinanceProgressProps {
  finance: FinanceSummary;
}

export function FinanceProgress({ finance }: FinanceProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso do mês</CardTitle>
        <span className="text-sm font-semibold text-moss-600">
          {finance.confirmedShiftsCount} plantão(ões)
          {finance.simulatedShiftsCount > 0 && (
            <span className="text-gray-400 font-normal"> + {finance.simulatedShiftsCount} simulado(s)</span>
          )}
          {finance.unrealizedShiftsCount > 0 && (
            <span className="text-red-500 font-normal"> · {finance.unrealizedShiftsCount} não realizado(s)</span>
          )}
        </span>
      </CardHeader>
      <div className="space-y-5">
        <ProgressBar
          value={finance.progressToMinimum}
          color={finance.progressToMinimum >= 100 ? "moss" : "amber"}
          size="lg"
          showLabel
          label="Meta mínima"
        />
        <ProgressBar
          value={finance.progressToIdeal}
          color="moss"
          size="lg"
          showLabel
          label="Meta ideal"
        />
      </div>
    </Card>
  );
}
