"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  Shield,
  Brain,
  Heart,
  ArrowRight,
  UserPlus,
  Sliders,
  CalendarDays,
  Sparkles,
  Menu,
  X,
  Check,
  Clock,
  Target,
  Activity,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Controle financeiro inteligente",
    description:
      "Saiba exatamente quantos plantões faltam para bater sua meta. Acompanhe receitas, simule cenários e tome decisões com dados reais.",
    accent: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Shield,
    title: "Proteção contra burnout",
    description:
      "Monitoramento contínuo da sua carga horária. Receba alertas antes de ultrapassar limites seguros e preserve sua saúde.",
    accent: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Brain,
    title: "Planejamento otimizado",
    description:
      "Simulações inteligentes que encontram o equilíbrio ideal entre rendimento financeiro e qualidade de vida.",
    accent: "from-sky-500 to-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: Heart,
    title: "Sustentabilidade profissional",
    description:
      "Custo energético personalizado por tipo de plantão e índice de sustentabilidade para manter sua carreira saudável.",
    accent: "from-rose-500 to-rose-600",
    bg: "bg-rose-50",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Crie sua conta",
    description: "Cadastro rápido com e-mail e senha. Sem burocracia, sem cartão.",
  },
  {
    icon: Sliders,
    title: "Configure seu perfil",
    description: "Defina suas metas financeiras, limites de carga e tipo de plantão.",
  },
  {
    icon: CalendarDays,
    title: "Gerencie tudo",
    description: "Registre plantões, acompanhe métricas e receba insights em tempo real.",
  },
];

/* ------------------------------------------------------------------ */
/*  Scroll animation                                                   */
/* ------------------------------------------------------------------ */

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useInView();
  return (
    <section ref={ref} id={id} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}>
      {children}
    </section>
  );
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  Hero Mockup — animated value flow                                  */
/* ------------------------------------------------------------------ */

const FLOW_STEPS = [
  {
    icon: CalendarDays,
    title: "Registre seu plantão",
    detail: "UPA Centro — Noturno 12h — R$ 1.400",
    gradient: "from-moss-500 to-moss-600",
    delay: 400,
  },
  {
    icon: TrendingUp,
    title: "Cálculo automático",
    detail: "R$ 10.950 de R$ 15.000 — faltam 3 plantões",
    gradient: "from-emerald-500 to-emerald-600",
    delay: 1200,
  },
  {
    icon: Shield,
    title: "Alerta de proteção",
    detail: "Carga semanal: 52h — Risco moderado de burnout",
    gradient: "from-amber-500 to-amber-600",
    delay: 2000,
  },
  {
    icon: CircleCheck,
    title: "Meta batida!",
    detail: "Parabéns! Você atingiu sua meta com equilíbrio.",
    gradient: "from-sky-500 to-sky-600",
    delay: 2800,
  },
];

function HeroMockup() {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timers = FLOW_STEPS.map((step, i) =>
      setTimeout(() => setVisibleSteps(i + 1), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full">
      <div className="space-y-3">
        {FLOW_STEPS.map(({ icon: Icon, title, detail, gradient }, idx) => (
          <div key={title} className="relative">
            {/* Connector line */}
            {idx > 0 && (
              <div className={`absolute -top-3 left-5 w-px h-3 transition-all duration-500 ${idx < visibleSteps ? "bg-gray-200" : "bg-transparent"}`} />
            )}

            <div
              className={`flex items-start gap-4 bg-white rounded-2xl border p-5 transition-all duration-500 ${
                idx < visibleSteps
                  ? "opacity-100 translate-x-0 border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                  : "opacity-0 translate-x-6 border-transparent"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{title}</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">{detail}</p>
              </div>
              {idx < visibleSteps && (
                <div className={`ml-auto shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  idx === visibleSteps - 1 ? "bg-emerald-500 scale-110" : "bg-emerald-100"
                }`}>
                  <Check className={`w-3 h-3 ${idx === visibleSteps - 1 ? "text-white" : "text-emerald-600"}`} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("medflow-auth");
    const hasToken = raw ? JSON.parse(raw)?.state?.accessToken : null;
    if (hasToken) { router.replace("/dashboard"); } else { setChecking(false); }
  }, [router]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (checking) return <PageSpinner />;

  return (
    <div className="min-h-dvh bg-[#fafaf7] overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  NAVBAR                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-2xl border-b border-gray-200/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-[72px]">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Med Flow" width={28} height={28} />
            <span className="font-semibold text-gray-900 tracking-tight text-[17px]">Med Flow</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo("recursos")} className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors tracking-wide uppercase">Recursos</button>
            <button onClick={() => scrollTo("como-funciona")} className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors tracking-wide uppercase">Como funciona</button>
            <div className="flex items-center gap-3 ml-4">
              <button onClick={() => router.push("/auth/login")} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">Entrar</button>
              <Button size="sm" className="rounded-full px-6 shadow-none" onClick={() => router.push("/auth/register")}>Começar grátis</Button>
            </div>
          </div>

          <button className="md:hidden p-2 -mr-2 text-gray-600" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-gray-200 px-6 pb-5 space-y-1">
            <button onClick={() => { scrollTo("recursos"); setMobileMenu(false); }} className="block w-full text-left text-sm font-medium text-gray-600 py-3">Recursos</button>
            <button onClick={() => { scrollTo("como-funciona"); setMobileMenu(false); }} className="block w-full text-left text-sm font-medium text-gray-600 py-3">Como funciona</button>
            <div className="flex gap-3 pt-3">
              <Button variant="secondary" size="sm" className="flex-1 rounded-full" onClick={() => router.push("/auth/login")}>Entrar</Button>
              <Button size="sm" className="flex-1 rounded-full" onClick={() => router.push("/auth/register")}>Começar grátis</Button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO                                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-40 lg:pb-32 px-6 lg:px-10">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-moss-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-40 w-[400px] h-[400px] rounded-full bg-emerald-50/50 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          {/* ── Left: text content ── */}
          <div className="max-w-3xl mx-auto lg:mx-0 lg:max-w-none lg:flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <Image
              src="/logo.png"
              alt="Med Flow"
              width={100}
              height={100}
              className="mb-6 drop-shadow-xl"
              priority
            />

            <h1 className="text-5xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.05] mb-4">
              <span className="text-gray-900">Med</span>{" "}
              <span className="text-moss-600">Flow</span>
            </h1>

            <p className="text-xl sm:text-2xl font-medium text-gray-800 mb-3">
              Seu copiloto de plantões.
            </p>

            <p className="text-base sm:text-lg text-gray-500 max-w-xl mb-8 leading-relaxed">
              Organize suas metas, proteja sua saúde e trabalhe de forma
              sustentável — tudo em um só lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-8">
              <Button
                size="lg"
                className="rounded-full text-[15px] h-[54px] px-8 shadow-[0_4px_16px_rgba(77,114,53,0.3)]"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => router.push("/auth/register")}
              >
                Começar agora
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full text-[15px] h-[54px] px-8 bg-white border-gray-200 hover:bg-gray-50"
                onClick={() => router.push("/auth/login")}
              >
                Já tenho conta
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-moss-500" />
                <span className="font-semibold text-gray-800">100%</span>
                <span className="text-gray-400">gratuito</span>
              </div>
            </div>
          </div>

          {/* ── Right: animated mockup (desktop only) ── */}
          <div className="hidden lg:block lg:w-[420px] xl:w-[460px] shrink-0 mt-12 lg:mt-0">
            <HeroMockup />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  PROBLEM — "Você conhece essa realidade?"                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Reveal className="py-16 sm:py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left mb-12">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">O desafio</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Você conhece essa realidade?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Clock,
                title: "Sem tempo para se organizar",
                description: "Entre um plantão e outro, sobra pouco tempo para planejar finanças e cuidar da própria saúde.",
                gradient: "from-orange-500 to-amber-500",
              },
              {
                icon: Target,
                title: "Metas financeiras no escuro",
                description: "Sem saber quantos plantões precisa, você trabalha mais do que deveria — ou menos do que poderia.",
                gradient: "from-red-500 to-rose-500",
              },
              {
                icon: Activity,
                title: "Risco invisível de burnout",
                description: "A sobrecarga se acumula silenciosamente. Quando os sinais aparecem, já é tarde demais.",
                gradient: "from-violet-500 to-purple-500",
              },
            ].map(({ icon: Icon, title, description, gradient }) => (
              <div key={title} className="relative bg-white rounded-2xl border border-gray-100 p-8 group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  FEATURES                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Reveal id="recursos" className="py-16 sm:py-24 px-6 lg:px-10 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left mb-14">
            <p className="text-xs font-semibold text-moss-600 tracking-[0.15em] uppercase mb-3">Recursos</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-gray-500 max-w-lg text-[15px]">
              Ferramentas pensadas para médicos que dão plantão no Brasil — do recém-formado ao veterano.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, accent }) => (
              <div
                key={title}
                className="group bg-[#fafaf7] rounded-2xl border border-gray-100 p-8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HOW IT WORKS                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Reveal id="como-funciona" className="py-16 sm:py-24 px-6 lg:px-10 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left mb-14">
            <p className="text-xs font-semibold text-moss-600 tracking-[0.15em] uppercase mb-3">Como funciona</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Comece em 3 passos simples
            </h2>
            <p className="text-gray-500 max-w-lg text-[15px]">
              Em menos de 5 minutos você está com tudo configurado e pronto para usar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ icon: Icon, title, description }, idx) => (
              <div key={title} className="relative">
                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(100%-0.5rem)] w-[calc(100%-2rem)] h-px bg-gray-200 -translate-x-1/2 z-0" />
                )}

                <div className="relative bg-white rounded-2xl border border-gray-100 p-8 text-center z-10">
                  <div className="w-14 h-14 rounded-2xl bg-moss-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-5 shadow-[0_4px_12px_rgba(77,114,53,0.25)]">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-[15px] mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  BENEFITS                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Reveal className="py-16 sm:py-24 px-6 lg:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#fafaf7] to-white rounded-3xl border border-gray-100 p-8 sm:p-12 lg:p-16">
            <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
                O que você ganha com o Med Flow
              </h2>
              <p className="text-gray-500 text-[15px]">
                Tudo que um médico plantonista precisa para ter controle sobre sua carreira.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Visão clara de quanto ganha por mês",
                "Alertas inteligentes de risco de burnout",
                "Simulação de cenários financeiros",
                "Metas financeiras personalizadas",
                "Histórico completo de evolução",
                "Dashboard intuitivo e bonito",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5">
                  <div className="w-6 h-6 rounded-full bg-moss-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  FINAL CTA                                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Reveal className="py-16 sm:py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-moss-600 rounded-3xl p-10 sm:p-16 lg:p-20 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-moss-500/30 via-transparent to-moss-800/20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/3" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
                Pronto para trabalhar<br className="hidden sm:block" /> de forma mais inteligente?
              </h2>
              <p className="text-moss-100/70 mb-10 max-w-lg mx-auto text-base sm:text-lg leading-relaxed">
                Junte-se a centenas de médicos que já organizam seus plantões, cuidam da saúde e batem suas metas com o Med Flow.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full bg-white text-moss-700 hover:bg-gray-50 border-none h-[54px] px-10 text-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => router.push("/auth/register")}
                >
                  Criar conta gratuita
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  FOOTER                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 py-10 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Med Flow" width={22} height={22} />
            <span className="font-semibold text-gray-800 text-sm tracking-tight">Med Flow</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] text-gray-400">
            <Link href="#" className="hover:text-gray-600 transition-colors">Termos de uso</Link>
            <Link href="#" className="hover:text-gray-600 transition-colors">Privacidade</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Med Flow</p>
        </div>
      </footer>
    </div>
  );
}
