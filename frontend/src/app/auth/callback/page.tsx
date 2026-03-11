"use client";
import { Suspense } from "react";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api, unwrap } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import type { User } from "@/types";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");

    // Support legacy token params for backwards compatibility
    const legacyToken = searchParams.get("token");
    const legacyRefresh = searchParams.get("refresh");

    if (legacyToken && legacyRefresh) {
      // Legacy flow: tokens directly in URL
      setTokens(legacyToken, legacyRefresh);
      api
        .get("/users/me", { headers: { Authorization: `Bearer ${legacyToken}` } })
        .then((r) => {
          const user = unwrap<User>(r);
          setUser(user);
          router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
        })
        .catch(() => router.replace("/auth/login"));
      return;
    }

    if (!code) {
      router.replace("/auth/login");
      return;
    }

    // Exchange auth code for tokens
    api
      .post("/auth/exchange-code", { code })
      .then((r) => {
        const data = r.data?.data || r.data;
        const { accessToken, refreshToken } = data;
        setTokens(accessToken, refreshToken);

        return api.get("/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      })
      .then((r) => {
        const user = unwrap<User>(r);
        setUser(user);
        router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
      })
      .catch(() => router.replace("/auth/login"));
  }, [searchParams, router, setTokens, setUser]);

  return <PageSpinner />;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
