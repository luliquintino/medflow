"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { PageSpinner } from "@/components/ui/spinner";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    } else if (!user?.onboardingCompleted) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return <PageSpinner />;
}
