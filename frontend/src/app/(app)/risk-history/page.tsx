"use client";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, unwrap } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PageSpinner } from "@/components/ui/spinner";
import type { RiskLevel } from "@/types";

interface RiskHistoryRecord {
  id: string;
  riskLevel: RiskLevel;
  riskScore: number;
  createdAt: string;
  hoursIn5Days: number;
  hoursInWeek: number;
  consecutiveNights: number;
  recommendation?: string;
}

export default function RiskHistoryPage() {
  const t = useTranslations("riskHistory");

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

      {history.length === 0 ? (
        <Card className="text-center py-12">
          <Shield className="w-10 h-10 text-moss-400 mx-auto mb-3" />
          <p className="text-gray-500">{t("emptyState")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <Card key={record.id} padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={record.riskLevel} size="sm" />
                    <span className="text-xs text-gray-400">
                      {t("scoreLabel", { score: record.riskScore })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(record.createdAt)}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-0.5">
                  <p>{t("hoursIn5Days", { hours: record.hoursIn5Days })}</p>
                  <p>{t("hoursInWeek", { hours: record.hoursInWeek })}</p>
                  <p>{t("consecutiveNights", { count: record.consecutiveNights })}</p>
                </div>
              </div>
              {record.recommendation && (
                <p className="text-xs text-gray-600 italic mt-2 bg-sand-100 rounded-lg px-3 py-2">
                  &ldquo;{record.recommendation}&rdquo;
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
