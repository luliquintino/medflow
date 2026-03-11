"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { User as UserIcon, Mail, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import type { User } from "@/types";

function createRegisterSchema(tv: (key: string) => string) {
  return z
    .object({
      name: z.string().min(2, tv("nameRequired")),
      crm: z.string().regex(
        /^\d{1,6}\/(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i,
        tv("crmInvalid"),
      ),
      email: z.string().email(tv("emailInvalid")),
      password: z
        .string()
        .min(8, tv("minChars"))
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, tv("passwordComplexity")),
      confirmPassword: z.string().min(1, tv("confirmPassword")),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: tv("passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

type RegisterForm = z.infer<ReturnType<typeof createRegisterSchema>>;

export default function RegisterPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState("");
  const t = useTranslations("auth.register");
  const tv = useTranslations("validation");

  const registerSchema = useMemo(() => createRegisterSchema(tv), [tv]);

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
          <h1 className="text-2xl font-bold text-moss-800">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-cream-50 rounded-3xl shadow-float border border-cream-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t("nameLabel")}
              placeholder={t("namePlaceholder")}
              leftIcon={<UserIcon className="w-4 h-4" />}
              error={errors.name?.message}
              {...register("name")}
            />

            <div>
              <Input
                label={t("crmLabel")}
                placeholder={t("crmPlaceholder")}
                leftIcon={<FileText className="w-4 h-4" />}
                error={errors.crm?.message}
                {...register("crm")}
              />
              {!errors.crm && (
                <p className="text-xs text-gray-400 mt-1">{t("crmHint")}</p>
              )}
            </div>

            <Input
              label={t("emailLabel")}
              type="email"
              placeholder={t("emailPlaceholder")}
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <PasswordInput
              label={t("passwordLabel")}
              placeholder={t("passwordPlaceholder")}
              error={errors.password?.message}
              {...register("password")}
            />

            <PasswordInput
              label={t("confirmPasswordLabel")}
              placeholder={t("confirmPasswordPlaceholder")}
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
              {t("submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("hasAccount")}{" "}
            <Link
              href="/auth/login"
              className="text-moss-600 font-medium hover:text-moss-700 transition-colors"
            >
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
