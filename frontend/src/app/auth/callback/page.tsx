"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, unwrap } from "@/lib/api";

// ─── Inner component ──────────────────────────────────────────────
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");

    if (!token || !refresh) {
      router.replace("/auth/login");
      return;
    }

    // Fetch user profile with the access token, then store auth state
    async function handleCallback() {
      try {
        const res = await api.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = unwrap<any>(res);
        setAuth(user, token!, refresh!);
        router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
      } catch {
        // If fetching profile fails, still store tokens and redirect
        setAuth(
          {
            id: "",
            name: "",
            email: "",
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
          },
          token!,
          refresh!
        );
        router.replace("/dashboard");
      }
    }

    handleCallback();
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-cream-50 gap-5">
      <div className="w-14 h-14 rounded-2xl bg-moss-600 flex items-center justify-center shadow-float">
        <Activity className="w-7 h-7 text-white" />
      </div>
      <div className="text-center">
        <p className="text-moss-700 font-semibold text-lg">Entrando com Google…</p>
        <p className="text-gray-400 text-sm mt-1">Aguarde um momento</p>
      </div>
      <div className="w-8 h-8 border-2 border-moss-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────
export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-cream-50">
          <div className="w-8 h-8 border-2 border-moss-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
