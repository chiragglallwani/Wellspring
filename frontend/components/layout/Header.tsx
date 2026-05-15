"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export function Header() {
  const user = useSelector((s: RootState) => s.auth.userInfo);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const initials = useMemo(() => {
    const name = user?.name ?? "";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const displayName = mounted ? (user?.name ?? "—") : "—";
  const displayTenant = mounted ? user?.tenantName : undefined;
  const displayInitials = mounted ? initials || "?" : "?";

  return (
    <header className="sticky top-0 w-full h-16 z-40 bg-background/80 backdrop-blur-sm border-b border-border ml-[280px] max-w-[calc(100%-280px)]">
      <div className="flex justify-between items-center px-10 h-full">
        <div className="flex items-center gap-4 flex-1" />

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-border">
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{displayName}</p>
              {displayTenant ? (
                <p className="text-[10px] text-muted-foreground font-medium">
                  {displayTenant}
                </p>
              ) : null}
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-accent border border-border shadow-sm">
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-accent-foreground">
                {displayInitials}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
