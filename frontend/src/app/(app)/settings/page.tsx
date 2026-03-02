"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Watch, Heart, Moon, Zap, Activity, RefreshCw } from "lucide-react";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { clsx } from "clsx";

const WEARABLE_PROVIDERS = [
  {
    id: "apple_health",
    name: "Apple Health",
    description: "Dados de saude do iPhone e Apple Watch",
    color: "bg-red-500",
  },
  {
    id: "garmin",
    name: "Garmin",
    description: "Relogios e dispositivos Garmin",
    color: "bg-blue-600",
  },
  {
    id: "oura",
    name: "Oura Ring",
    description: "Anel inteligente de monitoramento",
    color: "bg-purple-600",
  },
  {
    id: "whoop",
    name: "Whoop",
    description: "Pulseira de recuperacao e performance",
    color: "bg-green-600",
  },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [syncLoading, setSyncLoading] = useState(false);

  const { data: wearableData, isLoading: wearableLoading } = useQuery({
    queryKey: ["wearable-latest"],
    queryFn: () => api.get("/wearable/latest").then((r) => unwrap<any>(r)),
    retry: false,
  });

  const { data: wearableHistory } = useQuery({
    queryKey: ["wearable-history"],
    queryFn: () => api.get("/wearable/history?days=7").then((r) => unwrap<any[]>(r)),
    retry: false,
  });

  async function handleSync() {
    try {
      setSyncLoading(true);
      await api.post("/wearable/sync");
      queryClient.invalidateQueries({ queryKey: ["wearable-latest"] });
      queryClient.invalidateQueries({ queryKey: ["wearable-history"] });
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Configuracoes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta e wearables</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-moss-600" />
            Perfil
          </CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-moss-200 flex items-center justify-center">
            <span className="text-lg font-bold text-moss-700">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Wearable Providers */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Watch className="w-4 h-4 text-moss-600" />
          Wearables conectados
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WEARABLE_PROVIDERS.map((provider) => (
            <Card key={provider.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white", provider.color)}>
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{provider.name}</p>
                  <p className="text-xs text-gray-500 truncate">{provider.description}</p>
                </div>
                <span className="text-xs text-gray-400 bg-cream-100 px-2 py-1 rounded-lg">
                  Em breve
                </span>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Integracao direta com wearables esta em desenvolvimento. Dados de demonstracao estao disponiveis.
        </p>
      </div>

      {/* Sync & Latest Data */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-moss-600" />
            Dados recentes
          </h3>
          <Button
            variant="secondary"
            size="sm"
            loading={syncLoading}
            onClick={handleSync}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sincronizar
          </Button>
        </div>

        {wearableData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="sm" className="text-center">
              <Heart className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{wearableData.hrv?.value ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">HRV (ms)</p>
            </Card>
            <Card padding="sm" className="text-center">
              <Moon className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{wearableData.sleep?.score ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sono (score)</p>
            </Card>
            <Card padding="sm" className="text-center">
              <Zap className="w-5 h-5 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{wearableData.recovery?.score ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Recuperacao</p>
            </Card>
            <Card padding="sm" className="text-center">
              <Activity className="w-5 h-5 text-moss-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{wearableData.recovery?.restingHR ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">FC Repouso</p>
            </Card>
          </div>
        ) : (
          <Card className="text-center py-10">
            <Watch className="w-10 h-10 text-moss-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Nenhum dado de wearable ainda. Clique em "Sincronizar" para buscar dados.
            </p>
          </Card>
        )}

        {wearableData?.interpretation && (
          <Card className="mt-3 bg-moss-50 border-moss-200">
            <p className="text-sm text-moss-800 font-medium">
              {wearableData.interpretation.message}
            </p>
          </Card>
        )}
      </div>

      {/* History */}
      {wearableHistory && wearableHistory.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Historico (ultimos 7 dias)
          </h3>
          <div className="space-y-2">
            {wearableHistory.map((entry: any) => (
              <Card key={entry.id} padding="sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {new Date(entry.recordedAt).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    {entry.hrv != null && <span>HRV: {entry.hrv}</span>}
                    {entry.sleepScore != null && <span>Sono: {entry.sleepScore}</span>}
                    {entry.recoveryScore != null && <span>Rec: {entry.recoveryScore}</span>}
                    {entry.restingHR != null && <span>FC: {entry.restingHR}</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
