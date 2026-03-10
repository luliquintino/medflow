"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Bell, Menu } from "lucide-react";

export function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

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
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Med Flow"
          width={32}
          height={32}
          className="lg:hidden"
        />
        {isDashboard && (
          <h1 className="text-lg font-semibold text-gray-800">Meu Painel</h1>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="relative w-9 h-9 rounded-xl bg-cream-100 hover:bg-cream-200 flex items-center justify-center transition-colors"
          aria-label="Notificações"
          title="Em breve"
        >
          <Bell className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
