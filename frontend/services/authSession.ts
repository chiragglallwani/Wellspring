import axios, { type AxiosResponse } from "axios";

import { getApiErrorMessage } from "@/lib/apiError";
import { clearAuthTokens, setAuthTokens } from "@/lib/tokenStore";
import type { StoredAuthProfile } from "@/types/types";
import { getStore } from "@/store";
import { userLogin, userLogout } from "@/store/slices/authSlice";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8080";

const API_ROOT = `${baseURL}/api/v1`;

const refreshClient = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

type AuthTokenPayload = {
  accessToken: string;
  csrfToken: string;
  user?: {
    userFullName: string;
    userEmail: string;
    tenantName: string;
  };
};

function mapUser(raw: AuthTokenPayload["user"]): StoredAuthProfile | null {
  if (!raw) return null;
  return {
    name: raw.userFullName,
    email: raw.userEmail,
    tenantName: raw.tenantName,
  };
}

function applyAuthResponse(res: AxiosResponse): boolean {
  const data = res.data?.data as AuthTokenPayload | undefined;
  if (!data?.accessToken || !data?.csrfToken) {
    return false;
  }
  setAuthTokens(data.accessToken, data.csrfToken);
  const profile = mapUser(data.user);
  if (profile) {
    getStore().dispatch(userLogin({ userInfo: profile }));
  }
  return true;
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const res = await refreshClient.post("/auth/refresh", {});
    return applyAuthResponse(res);
  } catch {
    clearAuthTokens();
    getStore().dispatch(userLogout());
    return false;
  }
}

/** Restore session after full page reload using the httpOnly refresh cookie on the API host. */
export async function restoreSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Called when a protected request returns 401 (expired access token). */
export function refreshAuthTokens(): Promise<boolean> {
  return restoreSession();
}

export function clearSession() {
  clearAuthTokens();
  getStore().dispatch(userLogout());
}

export async function restoreSessionWithError(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const ok = await restoreSession();
    return { ok };
  } catch (error) {
    return { ok: false, error: getApiErrorMessage(error) };
  }
}
