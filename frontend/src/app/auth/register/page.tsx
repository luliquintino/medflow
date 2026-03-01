"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, User, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const schema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit({ confirmPassword, ...data }: FormData) {
    try {
      setError("");
      const res = await api.post("/auth/register", data);
      const { user, accessToken, refreshToken } = unwrap<any>(res);
      setAuth(user, accessToken, refreshToken);
      router.push("/onboarding");
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
          <p className="text-sm text-gray-500 mt-1">14 dias grátis, sem cartão</p>
        </div>

        <div className="bg-cream-50 rounded-3xl shadow-card border border-cream-200 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Criar conta</h2>
          <p className="text-sm text-gray-500 mb-6">Comece a planejar seus plantões com mais clareza</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              placeholder="Dr. João Silva"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register("name")}
            />
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
              placeholder="Mínimo 8 caracteres"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
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
              Criar minha conta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{" "}
            <Link href="/auth/login" className="text-moss-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
