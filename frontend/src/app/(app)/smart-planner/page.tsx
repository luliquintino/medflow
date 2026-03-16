"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, TrendingUp, Clock, Calendar, ChevronDown, ChevronUp, Zap, Check, Battery } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FlowBadge } from "@/components/ui/flow-badge";
import { PageSpinner } from "@/components/ui/spinner";
import { clsx } from "clsx";
import type { OptimizationResult, OptimizationScenario } from "@/types";

export default function SmartPlannerPage() {
  const t = useTranslations("smartPlanner");
  const qc = useQueryClient();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);

  const { data: result, isLoading, error } = useQuery({
    queryKey: ["optimization"],
    queryFn: () => api.get("/optimization/suggest").then((r) => unwrap<OptimizationResult>(r)),
  });

  const applyMutation = useMutation({
    mutationFn: (scenario: OptimizationScenario) =>
      api.post("/optimization/apply", {
        shifts: scenario.shifts.map((s) => ({
          templateId: s.templateId,
          date: s.suggestedDate,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["optimization"] });
    },
  });

  function handleApply(scenario: OptimizationScenario, idx: number) {
    setAppliedIdx(idx);
    applyMutation.mutate(scenario);
  }

  if (isLoading) return <PageSpinner />;

  if (error || !result) {
    return (
      <div className="max-w-3xl">
        <Card className="text-center py-12">
          <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">{t("noSuggestionsTitle")}</p>
          <p className="text-sm text-gray-400">
            {t("noSuggestionsDesc")}
          </p>
        </Card>
      </div>
    );
  }

  const progress = result.targetRevenue > 0
    ? Math.min(100, (result.currentRevenue / result.targetRevenue) * 100)
    : 0;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Financial Status */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-moss-50 border border-moss-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-moss-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("idealMonthlyGoal")}</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(result.targetRevenue)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{t("currentRevenue")}</p>
            <p className="text-lg font-bold text-moss-700">{formatCurrency(result.currentRevenue)}</p>
          </div>
        </div>

        <ProgressBar
          value={progress}
          color={result.isGoalAlreadyMet ? "moss" : progress >= 70 ? "amber" : "red"}
          size="lg"
          showLabel
          label={t("progress")}
        />

        {result.isGoalAlreadyMet ? (
          <div className="bg-moss-50 rounded-xl p-4 border border-moss-100">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-moss-600" />
              <p className="text-sm font-medium text-moss-700">
                {t("goalMet")}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-amber-800">
              {t("financialGap", { value: formatCurrency(result.financialGap) })}
            </p>
          </div>
        )}
      </Card>

      {/* Scenarios */}
      {!result.isGoalAlreadyMet && result.suggestedScenarios.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            {t("suggestedScenarios")}
          </h3>

          {result.suggestedScenarios.map((scenario, idx) => (
            <ScenarioCard
              key={idx}
              scenario={scenario}
              rank={idx + 1}
              isExpanded={expandedIdx === idx}
              isApplied={appliedIdx === idx && applyMutation.isSuccess}
              isApplying={appliedIdx === idx && applyMutation.isPending}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              onApply={() => handleApply(scenario, idx)}
              t={t}
            />
          ))}
        </div>
      )}

      {!result.isGoalAlreadyMet && result.suggestedScenarios.length === 0 && (
        <Card className="text-center py-12">
          <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">{t("noScenariosTitle")}</p>
          <p className="text-sm text-gray-400">
            {t("noScenariosDesc")}
          </p>
        </Card>
      )}
    </div>
  );
}

function ScenarioCard({
  scenario, rank, isExpanded, isApplied, isApplying, onToggle, onApply, t,
}: {
  scenario: OptimizationScenario;
  rank: number;
  isExpanded: boolean;
  isApplied: boolean;
  isApplying: boolean;
  onToggle: () => void;
  onApply: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center gap-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-gray-600">#{rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{scenario.description}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {t("shiftsLabel", { count: scenario.totalShifts })}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {scenario.totalHours}h
            </span>
            <span className="text-xs font-semibold text-moss-700">
              {formatCurrency(scenario.totalIncome)}
            </span>
            {scenario.sustainabilityIndex > 0 && (
              <span className="text-xs text-purple-600 flex items-center gap-0.5">
                <Battery className="w-3 h-3" />
                {formatCurrency(scenario.sustainabilityIndex)}/ex
              </span>
            )}
            <FlowBadge level={scenario.riskLevel} size="sm" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Score */}
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2",
            scenario.optimizationScore >= 70
              ? "border-moss-400 text-moss-700 bg-moss-50"
              : scenario.optimizationScore >= 40
              ? "border-amber-400 text-amber-700 bg-amber-50"
              : "border-red-400 text-red-700 bg-red-50"
          )}>
            {Math.round(scenario.optimizationScore)}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-cream-200 space-y-3">
          {scenario.shifts.map((shift, i) => (
            <div key={i} className="flex items-center gap-3 text-sm bg-cream-100 rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-gray-600 border border-cream-200">
                {new Date(shift.suggestedDate).getDate()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 truncate">{shift.hospitalName}</p>
                <p className="text-xs text-gray-500">
                  {shift.durationInHours}h · {shift.isNightShift ? t("nightShift") : t("dayShift")} · {formatCurrency(shift.value)}
                </p>
              </div>
            </div>
          ))}

          {/* Exhaustion summary */}
          {scenario.totalExhaustion > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className={clsx("rounded-xl p-3", scenario.totalExhaustion >= 10 ? "bg-red-50" : scenario.totalExhaustion >= 7 ? "bg-amber-50" : "bg-sand-100")}>
                <p className="text-xs text-gray-500">{t("totalExhaustion")}</p>
                <p className={clsx("text-sm font-bold mt-0.5", scenario.totalExhaustion >= 10 ? "text-red-600" : scenario.totalExhaustion >= 7 ? "text-amber-700" : "text-gray-800")}>
                  {scenario.totalExhaustion.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-sand-100">
                <p className="text-xs text-gray-500">{t("sustainability")}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {scenario.sustainabilityIndex ? formatCurrency(scenario.sustainabilityIndex) : "—"}<span className="text-xs font-normal text-gray-400"> {t("perExhaustion")}</span>
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            {isApplied ? (
              <div className="flex items-center gap-2 text-sm text-moss-700 bg-moss-50 rounded-xl px-4 py-3 border border-moss-100">
                <Check className="w-4 h-4" />
                {t("scenarioApplied")}
              </div>
            ) : (
              <Button
                onClick={onApply}
                loading={isApplying}
                className="w-full"
                icon={<Zap className="w-4 h-4" />}
              >
                {t("applyScenario")}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
