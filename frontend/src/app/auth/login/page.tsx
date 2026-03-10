"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Mail } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import type { User } from "@/types";

const loginSchema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(1, "Senha obrigatoria"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setError("");
    try {
      const res = await api.post("/auth/login", data);
      const payload = res.data.data || res.data;

      const accessToken = payload.accessToken;
      const refreshToken = payload.refreshToken;
      const user: User = payload.user;

      setTokens(accessToken, refreshToken);
      setUser(user);

      router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Med Flow" width={112} height={112} className="mb-3" />
          <h1 className="text-2xl font-bold text-moss-800">Med Flow</h1>
          <p className="text-sm text-gray-500 mt-1">Entre na sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <PasswordInput
              label="Senha"
              placeholder="Sua senha"
              error={errors.password?.message}
              {...register("password")}
            />

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Entrar
            </Button>

            <div className="text-right mt-2">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-moss-600 font-medium hover:text-moss-700 transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Nao tem conta?{" "}
            <Link
              href="/auth/register"
              className="text-moss-600 font-medium hover:text-moss-700 transition-colors"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
