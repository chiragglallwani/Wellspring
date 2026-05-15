"use client";

import { useMemo } from "react";
import { Provider } from "react-redux";
import { getStore } from "@/store";
import { AuthProvider } from "@/components/providers/AuthProvider";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => getStore(), []);

  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
