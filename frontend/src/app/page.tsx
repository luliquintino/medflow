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
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

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

function HeroMockup() {
  const t = useTranslations("landing.heroMockup");
  const [visibleSteps, setVisibleSteps] = useState(0);

  const FLOW_STEPS = [
    { icon: CalendarDays, titleKey: "step1Title" as const, detailKey: "step1Detail" as const, gradient: "from-moss-500 to-moss-600", delay: 400 },
    { icon: TrendingUp, titleKey: "step2Title" as const, detailKey: "step2Detail" as const, gradient: "from-emerald-500 to-emerald-600", delay: 1200 },
    { icon: Shield, titleKey: "step3Title" as const, detailKey: "step3Detail" as const, gradient: "from-amber-500 to-amber-600", delay: 2000 },
    { icon: CircleCheck, titleKey: "step4Title" as const, detailKey: "step4Detail" as const, gradient: "from-sky-500 to-sky-600", delay: 2800 },
  ];

  useEffect(() => {
    const timers = FLOW_STEPS.map((step, i) =>
      setTimeout(() => setVisibleSteps(i + 1), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full">
      <div className="space-y-3">
        {FLOW_STEPS.map(({ icon: Icon, titleKey, detailKey, gradient }, idx) => (
          <div key={titleKey} className="relative">
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
                <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{t(titleKey)}</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">{t(detailKey)}</p>
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
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");

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

  const FEATURES = [
    { icon: TrendingUp, titleKey: "financeTitle", descKey: "financeDesc", accent: "from-emerald-500 to-emerald-600" },
    { icon: Shield, titleKey: "burnoutTitle", descKey: "burnoutDesc", accent: "from-amber-500 to-amber-600" },
    { icon: Brain, titleKey: "planningTitle", descKey: "planningDesc", accent: "from-sky-500 to-sky-600" },
    { icon: Heart, titleKey: "sustainabilityTitle", descKey: "sustainabilityDesc", accent: "from-rose-500 to-rose-600" },
  ] as const;

  const STEPS = [
    { icon: UserPlus, titleKey: "step1Title", descKey: "step1Desc" },
    { icon: Sliders, titleKey: "step2Title", descKey: "step2Desc" },
    { icon: CalendarDays, titleKey: "step3Title", descKey: "step3Desc" },
  ] as const;

  const PROBLEMS = [
    { icon: Clock, titleKey: "noTimeTitle", descKey: "noTimeDesc", gradient: "from-orange-500 to-amber-500" },
    { icon: Target, titleKey: "darkGoalsTitle", descKey: "darkGoalsDesc", gradient: "from-red-500 to-rose-500" },
    { icon: Activity, titleKey: "burnoutTitle", descKey: "burnoutDesc", gradient: "from-violet-500 to-purple-500" },
  ] as const;

  const BENEFITS_KEYS = [
    "clearIncome", "burnoutAlerts", "financeSim",
    "customGoals", "fullHistory", "intuitiveUI",
  ] as const;

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
            <button onClick={() => scrollTo("recursos")} className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors tracking-wide uppercase">{t("nav.features")}</button>
            <button onClick={() => scrollTo("como-funciona")} className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors tracking-wide uppercase">{t("nav.howItWorks")}</button>
            <div className="flex items-center gap-3 ml-4">
              <LanguageSwitcher />
              <button onClick={() => router.push("/auth/login")} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">{t("nav.login")}</button>
              <Button size="sm" className="rounded-full px-6 shadow-none" onClick={() => router.push("/auth/register")}>{t("nav.startFree")}</Button>
            </div>
          </div>

          <button className="md:hidden p-2 -mr-2 text-gray-600" onClick={() => setMobileMenu(!mobileMenu)} aria-label={t("nav.menu")}>
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-gray-200 px-6 pb-5 space-y-1">
            <button onClick={() => { scrollTo("recursos"); setMobileMenu(false); }} className="block w-full text-left text-sm font-medium text-gray-600 py-3">{t("nav.features")}</button>
            <button onClick={() => { scrollTo("como-funciona"); setMobileMenu(false); }} className="block w-full text-left text-sm font-medium text-gray-600 py-3">{t("nav.howItWorks")}</button>
            <div className="flex items-center gap-3 py-3">
              <LanguageSwitcher />
            </div>
            <div className="flex gap-3 pt-3">
              <Button variant="secondary" size="sm" className="flex-1 rounded-full" onClick={() => router.push("/auth/login")}>{t("nav.login")}</Button>
              <Button size="sm" className="flex-1 rounded-full" onClick={() => router.push("/auth/register")}>{t("nav.startFree")}</Button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO                                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-40 lg:pb-32 px-6 lg:px-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-moss-100/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-40 w-[400px] h-[400px] rounded-full bg-emerald-50/50 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          <div className="max-w-3xl mx-auto lg:mx-0 lg:max-w-none lg:flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <Image src="/logo.png" alt="Med Flow" width={100} height={100} className="mb-6 drop-shadow-xl" priority />

            <h1 className="text-5xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.05] mb-4">
              <span className="text-gray-900">Med</span>{" "}
              <span className="text-moss-600">Flow</span>
            </h1>

            <p className="text-xl sm:text-2xl font-medium text-gray-800 mb-3">
              {t("hero.tagline")}
            </p>

            <p className="text-base sm:text-lg text-gray-500 max-w-xl mb-8 leading-relaxed">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-8">
              <Button
                size="lg"
                className="rounded-full text-[15px] h-[54px] px-8 shadow-[0_4px_16px_rgba(77,114,53,0.3)]"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => router.push("/auth/register")}
              >
                {t("hero.startNow")}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full text-[15px] h-[54px] px-8 bg-white border-gray-200 hover:bg-gray-50"
                onClick={() => router.push("/auth/login")}
              >
                {t("hero.haveAccount")}
              </Button>
            </div>

            <div className="flex items-center justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-moss-500" />
                <span className="font-semibold text-gray-800">{t("hero.freePercent")}</span>
                <span className="text-gray-400">{t("hero.free")}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:w-[420px] xl:w-[460px] shrink-0 mt-12 lg:mt-0">
            <HeroMockup />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  PROBLEM                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Reveal className="py-16 sm:py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left mb-12">
            <p className="text-xs font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">{t("problems.sectionLabel")}</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              {t("problems.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PROBLEMS.map(({ icon: Icon, titleKey, descKey, gradient }) => (
              <div key={titleKey} className="relative bg-white rounded-2xl border border-gray-100 p-8 group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{t(`problems.${titleKey}`)}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">{t(`problems.${descKey}`)}</p>
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
            <p className="text-xs font-semibold text-moss-600 tracking-[0.15em] uppercase mb-3">{t("features.sectionLabel")}</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              {t("features.title")}
            </h2>
            <p className="text-gray-500 max-w-lg text-[15px]">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, titleKey, descKey, accent }) => (
              <div
                key={titleKey}
                className="group bg-[#fafaf7] rounded-2xl border border-gray-100 p-8 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{t(`features.${titleKey}`)}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">{t(`features.${descKey}`)}</p>
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
            <p className="text-xs font-semibold text-moss-600 tracking-[0.15em] uppercase mb-3">{t("steps.sectionLabel")}</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              {t("steps.title")}
            </h2>
            <p className="text-gray-500 max-w-lg text-[15px]">
              {t("steps.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ icon: Icon, titleKey, descKey }, idx) => (
              <div key={titleKey} className="relative">
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
                  <h3 className="font-semibold text-gray-900 text-[15px] mb-2">{t(`steps.${titleKey}`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`steps.${descKey}`)}</p>
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
                {t("benefits.title")}
              </h2>
              <p className="text-gray-500 text-[15px]">
                {t("benefits.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BENEFITS_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5">
                  <div className="w-6 h-6 rounded-full bg-moss-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{t(`benefits.${key}`)}</span>
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
                {t("cta.title")}
              </h2>
              <p className="text-moss-100/70 mb-10 max-w-lg mx-auto text-base sm:text-lg leading-relaxed">
                {t("cta.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full bg-white text-moss-700 hover:bg-gray-50 border-none h-[54px] px-10 text-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => router.push("/auth/register")}
                >
                  {t("cta.createFreeAccount")}
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
            <Link href="#" className="hover:text-gray-600 transition-colors">{t("footer.terms")}</Link>
            <Link href="#" className="hover:text-gray-600 transition-colors">{t("footer.privacy")}</Link>
          </div>
          <p className="text-xs text-gray-400">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
