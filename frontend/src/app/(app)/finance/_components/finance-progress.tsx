"use client";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { FinanceSummary } from "@/types";

interface FinanceProgressProps {
  finance: FinanceSummary;
}

export function FinanceProgress({ finance }: FinanceProgressProps) {
  const t = useTranslations("financeProgress");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <span className="text-sm font-semibold text-moss-600">
          {t("shiftsCount", { confirmed: finance.confirmedShiftsCount })}
          {finance.simulatedShiftsCount > 0 && (
            <span className="text-gray-400 font-normal"> {t("simulatedCount", { simulated: finance.simulatedShiftsCount })}</span>
          )}
          {finance.unrealizedShiftsCount > 0 && (
            <span className="text-red-500 font-normal"> {t("unrealizedCount", { unrealized: finance.unrealizedShiftsCount })}</span>
          )}
        </span>
      </CardHeader>
      <div className="space-y-5">
        <ProgressBar
          value={finance.progressToMinimum}
          color={finance.progressToMinimum >= 100 ? "moss" : "amber"}
          size="lg"
          showLabel
          label={t("minimumGoal")}
        />
        <ProgressBar
          value={finance.progressToIdeal}
          color="moss"
          size="lg"
          showLabel
          label={t("idealGoal")}
        />
      </div>
    </Card>
  );
}
