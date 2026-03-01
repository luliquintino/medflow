"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Mail, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, getErrorMessage } from "@/lib/api";

const schema = z.object({ email: z.string().email("E-mail inválido") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      setError("");
      await api.post("/auth/forgot-password", data);
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-moss-600 flex items-center justify-center mb-3 shadow-float">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-moss-800">Med Flow</h1>
        </div>

        <div className="bg-cream-50 rounded-3xl shadow-card border border-cream-200 p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-moss-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Verifique seu e-mail</h2>
              <p className="text-sm text-gray-500 mb-6">
                Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.
              </p>
              <Link href="/auth/login" className="text-moss-600 text-sm font-medium hover:underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Recuperar senha</h2>
              <p className="text-sm text-gray-500 mb-6">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email?.message}
                  {...register("email")}
                />
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Enviar link
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link href="/auth/login" className="text-moss-600 hover:underline">
                  Voltar para o login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
