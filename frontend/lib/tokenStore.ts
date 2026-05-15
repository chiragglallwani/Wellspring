/** In-memory access + CSRF tokens (never localStorage / sessionStorage / document.cookie). */
let accessToken: string | null = null;
let csrfToken: string | null = null;

export function setAuthTokens(access: string, csrf: string) {
  accessToken = access;
  csrfToken = csrf;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function hasAuthTokens(): boolean {
  return Boolean(accessToken && csrfToken);
}

export function clearAuthTokens() {
  accessToken = null;
  csrfToken = null;
}
