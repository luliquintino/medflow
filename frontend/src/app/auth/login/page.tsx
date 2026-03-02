"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  Mail,
  Lock,
  User,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  Watch,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Tab = "login" | "register" | "forgot";

// ─── Left panel benefits ──────────────────────────────────────────
const benefits = [
  {
    icon: TrendingUp,
    title: "Controle financeiro",
    desc: "Veja quanto ganha por plantão e acompanhe suas metas mensais em tempo real",
  },
  {
    icon: Clock,
    title: "Gestão de plantões",
    desc: "Organize sua agenda médica com clareza e evite conflitos de horário",
  },
  {
    icon: ShieldCheck,
    title: "Motor de risco",
    desc: "Receba alertas de burnout personalizados antes que o problema apareça",
  },
  {
    icon: Watch,
    title: "Wearables integrados",
    desc: "Monitore HRV, sono e recuperação durante seus plantões com precisão",
  },
];

// ─── Schemas ──────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome muito curto"),
    crm: z.string().min(4, "CRM inválido"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

const forgotSchema = z.object({ email: z.string().email("E-mail inválido") });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type ForgotData = z.infer<typeof forgotSchema>;

// ─── ECG decoration ───────────────────────────────────────────────
function EcgLine() {
  return (
    <svg
      viewBox="0 0 320 48"
      className="w-full opacity-25"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0 30 L40 30 L50 8 L60 44 L72 14 L82 40 L92 30 L130 30 L140 8 L150 44 L162 14 L172 40 L182 30 L320 30" />
    </svg>
  );
}

// ─── Login form ───────────────────────────────────────────────────
function LoginForm({ onForgot }: { onForgot: () => void }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginData) {
    try {
      setError("");
      const res = await api.post("/auth/login", data);
      const { user, accessToken, refreshToken } = unwrap<any>(res);
      setAuth(user, accessToken, refreshToken);
      router.push(user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in">
      <Input
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        {...register("email")}
      />
      <div className="space-y-1.5">
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-moss-600 hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}

// ─── Register form ────────────────────────────────────────────────
function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  async function onSubmit({ confirmPassword, ...data }: RegisterData) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in">
      <Input
        label="Nome completo"
        placeholder="Dr. João Silva"
        leftIcon={<User className="w-4 h-4" />}
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="CRM"
        placeholder="Ex: 123456/SP"
        leftIcon={<FileText className="w-4 h-4" />}
        error={errors.crm?.message}
        {...register("crm")}
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
  );
}

// ─── Forgot password form ─────────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) });

  async function onSubmit(data: ForgotData) {
    try {
      setError("");
      await api.post("/auth/forgot-password", data);
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8 animate-in">
        <div className="w-16 h-16 rounded-full bg-moss-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-moss-500" />
        </div>
        <h3 className="font-semibold text-gray-800 text-lg mb-2">
          Verifique seu e-mail
        </h3>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
          Se o e-mail estiver cadastrado, você receberá o link de recuperação em instantes.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-moss-600 font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-in">
      <p className="text-sm text-gray-500">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>
      <Input
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        {...register("email")}
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Enviar link de recuperação
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-moss-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </button>
    </form>
  );
}

// ─── Inner component (uses useSearchParams — needs Suspense) ──────
function AuthInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("login");

  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["login", "register", "forgot"].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "login", label: "Entrar" },
    { id: "register", label: "Cadastrar" },
  ];

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* ── Left panel ─────────────────────────────── */}
      <div className="relative lg:w-[45%] flex-shrink-0 bg-gradient-to-br from-moss-800 via-moss-700 to-moss-600 overflow-hidden">
        {/* Mobile: compact logo header */}
        <div className="flex lg:hidden items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">Med Flow</span>
            <p className="text-moss-200 text-xs mt-0.5">Seu copiloto de plantões</p>
          </div>
        </div>

        {/* Desktop: full benefits panel */}
        <div className="hidden lg:flex flex-col min-h-dvh px-10 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl leading-none">Med Flow</span>
              <p className="text-moss-200 text-xs mt-0.5">Seu copiloto de plantões</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h1 className="text-[2rem] font-bold text-white leading-tight mb-3">
              Gestão inteligente<br />
              para médicos<br />
              de plantão
            </h1>
            <p className="text-moss-200 text-sm leading-relaxed max-w-xs">
              Controle financeiro, gestão de agenda e monitoramento de saúde reunidos em um só lugar.
            </p>
          </div>

          {/* Benefit cards */}
          <div className="flex flex-col gap-3 flex-1">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 bg-white/10 rounded-2xl px-4 py-3.5 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <b.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{b.title}</p>
                  <p className="text-moss-200 text-xs mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ECG decoration at bottom */}
          <div className="mt-10">
            <EcgLine />
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-28 -right-28 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* ── Right panel ────────────────────────────── */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-6 pt-8 pb-12 lg:py-12 bg-cream-50">
        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">
              {tab === "forgot" ? "Recuperar senha" : "Bem-vindo"}
            </h2>
            {tab !== "forgot" && (
              <p className="text-sm text-gray-500 mt-1">
                {tab === "login"
                  ? "Entre na sua conta para continuar"
                  : "Comece a gerenciar seus plantões com mais clareza"}
              </p>
            )}
          </div>

          {/* Tab switcher */}
          {tab !== "forgot" && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    tab === t.id
                      ? "bg-white text-moss-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Forms */}
          {tab === "login" && <LoginForm onForgot={() => setTab("forgot")} />}
          {tab === "register" && <RegisterForm />}
          {tab === "forgot" && <ForgotForm onBack={() => setTab("login")} />}
        </div>
      </div>
    </div>
  );
}

// ─── Page (Suspense for useSearchParams) ─────────────────────────
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-cream-50">
          <div className="w-8 h-8 border-2 border-moss-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthInner />
    </Suspense>
  );
}
