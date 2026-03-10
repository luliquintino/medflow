"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Watch, Activity, Battery, RotateCcw, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { clsx } from "clsx";
import type { User as UserType, Gender } from "@/types";

const selectClass =
  "w-full rounded-xl border border-cream-300 bg-white/70 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-moss-400 focus:border-transparent transition-all duration-200";

const ENERGY_DEFAULTS = {
  energyCostDiurno: 1.0,
  energyCostNoturno: 1.5,
  energyCost24h: 2.5,
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
  { value: "NON_BINARY", label: "Não-binário" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefiro não informar" },
];

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
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileGender, setProfileGender] = useState<string>(user?.gender ?? "");
  // Energy costs state
  const [energyCostDiurno, setEnergyCostDiurno] = useState(ENERGY_DEFAULTS.energyCostDiurno);
  const [energyCostNoturno, setEnergyCostNoturno] = useState(ENERGY_DEFAULTS.energyCostNoturno);
  const [energyCost24h, setEnergyCost24h] = useState(ENERGY_DEFAULTS.energyCost24h);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => unwrap<UserType>(r)),
  });

  useEffect(() => {
    if (profile?.workProfile) {
      setEnergyCostDiurno(profile.workProfile.energyCostDiurno ?? ENERGY_DEFAULTS.energyCostDiurno);
      setEnergyCostNoturno(profile.workProfile.energyCostNoturno ?? ENERGY_DEFAULTS.energyCostNoturno);
      setEnergyCost24h(profile.workProfile.energyCost24h ?? ENERGY_DEFAULTS.energyCost24h);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name ?? "");
      setProfileGender(profile.gender ?? "");
    }
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: (data: { name: string; gender?: string }) =>
      api.patch("/users/profile", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const updated = res.data?.data || res.data;
      if (updated && user) {
        setUser({ ...user, ...updated });
      }
      setIsEditingProfile(false);
      toast.success("Perfil atualizado");
    },
  });

  const energyMutation = useMutation({
    mutationFn: (data: { energyCostDiurno: number; energyCostNoturno: number; energyCost24h: number }) =>
      api.patch("/users/work-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["optimization"] });
      toast.success("Custos energéticos salvos");
    },
  });

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim()) return;
    profileMutation.mutate({
      name: profileName.trim(),
      gender: profileGender || undefined,
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Configurações</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-moss-600" />
            Perfil
          </CardTitle>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="text-xs text-moss-600 hover:text-moss-700 font-medium flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
          )}
        </CardHeader>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label="Nome"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Seu nome"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Gênero</label>
              <select
                value={profileGender}
                onChange={(e) => setProfileGender(e.target.value)}
                className={selectClass}
              >
                <option value="">Selecionar...</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <p className="text-sm text-gray-500 bg-cream-100 rounded-xl px-4 py-3 border border-cream-200">
                {user?.email}
              </p>
            </div>

            {profileMutation.isError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
                {getErrorMessage(profileMutation.error)}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                loading={profileMutation.isPending}
                icon={<Save className="w-4 h-4" />}
                className="flex-1"
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileName(profile?.name ?? user?.name ?? "");
                  setProfileGender(profile?.gender ?? user?.gender ?? "");
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-moss-200 flex items-center justify-center">
              <span className="text-lg font-bold text-moss-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              {user?.gender && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {GENDER_OPTIONS.find((o) => o.value === user.gender)?.label}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Energy Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-purple-500" />
            Custos Energéticos Pessoais
          </CardTitle>
        </CardHeader>

        {profile?.workProfile ? (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Ajuste se você sente mais ou menos impacto que a média em cada tipo de plantão.
            </p>

            <EnergyCostSlider
              label="12h Diurno"
              value={energyCostDiurno}
              defaultValue={ENERGY_DEFAULTS.energyCostDiurno}
              onChange={setEnergyCostDiurno}
            />
            <EnergyCostSlider
              label="12h Noturno"
              value={energyCostNoturno}
              defaultValue={ENERGY_DEFAULTS.energyCostNoturno}
              onChange={setEnergyCostNoturno}
            />
            <EnergyCostSlider
              label="24h"
              value={energyCost24h}
              defaultValue={ENERGY_DEFAULTS.energyCost24h}
              onChange={setEnergyCost24h}
            />

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => energyMutation.mutate({ energyCostDiurno, energyCostNoturno, energyCost24h })}
                loading={energyMutation.isPending}
                icon={<Save className="w-4 h-4" />}
                className="flex-1"
              >
                Salvar
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEnergyCostDiurno(ENERGY_DEFAULTS.energyCostDiurno);
                  setEnergyCostNoturno(ENERGY_DEFAULTS.energyCostNoturno);
                  setEnergyCost24h(ENERGY_DEFAULTS.energyCost24h);
                }}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Restaurar padrões
              </Button>
            </div>

            {energyMutation.isError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
                {getErrorMessage(energyMutation.error)}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              Complete o onboarding primeiro para configurar seus custos energéticos.
            </p>
          </div>
        )}
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
    </div>
  );
}

function EnergyCostSlider({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{value.toFixed(1)}</span>
          {value !== defaultValue && (
            <span className="text-xs text-gray-400">(padrão: {defaultValue.toFixed(1)})</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min="0.5"
        max="5.0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-cream-200 rounded-full appearance-none cursor-pointer accent-moss-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0.5</span>
        <span>5.0</span>
      </div>
    </div>
  );
}
