"use client";

import { useState, useEffect } from "react";
import {
  Leaf,
  LayoutList,
  Calendar,
  FileUp,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Page } from "@/types/types";
import { useRouter } from "next/navigation";
import { logout } from "@/services/auth";

export function Sidebar() {
  const [currentPage, setCurrentPage] = useState<Page>("programs");
  const router = useRouter();
  const navItems = [
    { id: "programs" as Page, label: "Programs", icon: LayoutList },
    { id: "sessions" as Page, label: "Sessions", icon: Calendar },
    { id: "csv" as Page, label: "CSV Upload", icon: FileUp },
    { id: "audit" as Page, label: "Audit Log", icon: Activity },
  ];

  useEffect(() => {
    const path = window.location.pathname;
    const page = path.split("/")[1] as Page;
    queueMicrotask(() => {
      setCurrentPage(page);
    });
  }, []);

  function handleLogout() {
    void logout();
    router.push("/");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-sidebar border-r border-border flex flex-col py-8 z-50">
      <div className="px-6 mb-10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <Leaf className="w-6 h-6" fill="currentColor" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-primary">
            Wellspring
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            Creator Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                router.push(`/${item.id}`);
              }}
              className={cn(
                "w-full px-6 py-3 flex items-center gap-3 border-l-4 transition-all duration-200 group text-left",
                isActive
                  ? "border-primary bg-primary/5 text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:bg-primary/5 hover:text-primary",
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-primary",
                )}
              />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-6 mt-auto">
        <Button
          variant="destructive"
          className="w-full h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
