"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import Image from "next/image";
import {
  LayoutDashboard, Calendar, AlertTriangle,
  Zap, Settings, LogOut, Building2, Brain, BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const NAV = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "Meu Painel" },
  { href: "/hospitals",      icon: Building2,       label: "Hospitais" },
  { href: "/shifts",         icon: Calendar,        label: "Plantões" },
  { href: "/analytics",      icon: BarChart3,       label: "Analytics" },
  { href: "/smart-planner",  icon: Brain,           label: "Planejamento" },
  { href: "/simulate",       icon: Zap,             label: "Aceito ou Não?" },
  { href: "/risk-history",   icon: AlertTriangle,   label: "Histórico de Risco" },
  { href: "/settings",       icon: Settings,        label: "Configurações" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, refreshToken } = useAuthStore();

  async function handleLogout() {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // Ignore errors — we log out locally regardless
    }
    logout();
    router.replace("/auth/login");
  }

  return (
    <>
      {/* Mobile backdrop overlay — tap to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 h-full w-60 bg-cream-50 border-r border-cream-200 flex flex-col z-30 shadow-sm",
          "transition-transform duration-300 ease-in-out",
          // Desktop: always visible
          "lg:translate-x-0",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Med Flow" width={64} height={64} />
            <span className="font-semibold text-moss-800 text-lg">Med Flow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-moss-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-moss-50 hover:text-moss-700"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-cream-200">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-moss-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-moss-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user?.gender === "MALE" ? "Dr. " : user?.gender === "FEMALE" ? "Dra. " : ""}{user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
