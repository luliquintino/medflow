"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, getErrorMessage } from "@/lib/api";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

// ─── Inner component ──────────────────────────────────────────────
function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!token) {
      setError("Token inválido ou ausente.");
      return;
    }
    try {
      setError("");
      await api.post("/auth/reset-password", {
        token,
        password: data.password,
      });
      setSuccess(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-cream-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-moss-600 flex items-center justify-center mb-3 shadow-float">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-moss-800">Med Flow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seu copiloto de plantões</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-cream-200 p-8">
          {!token ? (
            /* Invalid / missing token */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Link inválido</h2>
              <p className="text-sm text-gray-500 mb-6">
                Este link de recuperação é inválido ou já foi utilizado.
              </p>
              <button
                onClick={() => router.push("/auth/login?tab=forgot")}
                className="text-sm text-moss-600 font-medium hover:underline"
              >
                Solicitar novo link
              </button>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-moss-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-moss-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Senha alterada!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Sua senha foi atualizada com sucesso. Faça login para continuar.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push("/auth/login")}
              >
                Entrar na minha conta
              </Button>
            </div>
          ) : (
            /* Form */
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Nova senha
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Escolha uma nova senha segura para sua conta.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nova senha"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  {...register("password")}
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  placeholder="Repita a nova senha"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Salvar nova senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-cream-50">
          <div className="w-8 h-8 border-2 border-moss-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
