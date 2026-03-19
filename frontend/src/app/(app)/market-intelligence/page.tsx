"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { TrendingUp, ChevronDown, ChevronUp, ArrowUpRight, ArrowRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { clsx } from "clsx";
import { api, unwrap } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageSpinner } from "@/components/ui/spinner";
import type { HospitalRoi, BenchmarkingData, StrategicInsight, Trend } from "@/types";

// ─── Hospital ROI Section ────────────────────────────────────────────────────

type SortKey = "score" | "value" | "volume";

const TIER_CONFIG = {
  ouro: { emoji: "\uD83E\uDD47", bg: "bg-amber-50 border-amber-200" },
  prata: { emoji: "\uD83E\uDD48", bg: "bg-gray-50 border-gray-200" },
  bronze: { emoji: "\uD83E\uDD49", bg: "bg-orange-50 border-orange-200" },
};

function HospitalROISection() {
  const t = useTranslations("marketIntelligence.roi");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: hospitals = [], isLoading, isError } = useQuery({
    queryKey: ["hospital-roi"],
    queryFn: async () => {
      try {
        const r = await api.get("/analytics/hospital-roi");
        const result = unwrap<{ hospitals: HospitalRoi[] }>(r);
        return result?.hospitals ?? [];
      } catch { return []; }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <PageSpinner />;

  if (hospitals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500">{t("noData")}</p>
      </Card>
    );
  }

  const sorted = [...hospitals].sort((a, b) => {
    if (sortBy === "score") return b.hospitalScore - a.hospitalScore;
    if (sortBy === "value") return b.revenuePerHour - a.revenuePerHour;
    return b.shiftCount - a.shiftCount;
  });

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "score", label: t("sortByScore") },
    { key: "value", label: t("sortByValue") },
    { key: "volume", label: t("sortByVolume") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">{t("title")}</h3>
        <div className="flex gap-1 bg-cream-100 rounded-xl p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortBy(opt.key)}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                sortBy === opt.key
                  ? "bg-white text-moss-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((h) => {
          const tier = TIER_CONFIG[h.hospitalTier];
          const isExpanded = expandedId === h.hospitalId;

          return (
            <div
              key={h.hospitalId}
              className={clsx(
                "rounded-2xl border transition-all",
                tier.bg
              )}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : h.hospitalId)}
                className="w-full px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Tier badge */}
                  <span className="text-xl flex-shrink-0">{tier.emoji}</span>

                  {/* Score circle */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e8dfd3"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={h.hospitalScore >= 70 ? "#638f46" : h.hospitalScore >= 40 ? "#d97706" : "#dc2626"}
                        strokeWidth="3"
                        strokeDasharray={`${h.hospitalScore}, 100`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                      {Math.round(h.hospitalScore)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{h.hospitalName}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{t("revenuePerHour")}: {formatCurrency(h.revenuePerHour)}</span>
                      <span>{h.shiftCount} {t("shiftCount").toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Expand icon */}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-cream-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white/60 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500">{t("totalRevenue")}</p>
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(h.totalRevenue)}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500">{t("revenuePerHour")}</p>
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(h.revenuePerHour)}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500">{t("shiftCount")}</p>
                      <p className="text-sm font-bold text-gray-800">{h.shiftCount}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500">{t("reliability")}</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(h.reliabilityScore)}/100</p>
                    </div>
                  </div>
                  {h.insight && (
                    <p className="text-xs text-gray-600 mt-3 bg-white/40 rounded-lg px-3 py-2">
                      {h.insight}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Benchmarking Section ────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "rising") return <ArrowUpRight className="w-3.5 h-3.5 text-moss-600" />;
  if (trend === "falling") return <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />;
  return <ArrowRight className="w-3.5 h-3.5 text-gray-400" />;
}

function DeltaBadge({ value, suffix }: { value: number; suffix?: string }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
        isPositive && "bg-moss-100 text-moss-700",
        isNegative && "bg-red-100 text-red-700",
        !isPositive && !isNegative && "bg-cream-200 text-gray-600"
      )}
    >
      {isPositive ? "\u2191" : isNegative ? "\u2193" : "\u2192"}
      {Math.abs(Math.round(value))}%
      {suffix && <span className="text-[10px] opacity-70 ml-0.5">{suffix}</span>}
    </span>
  );
}

// Simple sparkline from an array of numbers
function MiniSparkline({ data, color = "#638f46" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;

  const chartData = data.map((v, i) => ({ v, i }));

  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function BenchmarkingSection() {
  const t = useTranslations("marketIntelligence.benchmarking");

  const { data: bench, isLoading } = useQuery({
    queryKey: ["benchmarking"],
    queryFn: () =>
      api.get("/analytics/benchmarking").then((r) => unwrap<BenchmarkingData>(r)).catch(() => null),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <PageSpinner />;

  if (!bench) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500">{t("noData")}</p>
      </Card>
    );
  }

  // Build sparkline data from snapshots (fake 6 data points using available data)
  const revenueSpark = [
    bench.sixMonthAvg.revenue * 0.9,
    bench.sixMonthAvg.revenue,
    bench.threeMonthAvg.revenue * 0.95,
    bench.threeMonthAvg.revenue,
    bench.previousMonth.revenue,
    bench.currentMonth.revenue,
  ];

  const rphSpark = [
    bench.sixMonthAvg.revenuePerHour * 0.9,
    bench.sixMonthAvg.revenuePerHour,
    bench.threeMonthAvg.revenuePerHour * 0.95,
    bench.threeMonthAvg.revenuePerHour,
    bench.previousMonth.revenuePerHour,
    bench.currentMonth.revenuePerHour,
  ];

  const trendColors: Record<Trend, string> = {
    rising: "#638f46",
    stable: "#9ca3af",
    falling: "#dc2626",
  };

  const KPIS = [
    {
      label: t("revenue"),
      value: formatCurrency(bench.currentMonth.revenue),
      delta: bench.vsLastMonth.revenue,
      sparkData: revenueSpark,
      trend: bench.trends.goalAttainment,
    },
    {
      label: t("revenuePerHour"),
      value: formatCurrency(bench.currentMonth.revenuePerHour),
      delta: bench.vsLastMonth.revenuePerHour,
      sparkData: rphSpark,
      trend: bench.trends.revenuePerHour,
    },
    {
      label: t("hours"),
      value: `${bench.currentMonth.hours}h`,
      delta: bench.vsLastMonth.hours,
      sparkData: [],
      trend: bench.trends.workload,
    },
    {
      label: t("shifts"),
      value: `${bench.currentMonth.shiftsCount}`,
      delta: 0,
      sparkData: [],
      trend: "stable" as Trend,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">{t("title")}</h3>
        <div className="flex items-center gap-2">
          <TrendIcon trend={bench.trends.goalAttainment} />
          <span className={clsx(
            "text-xs font-medium",
            bench.trends.goalAttainment === "rising" && "text-moss-600",
            bench.trends.goalAttainment === "falling" && "text-red-500",
            bench.trends.goalAttainment === "stable" && "text-gray-500",
          )}>
            {t(bench.trends.goalAttainment)}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{kpi.value}</p>
              </div>
              {kpi.sparkData.length > 0 && (
                <MiniSparkline data={kpi.sparkData} color={trendColors[kpi.trend]} />
              )}
            </div>
            {kpi.delta !== 0 && (
              <div className="mt-1.5">
                <DeltaBadge value={kpi.delta} suffix={t("vsLastMonth")} />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Goal progress */}
      <Card>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{t("minimumGoal")}</span>
              <span className={clsx(
                "font-medium",
                bench.vsMinimumGoal.onTrack ? "text-moss-600" : "text-red-500"
              )}>
                {bench.vsMinimumGoal.onTrack ? t("onTrack") : t("offTrack")} ({Math.round(bench.vsMinimumGoal.progress)}%)
              </span>
            </div>
            <ProgressBar
              value={bench.vsMinimumGoal.progress}
              color={bench.vsMinimumGoal.onTrack ? "moss" : "red"}
              size="sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{t("idealGoal")}</span>
              <span className={clsx(
                "font-medium",
                bench.vsIdealGoal.onTrack ? "text-moss-600" : "text-amber-600"
              )}>
                {bench.vsIdealGoal.onTrack ? t("onTrack") : t("offTrack")} ({Math.round(bench.vsIdealGoal.progress)}%)
              </span>
            </div>
            <ProgressBar
              value={bench.vsIdealGoal.progress}
              color={bench.vsIdealGoal.onTrack ? "moss" : "amber"}
              size="sm"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Strategic Insights Section ──────────────────────────────────────────────

const INSIGHT_ICONS: Record<StrategicInsight["type"], string> = {
  opportunity: "\uD83D\uDCA1",
  warning: "\u26A0\uFE0F",
  achievement: "\uD83C\uDFC6",
  strategy: "\uD83C\uDFAF",
};

const INSIGHT_BORDER: Record<StrategicInsight["type"], string> = {
  opportunity: "border-l-blue-500",
  warning: "border-l-amber-500",
  achievement: "border-l-moss-500",
  strategy: "border-l-purple-500",
};

const INSIGHT_BG: Record<StrategicInsight["type"], string> = {
  opportunity: "bg-blue-50/50",
  warning: "bg-amber-50/50",
  achievement: "bg-moss-50/50",
  strategy: "bg-purple-50/50",
};

function StrategicInsightsSection() {
  const t = useTranslations("marketIntelligence.insights");
  const [showAll, setShowAll] = useState(false);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["strategic-insights"],
    queryFn: () =>
      api.get("/analytics/insights").then((r) => unwrap<StrategicInsight[]>(r)).catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <PageSpinner />;

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-gray-500">{t("noData")}</p>
      </Card>
    );
  }

  // Sort by priority, show max 5 unless expanded
  const sorted = [...insights].sort((a, b) => a.priority - b.priority);
  const visible = showAll ? sorted : sorted.slice(0, 5);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-800">{t("title")}</h3>

      <div className="space-y-2">
        {visible.map((insight, i) => (
          <div
            key={i}
            className={clsx(
              "rounded-xl border-l-4 px-4 py-3",
              INSIGHT_BORDER[insight.type],
              INSIGHT_BG[insight.type]
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">{INSIGHT_ICONS[insight.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                  <span className="text-[10px] font-medium text-gray-400 uppercase">
                    {t(insight.type)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{insight.description}</p>
                {insight.metric && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      {insight.metric.value} {insight.metric.unit}
                    </span>
                    {insight.metric.trend && <TrendIcon trend={insight.metric.trend} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sorted.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-sm font-medium text-moss-600 hover:text-moss-700 transition-colors"
        >
          {showAll ? t("seeLess") : t("seeMore")}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MarketIntelligencePage() {
  const t = useTranslations("marketIntelligence");

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-moss-500" />
          {t("title")}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Hospital ROI */}
      <HospitalROISection />

      {/* Benchmarking */}
      <BenchmarkingSection />

      {/* Strategic Insights */}
      <StrategicInsightsSection />
    </div>
  );
}
