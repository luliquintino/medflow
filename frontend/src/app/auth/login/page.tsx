"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      setError("");
      const res = await api.post("/auth/login", data);
      const { user, accessToken, refreshToken } = unwrap<any>(res);
      setAuth(user, accessToken, refreshToken);
      if (!user.onboardingCompleted) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-moss-600 flex items-center justify-center mb-3 shadow-float">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-moss-800">Med Flow</h1>
          <p className="text-sm text-gray-500 mt-1">Seu copiloto de plantões</p>
        </div>

        <div className="bg-cream-50 rounded-3xl shadow-card border border-cream-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-gray-500 mb-6">Entre na sua conta para continuar</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register("password")}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-moss-600 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{" "}
            <Link href="/auth/register" className="text-moss-600 font-medium hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 bg-moss-50 rounded-xl p-3 border border-moss-100 text-center">
          <p className="text-xs text-moss-700">
            Demo: <strong>ana@demo.com</strong> · senha: <strong>Demo1234!</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
