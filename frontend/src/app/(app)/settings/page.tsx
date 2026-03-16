"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Battery, RotateCcw, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnergyCostSlider } from "@/components/ui/energy-cost-slider";
import { useAuthStore } from "@/store/auth.store";
import type { User as UserType, Gender } from "@/types";

const selectClass =
  "w-full rounded-xl border border-cream-300 bg-white/70 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-moss-400 focus:border-transparent transition-all duration-200";

const ENERGY_DEFAULTS = {
  energyCostDiurno: 1.0,
  energyCostNoturno: 1.4,
  energyCost24h: 2.2,
  energyCost24hInvertido: 2.4,
};

export default function SettingsPage() {
  const t = useTranslations("settings");

  const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: "MALE", label: t("gender.male") },
    { value: "FEMALE", label: t("gender.female") },
    { value: "NON_BINARY", label: t("gender.nonBinary") },
    { value: "PREFER_NOT_TO_SAY", label: t("gender.preferNotToSay") },
  ];

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
  const [energyCost24hInv, setEnergyCost24hInv] = useState(ENERGY_DEFAULTS.energyCost24hInvertido);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => unwrap<UserType>(r)),
  });

  useEffect(() => {
    if (profile?.workProfile) {
      setEnergyCostDiurno(profile.workProfile.energyCostDiurno ?? ENERGY_DEFAULTS.energyCostDiurno);
      setEnergyCostNoturno(profile.workProfile.energyCostNoturno ?? ENERGY_DEFAULTS.energyCostNoturno);
      setEnergyCost24h(profile.workProfile.energyCost24h ?? ENERGY_DEFAULTS.energyCost24h);
      setEnergyCost24hInv(profile.workProfile.energyCost24hInvertido ?? ENERGY_DEFAULTS.energyCost24hInvertido);
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
      toast.success(t("profile.toastSuccess"));
    },
  });

  const energyMutation = useMutation({
    mutationFn: (data: { energyCostDiurno: number; energyCostNoturno: number; energyCost24h: number; energyCost24hInvertido: number }) =>
      api.patch("/users/work-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["optimization"] });
      toast.success(t("energy.toastSuccess"));
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
        <h2 className="text-xl font-bold text-gray-800">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-moss-600" />
            {t("profile.title")}
          </CardTitle>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="text-xs text-moss-600 hover:text-moss-700 font-medium flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              {t("profile.edit")}
            </button>
          )}
        </CardHeader>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label={t("profile.nameLabel")}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={t("profile.namePlaceholder")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t("profile.genderLabel")}</label>
              <select
                value={profileGender}
                onChange={(e) => setProfileGender(e.target.value)}
                className={selectClass}
              >
                <option value="">{t("profile.genderPlaceholder")}</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t("profile.emailLabel")}</label>
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
                {t("profile.save")}
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
                {t("profile.cancel")}
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
            {t("energy.title")}
          </CardTitle>
        </CardHeader>

        {profile?.workProfile ? (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              {t("energy.description")}
            </p>

            <EnergyCostSlider
              label={t("energy.diurno12h")}
              value={energyCostDiurno}
              defaultValue={ENERGY_DEFAULTS.energyCostDiurno}
              onChange={setEnergyCostDiurno}
              defaultLabel={t("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCostDiurno.toFixed(1) })}
              scaleLow={t("energy.scaleLow")}
              scaleHigh={t("energy.scaleHigh")}
            />
            <EnergyCostSlider
              label={t("energy.noturno12h")}
              value={energyCostNoturno}
              defaultValue={ENERGY_DEFAULTS.energyCostNoturno}
              onChange={setEnergyCostNoturno}
              defaultLabel={t("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCostNoturno.toFixed(1) })}
              scaleLow={t("energy.scaleLow")}
              scaleHigh={t("energy.scaleHigh")}
            />
            <EnergyCostSlider
              label={t("energy.plantao24h")}
              value={energyCost24h}
              defaultValue={ENERGY_DEFAULTS.energyCost24h}
              onChange={setEnergyCost24h}
              defaultLabel={t("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCost24h.toFixed(1) })}
              scaleLow={t("energy.scaleLow")}
              scaleHigh={t("energy.scaleHigh")}
            />
            <EnergyCostSlider
              label={t("energy.cost24hInvertido")}
              value={energyCost24hInv}
              defaultValue={ENERGY_DEFAULTS.energyCost24hInvertido}
              onChange={setEnergyCost24hInv}
              defaultLabel={t("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCost24hInvertido.toFixed(1) })}
              scaleLow={t("energy.scaleLow")}
              scaleHigh={t("energy.scaleHigh")}
            />

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => energyMutation.mutate({ energyCostDiurno, energyCostNoturno, energyCost24h, energyCost24hInvertido: energyCost24hInv })}
                loading={energyMutation.isPending}
                icon={<Save className="w-4 h-4" />}
                className="flex-1"
              >
                {t("energy.save")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEnergyCostDiurno(ENERGY_DEFAULTS.energyCostDiurno);
                  setEnergyCostNoturno(ENERGY_DEFAULTS.energyCostNoturno);
                  setEnergyCost24h(ENERGY_DEFAULTS.energyCost24h);
                  setEnergyCost24hInv(ENERGY_DEFAULTS.energyCost24hInvertido);
                }}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                {t("energy.restoreDefaults")}
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
              {t("energy.onboardingRequired")}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

