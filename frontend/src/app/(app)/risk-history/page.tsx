"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { FlowBadge } from "@/components/ui/flow-badge";
import { PageSpinner } from "@/components/ui/spinner";
import { RiskDistributionChart } from "./_components/risk-distribution-chart";
import { HistoryDetailModal } from "./_components/history-detail-modal";
import type { FlowScore } from "@/types";

interface RiskHistoryRecord {
  id: string;
  riskLevel: FlowScore;
  riskScore: number;
  createdAt: string;
  hoursInWeek: number;
  consecutiveNights: number;
  recommendation?: string;
  triggerRules?: string[];
}

export default function RiskHistoryPage() {
  const t = useTranslations("riskHistory");
  const [selectedRecord, setSelectedRecord] = useState<RiskHistoryRecord | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["risk-history"],
    queryFn: () => api.get("/risk/history?limit=30").then((r) => unwrap<RiskHistoryRecord[]>(r)),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {history.length > 0 && <RiskDistributionChart history={history} />}

      {history.length === 0 ? (
        <Card className="text-center py-12">
          <Shield className="w-10 h-10 text-moss-400 mx-auto mb-3" />
          <p className="text-gray-500">{t("emptyState")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => setSelectedRecord(record)}
              className="w-full text-left"
            >
              <Card padding="sm" className="hover:border-cream-400 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FlowBadge level={record.riskLevel} size="sm" />
                      <span className="text-xs text-gray-400">
                        {t("scoreLabel", { score: record.riskScore })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(record.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs text-gray-500 space-y-0.5">
                      <p>{t("hoursInWeek", { hours: record.hoursInWeek })}</p>
                      <p>{t("consecutiveNights", { count: record.consecutiveNights })}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedRecord && (
        <HistoryDetailModal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          record={selectedRecord}
        />
      )}
    </div>
  );
}
