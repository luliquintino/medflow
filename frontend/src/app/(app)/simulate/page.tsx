"use client";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, TrendingUp, CheckCircle2, XCircle, ArrowRight, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlowBadge } from "@/components/ui/flow-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RiskDetailModal } from "@/components/ui/risk-detail-modal";
import { clsx } from "clsx";
import { track } from "@vercel/analytics";
import type { SimulationResult, RiskResult, ShiftType } from "@/types";
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_HOURS } from "@/types";

interface SimulateResult {
  finance: SimulationResult;
  risk: RiskResult;
}

export default function SimulatePage() {
  const t = useTranslations("simulate");
  const tValidation = useTranslations("validation");

  const schema = useMemo(() => z.object({
    date: z.string().min(1, tValidation("dateRequired")),
    type: z.enum(["TWELVE_DAY", "TWELVE_NIGHT", "TWENTY_FOUR", "TWENTY_FOUR_INVERTED"]),
    value: z.coerce.number().min(0, tValidation("valueRequired")),
  }), [tValidation]);

  type FormData = z.infer<typeof schema>;

  const [result, setResult] = useState<SimulateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: { type: "TWELVE_DAY" },
    });

  const shiftType = watch("type") as ShiftType;

  async function onSubmit(data: FormData) {
    try {
      setLoading(true);
      setError("");

      const hours = SHIFT_TYPE_HOURS[data.type];

      const [financeRes, riskRes] = await Promise.all([
        api.post("/finance/simulate", { shiftValue: data.value, shiftHours: hours }),
        api.post("/risk/simulate", { date: data.date, type: data.type, hours }),
      ]);

      setResult({
        finance: unwrap<SimulationResult>(financeRes),
        risk: unwrap<RiskResult>(riskRes),
      });
      track("shift_simulated", { type: data.type });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const isHighRisk = result && (result.risk.level === "PILAR_RISCO_FADIGA" || result.risk.level === "PILAR_ALTO_RISCO");

  const verdict = (r: SimulateResult) => {
    if (r.risk.level === "PILAR_RISCO_FADIGA" || r.risk.level === "PILAR_ALTO_RISCO")
      return { ok: false, text: t("verdictHigh"), color: "text-red-700", bg: "bg-red-50 border-red-200" };
    if (r.risk.level === "PILAR_CARGA_ELEVADA" && !r.finance.idealReachedBefore)
      return { ok: true, text: t("verdictModerate"), color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    return { ok: true, text: t("verdictSafe"), color: "text-moss-700", bg: "bg-moss-50 border-moss-200" };
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <Zap className="w-5 h-5 text-moss-500" />
        </CardHeader>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">{t("typeLabel")}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["TWELVE_DAY", "TWELVE_NIGHT", "TWENTY_FOUR", "TWENTY_FOUR_INVERTED"] as ShiftType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setValue("type", tp)}
                  className={clsx(
                    "rounded-xl py-3 text-sm font-medium border transition-all",
                    shiftType === tp
                      ? "bg-moss-600 text-white border-moss-600"
                      : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                  )}
                >
                  {SHIFT_TYPE_LABELS[tp]}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t("dateLabel")}
            type="datetime-local"
            error={errors.date?.message}
            {...register("date")}
          />
          <Input
            label={t("valueLabel")}
            type="number"
            placeholder={t("valuePlaceholder")}
            error={errors.value?.message}
            {...register("value")}
          />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            {t("submit")}
          </Button>
        </form>
      </Card>

      {/* Results — clean & minimal */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Verdict card */}
          {(() => {
            const v = verdict(result);
            return (
              <div className={clsx("rounded-2xl border p-5", v.bg)}>
                <div className="flex items-start gap-3">
                  {v.ok
                    ? <CheckCircle2 className="w-6 h-6 text-moss-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={clsx("font-semibold", v.color)}>{v.text}</p>
                      <FlowBadge
                        level={result.risk.level}
                        size="sm"
                        onClick={() => setModalOpen(true)}
                      />
                    </div>
                    {/* Only show recommendation for alarming levels */}
                    {isHighRisk && result.risk.recommendation && (
                      <p className="text-sm text-gray-600 mt-1">{result.risk.recommendation}</p>
                    )}
                  </div>
                </div>
                {/* Subtle "see details" hint */}
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-9"
                >
                  <Info className="w-3.5 h-3.5" />
                  {t("seeDetails")}
                </button>
              </div>
            );
          })()}

          {/* Finance impact — always shown, compact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-moss-500" />
                {t("financeImpact")}
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{t("revenueGain")}</p>
                  <p className="text-lg font-bold text-moss-700 mt-0.5">
                    +{formatCurrency(result.finance.revenueGain)}
                  </p>
                </div>
                <div className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{t("idealImpact")}</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">
                    +{result.finance.impactPercentage}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{t("minimumGoal")}</span>
                    <span>{result.finance.progressToMinimumBefore}% → <strong className="text-moss-600">{result.finance.progressToMinimumAfter}%</strong></span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <ProgressBar value={result.finance.progressToMinimumBefore} color="amber" size="sm" className="flex-1" />
                    <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <ProgressBar value={result.finance.progressToMinimumAfter} color="moss" size="sm" className="flex-1" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{t("idealGoal")}</span>
                    <span>{result.finance.progressToIdealBefore}% → <strong className="text-moss-600">{result.finance.progressToIdealAfter}%</strong></span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <ProgressBar value={result.finance.progressToIdealBefore} color="amber" size="sm" className="flex-1" />
                    <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <ProgressBar value={result.finance.progressToIdealAfter} color="moss" size="sm" className="flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Inline warning — ONLY for alarming levels */}
          {isHighRisk && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">{t("highRiskWarning")}</p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="text-xs text-red-600 underline underline-offset-2 mt-1 hover:text-red-800 transition-colors"
                >
                  {t("seeWhyClassified")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk detail modal */}
      {result && (
        <RiskDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          risk={result.risk}
        />
      )}
    </div>
  );
}
