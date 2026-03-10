"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { clsx } from "clsx";
import type { User } from "@/types";

const SHIFT_TYPES = [
  { value: "TWELVE_HOURS", label: "12 horas", desc: "Plantão diurno" },
  { value: "TWENTY_FOUR_HOURS", label: "24 horas", desc: "Plantão completo" },
  { value: "NIGHT", label: "Noturno", desc: "Plantão noturno" },
];

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const schema = z.object({
  minimumMonthlyGoal: z.coerce.number().min(0),
  idealMonthlyGoal: z.coerce.number().min(0),
  savingsGoal: z.coerce.number().min(0),
  averageShiftValue: z.coerce.number().min(0),
  shiftTypes: z.array(z.string()).min(1, "Selecione ao menos um tipo"),
  maxWeeklyHours: z.coerce.number().optional(),
  preferredRestDays: z.array(z.number()).optional(),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(schema) as any,
      defaultValues: {
        minimumMonthlyGoal: 0,
        idealMonthlyGoal: 0,
        savingsGoal: 0,
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
          savingsGoal: data.savingsGoal,
          averageShiftValue: data.averageShiftValue,
        },
        work: {
          shiftTypes: data.shiftTypes,
          maxWeeklyHours: data.maxWeeklyHours || undefined,
          preferredRestDays: data.preferredRestDays,
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
            <h1 className="text-xl font-bold text-moss-800">Vamos começar</h1>
            <p className="text-sm text-gray-500">Passo {step} de 2</p>
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
                <h2 className="text-lg font-semibold text-gray-800">Perfil financeiro</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Essas informações nos ajudam a calcular quantos plantões você precisa fazer.
                </p>
              </div>

              <Input
                label="Meta mensal mínima (R$)"
                type="number"
                placeholder="Ex: 8000"
                hint="O mínimo que você precisa ganhar por mês"
                {...register("minimumMonthlyGoal")}
                error={errors.minimumMonthlyGoal?.message}
              />

              <Input
                label="Meta mensal ideal (R$)"
                type="number"
                placeholder="Ex: 15000"
                hint="Quanto você gostaria de ganhar por mês"
                {...register("idealMonthlyGoal")}
                error={errors.idealMonthlyGoal?.message}
              />

              <Input
                label="Meta de reserva/poupança mensal (R$)"
                type="number"
                placeholder="Ex: 2000"
                {...register("savingsGoal")}
                error={errors.savingsGoal?.message}
              />

              <Input
                label="Valor médio por plantão (R$)"
                type="number"
                placeholder="Ex: 1500"
                {...register("averageShiftValue")}
                error={errors.averageShiftValue?.message}
              />

              <Button type="button" className="w-full" onClick={async () => {
                  const valid = await trigger(["minimumMonthlyGoal", "idealMonthlyGoal", "savingsGoal", "averageShiftValue"]);
                  if (valid) setStep(2);
                }}
                icon={<ChevronRight className="w-4 h-4" />}>
                Próximo
              </Button>
            </div>
          )}

          {/* Step 2 — Work profile */}
          {step === 2 && (
            <div className="bg-cream-50 rounded-3xl shadow-card border border-cream-200 p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Perfil de trabalho</h2>
                <p className="text-sm text-gray-500 mt-1">Como você costuma trabalhar?</p>
              </div>

              {/* Shift types */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Tipos de plantão que você faz
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_TYPES.map(({ value, label, desc }) => (
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
                      <div className="font-semibold">{label}</div>
                      <div className={clsx("text-xs mt-0.5", shiftTypes?.includes(value) ? "text-moss-100" : "text-gray-400")}>{desc}</div>
                    </button>
                  ))}
                </div>
                {errors.shiftTypes && <p className="text-xs text-red-500 mt-1">{errors.shiftTypes.message}</p>}
              </div>

              {/* Weekly limit */}
              <Input
                label="Limite máximo de horas semanais (opcional)"
                type="number"
                placeholder="Ex: 60"
                hint="Seu limite pessoal de segurança"
                {...register("maxWeeklyHours")}
              />

              {/* Rest days */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Dias preferenciais de descanso
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, i) => (
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
                      {day}
                    </button>
                  ))}
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
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting}
                  onClick={async () => {
                    const valid = await trigger();
                    if (!valid && (errors.minimumMonthlyGoal || errors.idealMonthlyGoal || errors.savingsGoal || errors.averageShiftValue)) {
                      setStep(1);
                    }
                  }}>
                  Começar a usar
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
