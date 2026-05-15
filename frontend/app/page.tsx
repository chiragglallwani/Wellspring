"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginPage } from "@/views/LoginPage";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { sessionReady, isAuthenticated } = useAuth();

  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      router.replace("/programs");
    }
  }, [sessionReady, isAuthenticated, router]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <LoginPage />;
}
