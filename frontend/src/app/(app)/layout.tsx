"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/store/auth.store";
import { api, unwrap } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import type { User } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser, accessToken } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a token
    const raw = localStorage.getItem("medflow-auth");
    const token = raw ? JSON.parse(raw)?.state?.accessToken : null;

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    if (user) {
      setLoading(false);
      return;
    }

    api
      .get("/users/me")
      .then((r) => {
        const userData = unwrap<User>(r);
        setUser(userData);
        if (!userData.onboardingCompleted) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        router.replace("/auth/login");
      })
      .finally(() => setLoading(false));
  }, [user, setUser, router, accessToken]);

  if (loading) return <PageSpinner />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-60">
        <Topbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 px-4 py-5 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
