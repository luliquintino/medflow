"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, Activity, BookOpen, Calculator, AlertTriangle, Shield, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { FlowBadge } from "@/components/ui/flow-badge";
import { formatDate } from "@/lib/format";
import type { FlowScore } from "@/types";

interface HistoryRecord {
  id: string;
  riskLevel: FlowScore;
  riskScore: number;
  createdAt: string;
  hoursInWeek: number;
  consecutiveNights: number;
  recommendation?: string;
  triggerRules?: string[];
}

interface HistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: HistoryRecord;
}

/** Scientific evidence mapped to each FlowScore level */
const LEVEL_EVIDENCE: Record<FlowScore, { citation: string; summary: string }[]> = {
  PILAR_SUSTENTAVEL: [
    {
      citation: "ACGME Duty Hour Standards",
      summary: "Carga dentro dos limites recomendados reduz significativamente erros médicos e melhora a qualidade do atendimento.",
    },
  ],
  PILAR_CARGA_ELEVADA: [
    {
      citation: "ACGME Duty Hour Studies; Lockley et al., NEJM 2004",
      summary: "Cargas acima de 48h semanais começam a elevar o risco de fadiga e reduzir a atenção clínica.",
    },
    {
      citation: "BMJ Occupational Health; Vetter et al., JAMA 2016",
      summary: "Trabalho noturno frequente está associado a distúrbios de sono e maior risco cardiovascular.",
    },
  ],
  PILAR_RISCO_FADIGA: [
    {
      citation: "Lockley et al., NEJM 2004",
      summary: "Médicos trabalhando mais de 60h semanais apresentam maior risco de fadiga e erros médicos.",
    },
    {
      citation: "Dawson & Reid, Nature 1997",
      summary: "Sequências prolongadas de trabalho sem descanso adequado reduzem performance cognitiva de forma equivalente à intoxicação alcoólica.",
    },
    {
      citation: "Williamson & Feyer, Occup Environ Med 2000",
      summary: "Após 24h sem sono, a performance cognitiva equivale a um nível de álcool no sangue de 0.10%.",
    },
  ],
  PILAR_ALTO_RISCO: [
    {
      citation: "Lockley et al., NEJM 2004",
      summary: "Médicos com jornadas prolongadas apresentam 36% mais erros médicos graves e 61% mais acidentes com perfurocortantes.",
    },
    {
      citation: "Dawson & Reid, Nature 1997; ICAO FRMS Standards",
      summary: "Fadiga acumulada compromete a tomada de decisão clínica em nível comparável à intoxicação. Sistemas FRMS da aviação (ICAO) recomendam pausa imediata.",
    },
    {
      citation: "Vetter et al., JAMA 2016; BMJ Occupational Health",
      summary: "Carga noturna excessiva aumenta risco cardiovascular em até 40% e compromete a recuperação circadiana.",
    },
  ],
};

const LEVEL_ICON: Record<FlowScore, { icon: typeof Shield; color: string; bg: string }> = {
  PILAR_SUSTENTAVEL: { icon: Shield, color: "text-moss-600", bg: "bg-moss-50" },
  PILAR_CARGA_ELEVADA: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  PILAR_RISCO_FADIGA: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
  PILAR_ALTO_RISCO: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
};

/** Explains how the FlowScore algorithm works for each dimension */
const CALCULATION_STEPS: { label: string; description: string }[] = [
  {
    label: "Carga horária (7/14/28 dias)",
    description: "Analisamos suas horas trabalhadas em 3 janelas: 7 dias (fadiga aguda), 14 dias (acumulada) e 28 dias (crônica/burnout).",
  },
  {
    label: "Plantões noturnos",
    description: "Contamos plantões noturnos nos últimos 7 dias. Acima de 2 noturnos seguidos compromete o ciclo circadiano.",
  },
  {
    label: "Plantões consecutivos",
    description: "Sequências sem folga adequada reduzem a capacidade cognitiva de forma exponencial.",
  },
  {
    label: "Pior cenário (worst-of)",
    description: "O score final usa a pior classificação entre todas as dimensões — se qualquer indicador estiver em risco, o nível geral reflete isso.",
  },
];

export function HistoryDetailModal({ isOpen, onClose, record }: HistoryDetailModalProps) {
  const t = useTranslations("riskHistory");
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen) return null;

  const cfg = LEVEL_ICON[record.riskLevel] ?? LEVEL_ICON.PILAR_SUSTENTAVEL;
  const Icon = cfg.icon;
  const evidence = LEVEL_EVIDENCE[record.riskLevel] ?? [];
  const isAlarming = record.riskLevel === "PILAR_RISCO_FADIGA" || record.riskLevel === "PILAR_ALTO_RISCO";

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        className="bg-cream-50 rounded-t-2xl sm:rounded-2xl shadow-float border border-cream-200 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-cream-50 border-b border-cream-200 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", cfg.bg)}>
              <Icon className={clsx("w-5 h-5", cfg.color)} />
            </div>
            <div>
              <h3 id="history-detail-title" className="text-base font-semibold text-gray-800">
                {t("detailTitle")}
              </h3>
              <p className="text-xs text-gray-400">{formatDate(record.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-cream-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Classification + Score */}
          <div className="flex items-center justify-between">
            <FlowBadge level={record.riskLevel} />
            <span className="text-sm text-gray-500">
              Score: <strong className="text-gray-800">{record.riskScore}</strong>/100
            </span>
          </div>

          {/* Recommendation */}
          {record.recommendation && (
            <div className={clsx("rounded-xl p-4 border", isAlarming ? "bg-red-50 border-red-200" : "bg-sand-100 border-cream-200")}>
              <p className={clsx("text-sm leading-relaxed", isAlarming ? "text-red-700" : "text-gray-700")}>
                {record.recommendation}
              </p>
            </div>
          )}

          {/* Data considered */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              {t("dataConsidered")}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-sand-100 rounded-lg p-2.5">
                <p className="text-[11px] text-gray-500">{t("hoursInWeekLabel")}</p>
                <p className="text-sm font-bold text-gray-800">{record.hoursInWeek}h</p>
              </div>
              <div className="bg-sand-100 rounded-lg p-2.5">
                <p className="text-[11px] text-gray-500">{t("consecutiveNightsLabel")}</p>
                <p className="text-sm font-bold text-gray-800">{record.consecutiveNights}x</p>
              </div>
              <div className="bg-sand-100 rounded-lg p-2.5 col-span-2">
                <p className="text-[11px] text-gray-500">{t("riskScoreLabel")}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        record.riskScore >= 80 ? "bg-red-500" : record.riskScore >= 60 ? "bg-orange-500" : record.riskScore >= 40 ? "bg-amber-500" : "bg-moss-500"
                      )}
                      style={{ width: `${Math.min(record.riskScore, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{record.riskScore}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Triggered rules */}
          {record.triggerRules && record.triggerRules.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t("rulesTriggered")}
              </h4>
              <div className="space-y-1.5">
                {record.triggerRules.map((rule, i) => (
                  <div key={i} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                    <p className="text-xs text-amber-700">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How it's calculated */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              {t("howCalculated")}
            </h4>
            <div className="space-y-2">
              {CALCULATION_STEPS.map((step, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cream-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-gray-500">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{step.label}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scientific evidence */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {t("scientificBasis")}
            </h4>
            <div className="space-y-1.5">
              {evidence.map((e, i) => (
                <div key={i} className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                  <p className="text-xs text-gray-700">{e.summary}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5 italic">{e.citation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
