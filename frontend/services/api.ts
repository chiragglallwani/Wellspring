import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { getAccessToken, getCsrfToken } from "@/lib/tokenStore";
import { refreshAuthTokens } from "./authSession";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8080";

export const API_ROOT = `${baseURL}/api/v1`;

export const api = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function normalizeRequestPath(url: string): string {
  const noQuery = url.includes("?") ? url.slice(0, url.indexOf("?")) : url;
  return noQuery.startsWith("/") ? noQuery.slice(1) : noQuery;
}

export function isPublicAuthPath(url: string): boolean {
  const path = normalizeRequestPath(url);
  if (
    path === "auth/login" ||
    path === "auth/signup" ||
    path === "auth/refresh"
  ) {
    return true;
  }
  return path.startsWith("auth/password-reset/");
}

function setRequestHeader(
  config: InternalAxiosRequestConfig,
  name: string,
  value: string,
) {
  const headers = config.headers ?? {};
  if (typeof headers.set === "function") {
    headers.set(name, value);
  } else {
    (headers as Record<string, string>)[name] = value;
  }
  config.headers = headers;
}

function clearRequestHeader(config: InternalAxiosRequestConfig, name: string) {
  const headers = config.headers ?? {};
  if (typeof headers.delete === "function") {
    headers.delete(name);
  } else {
    delete (headers as Record<string, string>)[name];
  }
  config.headers = headers;
}

/** Let the browser set multipart boundary; default JSON Content-Type breaks multer. */
function applyMultipartHeaders(config: InternalAxiosRequestConfig) {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    clearRequestHeader(config, "Content-Type");
  }
}

function attachAuthHeaders(config: InternalAxiosRequestConfig) {
  const url = typeof config.url === "string" ? config.url : "";
  if (isPublicAuthPath(url)) return;

  const token = getAccessToken();
  if (token) {
    setRequestHeader(config, "Authorization", `Bearer ${token}`);
  }

  const csrf = getCsrfToken();
  if (csrf) {
    setRequestHeader(config, "csrf_token", csrf);
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  applyMultipartHeaders(config);
  attachAuthHeaders(config);
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (
      !config ||
      config._authRetry ||
      status !== 401 ||
      isPublicAuthPath(config.url ?? "")
    ) {
      return Promise.reject(error);
    }

    const refreshed = await refreshAuthTokens();
    if (refreshed) {
      config._authRetry = true;
      attachAuthHeaders(config);
      return api.request(config);
    }

    return Promise.reject(error);
  },
);
