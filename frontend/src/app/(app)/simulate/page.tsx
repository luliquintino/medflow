"use client";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, TrendingUp, CheckCircle2, XCircle, ArrowRight, Info, Plus, Trash2, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend,
} from "recharts";
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
import type { SimulationResult, RiskResult, ShiftType, ScenarioResult } from "@/types";
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_HOURS } from "@/types";

interface SimulateResult {
  finance: SimulationResult;
  risk: RiskResult;
}

interface ScenarioShift {
  id: string;
  type: ShiftType;
  date: string;
  value: number;
}

// ── Quick Simulation Tab (original) ──────────────────────────────────────────

function QuickSimulateTab() {
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
    <div className="space-y-4">
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

      {/* Results */}
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
                    {isHighRisk && result.risk.recommendation && (
                      <p className="text-sm text-gray-600 mt-1">{result.risk.recommendation}</p>
                    )}
                  </div>
                </div>
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

          {/* Finance impact */}
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

// ── Compound Scenario Tab (new) ──────────────────────────────────────────────

function CompoundScenarioTab() {
  const t = useTranslations("simulateScenario");
  const tValidation = useTranslations("validation");

  const [shifts, setShifts] = useState<ScenarioShift[]>([
    { id: crypto.randomUUID(), type: "TWELVE_DAY", date: "", value: 0 },
  ]);
  const [horizon, setHorizon] = useState<1 | 3 | 6>(3);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addShift() {
    if (shifts.length >= 10) return;
    setShifts([...shifts, { id: crypto.randomUUID(), type: "TWELVE_DAY", date: "", value: 0 }]);
  }

  function removeShift(id: string) {
    if (shifts.length <= 1) return;
    setShifts(shifts.filter((s) => s.id !== id));
  }

  function updateShift(id: string, field: keyof Omit<ScenarioShift, "id">, value: string | number) {
    setShifts(shifts.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  async function handleSubmit() {
    // Basic validation
    const hasEmpty = shifts.some((s) => !s.date || s.value <= 0);
    if (hasEmpty) {
      setError(tValidation("valueRequired"));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        shifts: shifts.map((s) => ({
          date: s.date,
          type: s.type,
          value: s.value,
          hours: SHIFT_TYPE_HOURS[s.type],
        })),
        projectionMonths: horizon,
      };

      const res = await api.post("/finance/simulate-scenario", payload);
      setResult(unwrap<ScenarioResult>(res));
      track("scenario_simulated", { shifts: shifts.length, horizon });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const HORIZONS: { label: string; value: 1 | 3 | 6 }[] = [
    { label: t("months1"), value: 1 },
    { label: t("months3"), value: 3 },
    { label: t("months6"), value: 6 },
  ];

  return (
    <div className="space-y-4">
      {/* Scenario builder */}
      <Card>
        <CardHeader>
          <CardTitle>{t("scenarioTitle")}</CardTitle>
          <BarChart3 className="w-5 h-5 text-moss-500" />
        </CardHeader>

        <p className="text-sm text-gray-500 mb-4">{t("scenarioSubtitle")}</p>

        {/* Shift list */}
        <div className="space-y-3">
          {shifts.map((shift, idx) => (
            <div key={shift.id} className="bg-sand-50 rounded-xl border border-cream-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                {shifts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeShift(shift.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("removeShift")}
                  </button>
                )}
              </div>

              {/* Type selector */}
              <div className="grid grid-cols-2 gap-1.5">
                {(["TWELVE_DAY", "TWELVE_NIGHT", "TWENTY_FOUR", "TWENTY_FOUR_INVERTED"] as ShiftType[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => updateShift(shift.id, "type", tp)}
                    className={clsx(
                      "rounded-lg py-2 text-xs font-medium border transition-all",
                      shift.type === tp
                        ? "bg-moss-600 text-white border-moss-600"
                        : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                    )}
                  >
                    {SHIFT_TYPE_LABELS[tp]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="datetime-local"
                  value={shift.date}
                  onChange={(e) => updateShift(shift.id, "date", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="R$ valor"
                  value={shift.value || ""}
                  onChange={(e) => updateShift(shift.id, "value", Number(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>

        {shifts.length < 10 && (
          <button
            type="button"
            onClick={addShift}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-cream-300 py-3 text-sm font-medium text-gray-500 hover:border-moss-300 hover:text-moss-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addShift")}
          </button>
        )}

        {/* Horizon selector */}
        <div className="mt-5">
          <label className="text-sm font-medium text-gray-700 mb-2 block">{t("horizon")}</label>
          <div className="flex gap-1 bg-cream-100 rounded-xl p-1">
            {HORIZONS.map((h) => (
              <button
                key={h.value}
                type="button"
                onClick={() => setHorizon(h.value)}
                className={clsx(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  horizon === h.value
                    ? "bg-white text-moss-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <Button
          type="button"
          className="w-full mt-4"
          loading={loading}
          onClick={handleSubmit}
        >
          {t("submitScenario")}
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card padding="sm">
              <p className="text-xs text-gray-500">{t("totalAdded")}</p>
              <p className="text-lg font-bold text-moss-700 mt-0.5">
                +{formatCurrency(result.summary.totalAddedRevenue)}
              </p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-gray-500">{t("avgMonthly")}</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">
                {formatCurrency(result.summary.avgMonthlyIncome)}
              </p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-gray-500">{t("monthsToMin")}</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">
                {result.summary.monthsToMinGoal !== null ? `${result.summary.monthsToMinGoal}m` : t("alreadyMet")}
              </p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-gray-500">{t("monthsToIdeal")}</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">
                {result.summary.monthsToIdealGoal !== null ? `${result.summary.monthsToIdealGoal}m` : t("alreadyMet")}
              </p>
            </Card>
          </div>

          {/* Stacked bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-moss-500" />
                {t("resultTitle")}
              </CardTitle>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.monthlyBreakdown} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ebe3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#aaa" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatCurrency(v),
                      name === "currentRevenue" ? t("currentRevenue") : t("addedRevenue"),
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e8dfd3",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "currentRevenue" ? t("currentRevenue") : t("addedRevenue")
                    }
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  {/* Minimum goal — dashed amber */}
                  {result.monthlyBreakdown.length > 0 && result.monthlyBreakdown[0].minimumGoalGap !== undefined && (
                    <ReferenceLine
                      y={result.monthlyBreakdown[0].totalRevenue - result.monthlyBreakdown[0].minimumGoalGap + result.monthlyBreakdown[0].minimumGoalGap}
                      stroke="#d97706"
                      strokeDasharray="6 3"
                      label={{ value: "Min", position: "right", fontSize: 10, fill: "#d97706" }}
                    />
                  )}
                  {/* Ideal goal — solid green */}
                  {result.monthlyBreakdown.length > 0 && (
                    <ReferenceLine
                      y={result.monthlyBreakdown[0].totalRevenue + result.monthlyBreakdown[0].idealGoalGap}
                      stroke="#638f46"
                      strokeWidth={2}
                      label={{ value: "Ideal", position: "right", fontSize: 10, fill: "#638f46" }}
                    />
                  )}
                  <Bar dataKey="currentRevenue" stackId="revenue" fill="#638f46" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="addedRevenue" stackId="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Per-month details */}
          <div className="space-y-2">
            {result.monthlyBreakdown.map((mb) => (
              <div key={mb.month} className="bg-sand-50 rounded-xl border border-cream-200 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{mb.month}</span>
                  <span className="text-sm font-bold text-moss-700">{formatCurrency(mb.totalRevenue)}</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Meta ideal</span>
                      <span>{Math.round(mb.idealGoalProgress)}%</span>
                    </div>
                    <ProgressBar
                      value={mb.idealGoalProgress}
                      color={mb.idealGoalProgress >= 100 ? "moss" : mb.idealGoalProgress >= 70 ? "amber" : "red"}
                      size="sm"
                    />
                  </div>
                  {mb.idealGoalGap > 0 && mb.suggestedExtraShifts > 0 && (
                    <p className="text-xs text-gray-500">
                      {t("goalGap", { amount: formatCurrency(mb.idealGoalGap) })}
                      {" — "}
                      {t("extraShifts", { count: mb.suggestedExtraShifts })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  const t = useTranslations("simulate");
  const tScenario = useTranslations("simulateScenario");

  const [tab, setTab] = useState<"quick" | "scenario">("quick");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setTab("quick")}
          className={clsx(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            tab === "quick"
              ? "bg-white text-moss-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {tScenario("tabQuick")}
        </button>
        <button
          type="button"
          onClick={() => setTab("scenario")}
          className={clsx(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            tab === "scenario"
              ? "bg-white text-moss-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {tScenario("tabScenario")}
        </button>
      </div>

      {tab === "quick" ? <QuickSimulateTab /> : <CompoundScenarioTab />}
    </div>
  );
}
