"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { User as UserIcon, Mail, FileText } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import type { User } from "@/types";

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome obrigatorio"),
    crm: z.string().regex(
      /^\d{1,6}\/(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i,
      "CRM inválido. Use o formato: 123456/UF",
    ),
    gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional(),
    email: z.string().email("E-mail invalido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Deve conter maiúscula, minúscula e número"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterForm) {
    setError("");
    try {
      const res = await api.post("/auth/register", {
        name: data.name,
        crm: data.crm,
        email: data.email,
        password: data.password,
        gender: data.gender || undefined,
      });
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
    <div className="min-h-dvh bg-cream-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Med Flow" width={112} height={112} className="mb-3" />
          <h1 className="text-2xl font-bold text-moss-800">Med Flow</h1>
          <p className="text-sm text-gray-500 mt-1">Crie sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              placeholder="Maria Silva"
              leftIcon={<UserIcon className="w-4 h-4" />}
              error={errors.name?.message}
              {...register("name")}
            />

            <div>
              <Input
                label="CRM"
                placeholder="123456/SP"
                leftIcon={<FileText className="w-4 h-4" />}
                error={errors.crm?.message}
                {...register("crm")}
              />
              {!errors.crm && (
                <p className="text-xs text-gray-400 mt-1">Formato: numero/UF (ex: 123456/SP)</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Genero <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                {...register("gender")}
                className="w-full rounded-xl border border-cream-300 bg-white/70 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-moss-400 focus:border-transparent transition-all duration-200"
              >
                <option value="">Prefiro nao informar</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
                <option value="NON_BINARY">Nao-binario</option>
                <option value="PREFER_NOT_TO_SAY">Prefiro nao dizer</option>
              </select>
            </div>

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
              placeholder="Mínimo 8 caracteres"
              error={errors.password?.message}
              {...register("password")}
            />

            <PasswordInput
              label="Confirmar senha"
              placeholder="Repita a senha"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
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
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Ja tem conta?{" "}
            <Link
              href="/auth/login"
              className="text-moss-600 font-medium hover:text-moss-700 transition-colors"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
