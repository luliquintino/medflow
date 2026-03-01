"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirects to the unified auth page with the register tab active
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/login?tab=register");
  }, [router]);
  return null;
}
