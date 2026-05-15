"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { restoreSession } from "@/services/authSession";

type AuthContextValue = {
  sessionReady: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  sessionReady: false,
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const userLoggedIn = useSelector(
    (state: RootState) => state.auth.userLoggedIn,
  );
  const [sessionReady, setSessionReady] = useState(false);

  const bootstrap = useCallback(async () => {
    await restoreSession();
    setSessionReady(true);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void bootstrap();
    });
  }, [bootstrap]);

  const value = useMemo(
    () => ({
      sessionReady,
      isAuthenticated: userLoggedIn,
    }),
    [sessionReady, userLoggedIn],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
