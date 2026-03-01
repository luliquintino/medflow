"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirects to the unified auth page with the forgot tab active
export default function ForgotPasswordPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/login?tab=forgot");
  }, [router]);
  return null;
}
