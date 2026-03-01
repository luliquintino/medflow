"use client";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/shifts":       "Meus Plantões",
  "/finance":      "Financeiro",
  "/simulate":     "Aceito ou Não?",
  "/risk-history": "Histórico de Risco",
  "/settings":     "Configurações",
};

export function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title =
    Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ??
    "Med Flow";

  return (
    <header className="h-16 bg-cream-50/80 backdrop-blur-sm border-b border-cream-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 rounded-xl bg-cream-100 hover:bg-cream-200 flex items-center justify-center transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          <p className="text-xs text-gray-500 hidden sm:block">
            Olá, {user?.name?.split(" ")[0]} 👋
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-xl bg-cream-100 hover:bg-cream-200 flex items-center justify-center transition-colors">
          <Bell className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
