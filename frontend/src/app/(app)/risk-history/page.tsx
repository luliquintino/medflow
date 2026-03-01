"use client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Lock } from "lucide-react";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

export default function RiskHistoryPage() {
  const { user } = useAuthStore();
  const isPro = user?.subscription?.plan === "PRO";

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["risk-history"],
    queryFn: () => api.get("/risk/history?limit=30").then((r) => unwrap<any[]>(r)),
    enabled: isPro,
  });

  if (!isPro) {
    return (
      <div className="max-w-lg flex flex-col items-center text-center py-20 space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-cream-200 flex items-center justify-center">
          <Lock className="w-7 h-7 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Recurso exclusivo do plano Pro</h2>
        <p className="text-gray-500">
          O histórico de risco acumulado está disponível apenas no plano Pro. Faça upgrade para ter acesso a análises profundas ao longo do tempo.
        </p>
        <Link href="/settings">
          <Button>Ver planos</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Histórico de Risco</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Acompanhe como sua carga de trabalho evoluiu ao longo do tempo.
        </p>
      </div>

      {history.length === 0 ? (
        <Card className="text-center py-12">
          <Shield className="w-10 h-10 text-moss-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum registro ainda. O histórico é gerado automaticamente.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((record: any) => (
            <Card key={record.id} padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge level={record.riskLevel} size="sm" />
                    <span className="text-xs text-gray-400">
                      Score: {record.riskScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(record.createdAt)}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-0.5">
                  <p>{record.hoursIn5Days}h / 5 dias</p>
                  <p>{record.hoursInWeek}h / semana</p>
                  <p>{record.consecutiveNights} noturno(s) seguido(s)</p>
                </div>
              </div>
              {record.recommendation && (
                <p className="text-xs text-gray-600 italic mt-2 bg-sand-100 rounded-lg px-3 py-2">
                  "{record.recommendation}"
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
