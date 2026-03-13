"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnergyCostSlider } from "@/components/ui/energy-cost-slider";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { clsx } from "clsx";
import type { User } from "@/types";

const SHIFT_TYPE_KEYS = [
  { value: "TWELVE_DAY", labelKey: "twelveDay" as const, descKey: "twelveDay" as const },
  { value: "TWELVE_NIGHT", labelKey: "twelveNight" as const, descKey: "twelveNight" as const },
  { value: "TWENTY_FOUR", labelKey: "twentyFour" as const, descKey: "twentyFour" as const },
  { value: "TWENTY_FOUR_INVERTED", labelKey: "twentyFourInverted" as const, descKey: "twentyFourInverted" as const },
];

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const ENERGY_DEFAULTS = {
  energyCostDiurno: 1.0,
  energyCostNoturno: 1.5,
  energyCost24h: 2.5,
};

function createSchema(tv: (key: string) => string) {
  return z.object({
    minimumMonthlyGoal: z.coerce.number().min(0),
    idealMonthlyGoal: z.coerce.number().min(0),
    averageShiftValue: z.coerce.number().min(0),
    shiftTypes: z.array(z.string()).min(1, tv("selectAtLeastOneType")),
    maxWeeklyHours: z.preprocess(
      (v) => (v === "" || v === undefined ? undefined : Number(v)),
      z.number().min(1).optional(),
    ),
    preferredRestDays: z.array(z.number()).optional(),
  });
}

type FormData = z.infer<ReturnType<typeof createSchema>>;

export default function OnboardingPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const t = useTranslations("onboarding");
  const tv = useTranslations("validation");
  const tShiftTypes = useTranslations("shiftTypes");
  const tShiftTypeDesc = useTranslations("shiftTypeDesc");
  const tSettings = useTranslations("settings");

  const [energyCostDiurno, setEnergyCostDiurno] = useState(ENERGY_DEFAULTS.energyCostDiurno);
  const [energyCostNoturno, setEnergyCostNoturno] = useState(ENERGY_DEFAULTS.energyCostNoturno);
  const [energyCost24h, setEnergyCost24h] = useState(ENERGY_DEFAULTS.energyCost24h);

  const schema = useMemo(() => createSchema(tv), [tv]);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: {
        minimumMonthlyGoal: 0,
        idealMonthlyGoal: 0,
        averageShiftValue: 0,
        shiftTypes: [],
        preferredRestDays: [],
      },
    });

  const shiftTypes = watch("shiftTypes") as string[];
  const restDays = (watch("preferredRestDays") || []) as number[];

  function toggleShiftType(type: string) {
    const current = shiftTypes || [];
    if (current.includes(type)) {
      setValue("shiftTypes", current.filter((t) => t !== type));
    } else {
      setValue("shiftTypes", [...current, type]);
    }
  }

  function toggleRestDay(day: number) {
    const current = restDays || [];
    if (current.includes(day)) {
      setValue("preferredRestDays", current.filter((d) => d !== day));
    } else {
      setValue("preferredRestDays", [...current, day]);
    }
  }

  async function onSubmit(data: FormData) {
    try {
      setError("");
      const res = await api.post("/users/onboarding", {
        financial: {
          minimumMonthlyGoal: data.minimumMonthlyGoal,
          idealMonthlyGoal: data.idealMonthlyGoal,
          savingsGoal: 0,
          averageShiftValue: data.averageShiftValue,
        },
        work: {
          shiftTypes: data.shiftTypes,
          maxWeeklyHours: data.maxWeeklyHours || undefined,
          preferredRestDays: data.preferredRestDays,
          energyCostDiurno,
          energyCostNoturno,
          energyCost24h,
        },
      });
      const user = unwrap<User>(res);
      setUser(user);
      router.push("/dashboard");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Med Flow" width={80} height={80} />
          <div>
            <h1 className="text-xl font-bold text-moss-800">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("step", { step })}</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className={clsx("h-1.5 flex-1 rounded-full transition-all", s <= step ? "bg-moss-500" : "bg-cream-200")} />
          ))}
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)}>
          {/* Step 1 — Financial */}
          {step === 1 && (
            <div className="bg-cream-50 rounded-3xl shadow-card border border-cream-200 p-8 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{t("financialProfile.title")}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("financialProfile.description")}
                </p>
              </div>

              <Input
                label={t("financialProfile.minimumGoalLabel")}
                type="number"
                placeholder={t("financialProfile.minimumGoalPlaceholder")}
                hint={t("financialProfile.minimumGoalHint")}
                {...register("minimumMonthlyGoal")}
                error={errors.minimumMonthlyGoal?.message}
              />

              <Input
                label={t("financialProfile.idealGoalLabel")}
                type="number"
                placeholder={t("financialProfile.idealGoalPlaceholder")}
                hint={t("financialProfile.idealGoalHint")}
                {...register("idealMonthlyGoal")}
                error={errors.idealMonthlyGoal?.message}
              />

              <Input
                label={t("financialProfile.averageShiftValueLabel")}
                type="number"
                placeholder={t("financialProfile.averageShiftValuePlaceholder")}
                {...register("averageShiftValue")}
                error={errors.averageShiftValue?.message}
              />

              <Button type="button" className="w-full" onClick={async () => {
                  const valid = await trigger(["minimumMonthlyGoal", "idealMonthlyGoal", "averageShiftValue"]);
                  if (valid) setStep(2);
                }}
                icon={<ChevronRight className="w-4 h-4" />}>
                {t("next")}
              </Button>
            </div>
          )}

          {/* Step 2 — Work profile */}
          {step === 2 && (
            <div className="bg-cream-50 rounded-3xl shadow-card border border-cream-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{t("workProfile.title")}</h2>
                <p className="text-sm text-gray-500 mt-1">{t("workProfile.description")}</p>
              </div>

              {/* Shift types */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("workProfile.shiftTypesLabel")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_TYPE_KEYS.map(({ value, labelKey, descKey }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleShiftType(value)}
                      className={clsx(
                        "rounded-xl p-3 text-center border text-sm transition-all",
                        shiftTypes?.includes(value)
                          ? "bg-moss-600 text-white border-moss-600 shadow-sm"
                          : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                      )}
                    >
                      <div className="font-semibold">{tShiftTypes(labelKey)}</div>
                      <div className={clsx("text-xs mt-0.5", shiftTypes?.includes(value) ? "text-moss-100" : "text-gray-400")}>{tShiftTypeDesc(descKey)}</div>
                    </button>
                  ))}
                </div>
                {errors.shiftTypes && <p className="text-xs text-red-500 mt-1">{errors.shiftTypes.message}</p>}
              </div>

              {/* Weekly limit */}
              <Input
                label={t("workProfile.maxWeeklyHoursLabel")}
                type="number"
                placeholder={t("workProfile.maxWeeklyHoursPlaceholder")}
                hint={t("workProfile.maxWeeklyHoursHint")}
                {...register("maxWeeklyHours")}
                error={errors.maxWeeklyHours?.message}
              />

              {/* Rest days */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("workProfile.restDaysLabel")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((dayKey, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleRestDay(i)}
                      className={clsx(
                        "w-10 h-10 rounded-xl text-sm font-medium border transition-all",
                        restDays?.includes(i)
                          ? "bg-moss-500 text-white border-moss-500"
                          : "bg-white border-cream-300 text-gray-600 hover:border-moss-300"
                      )}
                    >
                      {t(`days.${dayKey}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy costs */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {t("workProfile.energyCostsTitle")}
                </label>
                <p className="text-xs text-gray-400 mb-4">
                  {t("workProfile.energyCostsDescription")}
                </p>
                <div className="space-y-4">
                  <EnergyCostSlider
                    label={tSettings("energy.diurno12h")}
                    value={energyCostDiurno}
                    defaultValue={ENERGY_DEFAULTS.energyCostDiurno}
                    onChange={setEnergyCostDiurno}
                    defaultLabel={tSettings("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCostDiurno.toFixed(1) })}
                    scaleLow={tSettings("energy.scaleLow")}
                    scaleHigh={tSettings("energy.scaleHigh")}
                  />
                  <EnergyCostSlider
                    label={tSettings("energy.noturno12h")}
                    value={energyCostNoturno}
                    defaultValue={ENERGY_DEFAULTS.energyCostNoturno}
                    onChange={setEnergyCostNoturno}
                    defaultLabel={tSettings("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCostNoturno.toFixed(1) })}
                    scaleLow={tSettings("energy.scaleLow")}
                    scaleHigh={tSettings("energy.scaleHigh")}
                  />
                  <EnergyCostSlider
                    label={tSettings("energy.plantao24h")}
                    value={energyCost24h}
                    defaultValue={ENERGY_DEFAULTS.energyCost24h}
                    onChange={setEnergyCost24h}
                    defaultLabel={tSettings("energy.defaultLabel", { value: ENERGY_DEFAULTS.energyCost24h.toFixed(1) })}
                    scaleLow={tSettings("energy.scaleLow")}
                    scaleHigh={tSettings("energy.scaleHigh")}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}
                  icon={<ChevronLeft className="w-4 h-4" />}>
                  {t("back")}
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting}
                  onClick={async () => {
                    const valid = await trigger();
                    if (!valid && (errors.minimumMonthlyGoal || errors.idealMonthlyGoal || errors.averageShiftValue)) {
                      setStep(1);
                    }
                  }}>
                  {t("submit")}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
