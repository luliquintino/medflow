"use client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, AlertCircle } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageSpinner } from "@/components/ui/spinner";
import type { FinanceSummary } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from "recharts";

export default function FinancePage() {
  const { data: finance, isLoading } = useQuery({
    queryKey: ["finance"],
    queryFn: () => api.get("/finance/summary").then((r) => unwrap<FinanceSummary>(r)),
  });

  if (isLoading) return <PageSpinner />;

  if (!finance) {
    return (
      <Card className="text-center py-12 max-w-md">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-gray-600">Complete o onboarding para ver seu painel financeiro.</p>
      </Card>
    );
  }

  const sixMonthData = finance.projections.sixMonths.map((p) => ({
    name: p.label,
    receita: p.projectedRevenue,
    meta: finance.idealMonthlyGoal,
    abaixo: !p.goalMet,
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Painel Financeiro</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Status message */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receita atual", value: formatCurrency(finance.currentRevenue), color: "text-moss-700" },
          { label: "Meta mínima", value: formatCurrency(finance.minimumMonthlyGoal), color: "text-gray-800" },
          { label: "Meta ideal", value: formatCurrency(finance.idealMonthlyGoal), color: "text-gray-800" },
          { label: "Falta para ideal", value: formatCurrency(finance.revenueToIdeal), color: "text-amber-700" },
        ].map(({ label, value, color }) => (
          <Card key={label} padding="sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do mês</CardTitle>
          <span className="text-sm font-semibold text-moss-600">
            {finance.confirmedShiftsCount} plantão(ões)
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

      {/* Shifts needed */}
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

      {/* Installments */}
      {finance.profile.installments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parcelamentos ativos</CardTitle>
            <span className="text-sm font-semibold text-gray-600">
              {formatCurrency(finance.profile.installmentMonthlyTotal)}/mês
            </span>
          </CardHeader>
          <div className="space-y-2">
            {finance.profile.installments.map((inst: any) => (
              <div key={inst.id} className="flex items-center justify-between py-2.5 border-b border-cream-200 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{inst.description}</p>
                  <p className="text-xs text-gray-400">{inst.remainingMonths} meses restantes</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {formatCurrency(inst.monthlyValue)}/mês
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6-month projection chart */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção 6 meses</CardTitle>
        </CardHeader>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sixMonthData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: any) => [formatCurrency(Number(v)), ""]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e8dfd3", fontSize: 12 }}
              />
              <ReferenceLine y={finance.idealMonthlyGoal} stroke="#d4900a" strokeDasharray="4 4" label={{ value: "Meta ideal", position: "right", fontSize: 10, fill: "#d4900a" }} />
              <Bar dataKey="receita" radius={[8, 8, 0, 0]}>
                {sixMonthData.map((entry, i) => (
                  <Cell key={i} fill={entry.abaixo ? "#a8c490" : "#638f46"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Baseado no ritmo atual de plantões do mês
        </p>
      </Card>
    </div>
  );
}
