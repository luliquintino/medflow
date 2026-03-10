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
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");

    if (!token || !refresh) {
      router.replace("/auth/login");
      return;
    }

    setTokens(token, refresh);

    api
      .get("/users/me", { headers: { Authorization: `Bearer ${token}` } })
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
