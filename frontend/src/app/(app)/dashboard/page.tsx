"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, Clock, Calendar, Zap, ArrowRight, AlertTriangle } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then((r) => unwrap<DashboardData>(r)),
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageSpinner />;

  const finance = data?.finance;
  const workload = data?.workload;
  const risk = data?.risk;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const monthMessage = () => {
    if (!finance) return "Configure seu perfil financeiro para começar.";
    if (finance.isIdealReached) return "🎯 Você já atingiu sua meta ideal este mês!";
    if (finance.isMinimumReached) return "✅ Você já garantiu sua meta mínima.";
    if (finance.progressToMinimum >= 70) return "Seu mês está fluindo bem.";
    return "Vamos lá — há espaço para mais plantões este mês.";
  };

  const chartData = finance?.projections?.threeMonths?.map((p) => ({
    name: p.label,
    receita: p.projectedRevenue,
    meta: finance.idealMonthlyGoal,
  })) ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h2>
        <p className="text-gray-500 mt-1">{monthMessage()}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-moss-600" />}
          label="Receita do mês"
          value={finance ? formatCurrency(finance.currentRevenue) : "—"}
          sub={finance ? `Meta: ${formatCurrency(finance.idealMonthlyGoal)}` : ""}
          bg="bg-moss-50"
        />
        <KpiCard
          icon={<Calendar className="w-4 h-4 text-blue-600" />}
          label="Plantões confirmados"
          value={workload ? String(workload.shiftsThisMonth) : "—"}
          sub={workload ? `${workload.totalHoursThisMonth}h este mês` : ""}
          bg="bg-blue-50"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          label="Horas na semana"
          value={workload ? `${workload.totalHoursThisWeek}h` : "—"}
          sub={workload?.nextRestDayRecommended ? "Descanso recomendado" : "Carga tranquila"}
          bg="bg-amber-50"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-gray-600" />}
          label="Nível de risco"
          value={risk ? <RiskBadge level={risk.level} size="sm" /> : "—"}
          sub={risk ? `Score: ${risk.score}/100` : ""}
          bg="bg-cream-100"
        />
      </div>

      {/* Progress + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meta financeira */}
        <Card>
          <CardHeader>
            <CardTitle>Meta financeira</CardTitle>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </CardHeader>
          {finance ? (
            <div className="space-y-4">
              <ProgressBar
                value={finance.progressToMinimum}
                color={finance.progressToMinimum >= 100 ? "moss" : "amber"}
                size="md"
                showLabel
                label="Meta mínima"
              />
              <ProgressBar
                value={finance.progressToIdeal}
                color="moss"
                size="md"
                showLabel
                label="Meta ideal"
              />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Falta para mínimo</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {formatCurrency(finance.revenueToMinimum)}
                  </p>
                </div>
                <div className="bg-sand-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Plantões mínimos</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {finance.minimumShiftsRequired} plantões
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <NoData href="/onboarding" text="Configure seu perfil para ver a meta" />
          )}
        </Card>

        {/* Risco atual */}
        <Card>
          <CardHeader>
            <CardTitle>Carga de trabalho</CardTitle>
            {risk && <RiskBadge level={risk.level} />}
          </CardHeader>
          {risk && workload ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 italic bg-sand-100 rounded-xl p-3 leading-relaxed">
                "{risk.recommendation}"
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Horas nos 5 dias" value={`${workload.hoursInLast5Days}h`} limit="/ 60h" warn={workload.hoursInLast5Days >= 48} />
                <Metric label="Horas na semana" value={`${workload.totalHoursThisWeek}h`} limit="/ 72h" warn={workload.totalHoursThisWeek >= 56} />
                <Metric label="Noturno consecutivo" value={`${workload.consecutiveNightShifts}x`} limit="/ 3x" warn={workload.consecutiveNightShifts >= 2} />
                <Metric label="Plantões seguidos" value={`${workload.consecutiveShifts}x`} limit="/ 3x" warn={workload.consecutiveShifts >= 2} />
              </div>
            </div>
          ) : (
            <NoData href="/shifts" text="Adicione plantões para ver sua carga" />
          )}
        </Card>
      </div>

      {/* Projeção */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projeção dos próximos 3 meses</CardTitle>
          </CardHeader>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#638f46" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#638f46" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), ""]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e8dfd3", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="meta" stroke="#e0c9b8" strokeWidth={1} fill="none" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="receita" stroke="#638f46" strokeWidth={2} fill="url(#colorReceita)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* CTA */}
      <Link href="/simulate">
        <div className="bg-moss-gradient rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity shadow-float">
          <div>
            <p className="text-white font-semibold text-lg">Simular um plantão</p>
            <p className="text-moss-100 text-sm mt-0.5">
              Veja o impacto financeiro e de carga antes de aceitar
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; bg?: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-xl font-bold text-gray-800 mt-0.5">{value}</div>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function Metric({ label, value, limit, warn }: {
  label: string; value: string; limit?: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${warn ? "bg-amber-50" : "bg-sand-100"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${warn ? "text-amber-700" : "text-gray-800"}`}>
        {value} <span className="text-xs font-normal text-gray-400">{limit}</span>
      </p>
    </div>
  );
}

function NoData({ href, text }: { href: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-gray-500 mb-3">{text}</p>
      <Link href={href} className="text-sm text-moss-600 font-medium hover:underline flex items-center gap-1">
        Configurar <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
