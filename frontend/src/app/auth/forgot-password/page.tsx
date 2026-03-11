"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function createSchema(tv: (key: string) => string) {
  return z.object({
    email: z.string().email(tv("emailInvalidAccented")),
  });
}

type FormData = z.infer<ReturnType<typeof createSchema>>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const t = useTranslations("auth.forgotPassword");
  const tv = useTranslations("validation");

  const schema = useMemo(() => createSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      setError("");
      const res = await api.post("/auth/forgot-password", { email: data.email });
      const url = res.data?.data?.resetUrl || res.data?.resetUrl || null;
      if (url) {
        setResetUrl(url);
        setSuccess(true);
      } else {
        setError(t("emailNotFound"));
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Med Flow" width={112} height={112} className="mb-3" />
          <h1 className="text-2xl font-bold text-moss-800">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-card border border-cream-200 p-8">
          {success && resetUrl ? (
            /* Success state — show reset link */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-moss-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-moss-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {t("successTitle")}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {t("successDescription")}
              </p>
              <Link
                href={resetUrl.replace(/^https?:\/\/[^/]+/, '')}
                className="inline-flex items-center justify-center w-full gap-2 bg-moss-600 text-white font-medium text-sm px-4 py-3 rounded-xl hover:bg-moss-700 transition-colors mb-4"
              >
                {t("resetMyPassword")}
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm text-moss-600 font-medium hover:text-moss-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("backToLogin")}
              </Link>
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
                <Input
                  label={t("emailLabel")}
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email?.message}
                  {...register("email")}
                />

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
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

              <div className="text-center mt-6">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-moss-600 font-medium hover:text-moss-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
