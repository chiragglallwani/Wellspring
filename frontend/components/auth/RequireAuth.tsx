"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { sessionReady, isAuthenticated } = useAuth();

  useEffect(() => {
    if (sessionReady && !isAuthenticated) {
      router.replace("/");
    }
  }, [sessionReady, isAuthenticated, router]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
