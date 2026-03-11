"use client";
import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { api, getErrorMessage } from "@/lib/api";

function createSchema(tv: (key: string) => string) {
  return z
    .object({
      password: z
        .string()
        .min(8, tv("minChars"))
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, tv("passwordComplexity")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: tv("passwordsMismatchAccented"),
      path: ["confirmPassword"],
    });
}

type FormData = z.infer<ReturnType<typeof createSchema>>;

// ─── Inner component ──────────────────────────────────────────────
function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations("auth.resetPassword");
  const tv = useTranslations("validation");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const schema = useMemo(() => createSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!token) {
      setError(t("invalidToken"));
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
          <Image src="/logo.png" alt="Med Flow" width={112} height={112} className="mb-3" />
          <h1 className="text-xl font-bold text-moss-800">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-cream-200 p-8">
          {!token ? (
            /* Invalid / missing token */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{t("invalidLinkTitle")}</h2>
              <p className="text-sm text-gray-500 mb-6">
                {t("invalidLinkDescription")}
              </p>
              <button
                onClick={() => router.push("/auth/forgot-password")}
                className="text-sm text-moss-600 font-medium hover:underline"
              >
                {t("requestNewLink")}
              </button>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-moss-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-moss-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{t("successTitle")}</h2>
              <p className="text-sm text-gray-500 mb-6">
                {t("successDescription")}
              </p>
              <Button
                className="w-full"
                onClick={() => router.push("/auth/login")}
              >
                {t("successButton")}
              </Button>
            </div>
          ) : (
            /* Form */
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {t("heading")}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {t("description")}
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <PasswordInput
                  label={t("newPasswordLabel")}
                  placeholder={t("newPasswordPlaceholder")}
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
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  {t("submit")}
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
