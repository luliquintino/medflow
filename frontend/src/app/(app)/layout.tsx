"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/store/auth.store";
import { PageSpinner } from "@/components/ui/spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return; // Wait until Zustand rehydrates from localStorage
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (user && !user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, user, router, _hasHydrated]);

  // Show spinner while hydrating or if not authenticated
  if (!_hasHydrated || !isAuthenticated) return <PageSpinner />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-60">
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
