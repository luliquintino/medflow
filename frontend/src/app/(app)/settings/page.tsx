"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, User, Shield, Check, Star } from "lucide-react";
import { api, unwrap, getErrorMessage } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { clsx } from "clsx";
import type { Subscription } from "@/types";

const PLANS = [
  {
    id: "ESSENTIAL" as const,
    name: "Essencial",
    price: "R$ 29",
    period: "/mês",
    description: "Para médicos que querem organizar seus plantões",
    features: [
      "Dashboard financeiro completo",
      "Gestão de plantões",
      "Risk Engine básico",
      "Simulador financeiro",
      "Projeção de 6 meses",
    ],
    highlight: false,
  },
  {
    id: "PRO" as const,
    name: "Pro",
    price: "R$ 59",
    period: "/mês",
    description: "Para médicos que querem cuidar de tudo — inclusive da saúde",
    features: [
      "Tudo do Essencial",
      "Integração com wearables",
      "Histórico de risco acumulado",
      "Relatórios avançados",
      "HRV, sono e recuperação",
      "Suporte prioritário",
    ],
    highlight: true,
  },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get("/subscription").then((r) => unwrap<Subscription>(r)),
  });

  async function handleCheckout(plan: "ESSENTIAL" | "PRO") {
    try {
      setLoadingPlan(plan);
      const res = await api.post("/subscription/checkout", { plan });
      const { url } = unwrap<{ url: string }>(res);
      if (url) window.open(url, "_blank");
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    try {
      setPortalLoading(true);
      const res = await api.post("/subscription/portal");
      const { url } = unwrap<{ url: string }>(res);
      if (url) window.open(url, "_blank");
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlan = sub?.plan || "ESSENTIAL";
  const isActive = sub?.status === "ACTIVE" || sub?.status === "TRIALING";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Configurações</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta e assinatura</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-moss-600" />
            Perfil
          </CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-moss-200 flex items-center justify-center">
            <span className="text-lg font-bold text-moss-700">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Current subscription status */}
      {sub && (
        <Card className="bg-moss-50 border-moss-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-moss-600" />
              Assinatura atual
            </CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-moss-800">
                Plano {currentPlan === "PRO" ? "Pro" : "Essencial"}
              </p>
              <p className="text-sm text-moss-600 mt-0.5 capitalize">
                Status: {sub.status === "TRIALING"
                  ? "Trial gratuito"
                  : sub.status === "ACTIVE"
                  ? "Ativo"
                  : sub.status === "PAST_DUE"
                  ? "Pagamento pendente"
                  : sub.status}
              </p>
              {sub.currentPeriodEnd && (
                <p className="text-xs text-moss-500 mt-1">
                  Renova em {new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}
                </p>
              )}
              {sub.trialEndAt && sub.status === "TRIALING" && (
                <p className="text-xs text-moss-500 mt-1">
                  Trial termina em {new Date(sub.trialEndAt).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            {isActive && sub.stripeSubscriptionId && (
              <Button
                variant="secondary"
                size="sm"
                loading={portalLoading}
                onClick={handlePortal}
              >
                Gerenciar
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-moss-600" />
          Planos disponíveis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={clsx(
                  "rounded-2xl border p-6 relative transition-all",
                  plan.highlight
                    ? "bg-moss-600 border-moss-600 text-white shadow-float"
                    : "bg-cream-50 border-cream-200"
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> Recomendado
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h4 className={clsx("font-bold text-lg", plan.highlight ? "text-white" : "text-gray-800")}>
                    {plan.name}
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={clsx("text-3xl font-bold", plan.highlight ? "text-white" : "text-moss-700")}>
                      {plan.price}
                    </span>
                    <span className={clsx("text-sm", plan.highlight ? "text-moss-200" : "text-gray-400")}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={clsx("text-sm mt-2", plan.highlight ? "text-moss-100" : "text-gray-500")}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={clsx("w-4 h-4 flex-shrink-0", plan.highlight ? "text-moss-200" : "text-moss-500")} />
                      <span className={plan.highlight ? "text-moss-100" : "text-gray-600"}>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent && isActive ? (
                  <div className={clsx("text-center text-sm font-medium py-2.5 rounded-xl",
                    plan.highlight ? "bg-white/20 text-white" : "bg-moss-100 text-moss-700")}>
                    ✓ Plano atual
                  </div>
                ) : (
                  <Button
                    variant={plan.highlight ? "ghost" : "primary"}
                    className={clsx("w-full", plan.highlight && "bg-white text-moss-700 hover:bg-moss-50")}
                    loading={loadingPlan === plan.id}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {currentPlan === plan.id ? "Gerenciar" : `Assinar ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
