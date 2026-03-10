"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, TrendingUp, Clock, CheckCircle2, XCircle, ArrowRight, Battery } from "lucide-react";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/ui/risk-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { clsx } from "clsx";
import type { SimulationResult, RiskResult, ShiftType } from "@/types";
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_HOURS } from "@/types";

const schema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  type: z.enum(["TWELVE_HOURS", "TWENTY_FOUR_HOURS", "NIGHT"]),
  value: z.coerce.number().min(0, "Informe o valor"),
});

type FormData = z.infer<typeof schema>;

interface SimulateResult {
  finance: SimulationResult;
  risk: RiskResult;
}

export default function SimulatePage() {
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: { type: "TWELVE_HOURS" },
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
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const verdict = (r: SimulateResult) => {
    if (r.risk.level === "HIGH") return { ok: false, text: "Não recomendamos aceitar este plantão agora.", color: "text-red-700", bg: "bg-red-50 border-red-200" };
    if (r.risk.level === "MODERATE" && !r.finance.idealReachedBefore)
      return { ok: true, text: "Você pode aceitar, mas fique atento à sua carga.", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    return { ok: true, text: "Tudo certo! Você pode aceitar este plantão.", color: "text-moss-700", bg: "bg-moss-50 border-moss-200" };
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Aceito ou Não?</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Simule um plantão e veja o impacto antes de decidir.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do plantão</CardTitle>
          <Zap className="w-5 h-5 text-moss-500" />
        </CardHeader>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de plantão</label>
            <div className="grid grid-cols-3 gap-2">
              {(["TWELVE_HOURS", "TWENTY_FOUR_HOURS", "NIGHT"] as ShiftType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue("type", t)}
                  className={clsx(
                    "rounded-xl py-3 text-sm font-medium border transition-all",
                    shiftType === t
                      ? "bg-moss-600 text-white border-moss-600"
                      : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                  )}
                >
                  {SHIFT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Data e hora do plantão"
            type="datetime-local"
            error={errors.date?.message}
            {...register("date")}
          />
          <Input
            label="Valor do plantão (R$)"
            type="number"
            placeholder="Ex: 1500"
            error={errors.value?.message}
            {...register("value")}
          />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            Simular agora
          </Button>
        </form>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Verdict */}
          {(() => {
            const v = verdict(result);
            return (
              <div className={clsx("rounded-2xl border p-5 flex items-start gap-3", v.bg)}>
                {v.ok
                  ? <CheckCircle2 className="w-6 h-6 text-moss-600 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={clsx("font-semibold", v.color)}>{v.text}</p>
                  <p className="text-sm text-gray-600 mt-1">{result.risk.recommendation}</p>
                </div>
              </div>
            );
          })()}

          {/* Finance impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-moss-500" />
                Impacto financeiro
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Ganho com este plantão</p>
                  <p className="text-lg font-bold text-moss-700 mt-0.5">
                    +{formatCurrency(result.finance.revenueGain)}
                  </p>
                </div>
                <div className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Impacto na meta ideal</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">
                    +{result.finance.impactPercentage}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Meta mínima</span>
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
                    <span>Meta ideal</span>
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

          {/* Workload impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Impacto na carga horária
              </CardTitle>
              <RiskBadge level={result.risk.level} />
            </CardHeader>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Horas nos 5 dias", value: `${result.risk.workload.hoursInLast5Days}h`, limit: "60h" },
                { label: "Horas na semana", value: `${result.risk.workload.totalHoursThisWeek}h`, limit: "72h" },
                { label: "Noturnos seguidos", value: `${result.risk.workload.consecutiveNightShifts}x`, limit: "3x" },
                { label: "Plantões seguidos", value: `${result.risk.workload.consecutiveShifts}x`, limit: "3x" },
              ].map(({ label, value, limit }) => (
                <div key={label} className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {value} <span className="text-xs font-normal text-gray-400">/ {limit}</span>
                  </p>
                </div>
              ))}
            </div>
            {result.risk.level !== "SAFE" && (
              <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Regras ativadas:</strong>{" "}
                  {result.risk.triggeredRules.length > 0
                    ? result.risk.rules.filter((r) => r.triggered).map((r) => r.message).join(" · ")
                    : "Nenhuma"}
                </p>
              </div>
            )}
          </Card>

          {/* Exhaustion impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-purple-500" />
                Custo energético
              </CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className={clsx("rounded-xl p-3", result.risk.exhaustionScore >= 10 ? "bg-red-50" : result.risk.exhaustionScore >= 7 ? "bg-amber-50" : "bg-sand-100")}>
                  <p className="text-xs text-gray-500">Exaustão total</p>
                  <p className={clsx("text-lg font-bold mt-0.5", result.risk.exhaustionScore >= 10 ? "text-red-600" : result.risk.exhaustionScore >= 7 ? "text-amber-700" : "text-gray-800")}>
                    {result.risk.exhaustionScore?.toFixed(1) ?? "0.0"} <span className="text-xs font-normal text-gray-400">/ 10.0</span>
                  </p>
                </div>
                <div className="rounded-xl p-3 bg-sand-100">
                  <p className="text-xs text-gray-500">Sustentabilidade</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">
                    {result.risk.sustainabilityIndex ? formatCurrency(result.risk.sustainabilityIndex) : "—"}
                    <span className="text-xs font-normal text-gray-400"> / exaustão</span>
                  </p>
                </div>
              </div>
              {result.risk.workload.sustainabilityIndex > 0 && result.risk.sustainabilityIndex > 0 && (
                <div className={clsx(
                  "rounded-xl p-3 border text-xs",
                  result.risk.sustainabilityIndex < result.risk.workload.sustainabilityIndex
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-moss-50 border-moss-200 text-moss-700"
                )}>
                  {result.risk.sustainabilityIndex < result.risk.workload.sustainabilityIndex
                    ? `Este plantão reduz sua sustentabilidade (média atual: ${formatCurrency(result.risk.workload.sustainabilityIndex)}/exaustão)`
                    : `Este plantão melhora sua sustentabilidade (média atual: ${formatCurrency(result.risk.workload.sustainabilityIndex)}/exaustão)`
                  }
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
