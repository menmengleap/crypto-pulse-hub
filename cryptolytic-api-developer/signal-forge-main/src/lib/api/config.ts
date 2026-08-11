/**
 * Runtime configuration for the Indicator API.
 * The base URL is never hardcoded across the app — it comes from env.
 * (VITE_API_BASE_URL is the Vite equivalent of NEXT_PUBLIC_API_BASE_URL.)
 */
export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? ""
).replace(/\/+$/, "");

export const API_CONFIGURED = API_BASE_URL.length > 0;

/**
 * Shared auth backend — the Crypto Pulse Hub Go API (Postgres-backed).
 *
 * Accounts registered/signed-in here live in the SAME database as the main
 * platform, so one email/password works across both products. When
 * VITE_AUTH_API_BASE_URL is not set it falls back to VITE_API_BASE_URL (useful
 * when the indicator host is the Go gateway itself, e.g. localhost:8080).
 */
const AUTH_BASE_EXPLICIT = Boolean(
  (import.meta.env["VITE_AUTH_API_BASE_URL"] as string | undefined)?.trim(),
);

export const AUTH_API_BASE_URL: string = (
  AUTH_BASE_EXPLICIT ? (import.meta.env["VITE_AUTH_API_BASE_URL"] as string) : API_BASE_URL
).replace(/\/+$/, "");

export const AUTH_CONFIGURED = AUTH_API_BASE_URL.length > 0;

/** True only when VITE_AUTH_API_BASE_URL was set explicitly (no fallback). */
export const AUTH_EXPLICIT = AUTH_BASE_EXPLICIT;

export const ENDPOINTS = {
  calculate: "/api/v1/indicators/calculate",
  indicators: "/api/v1/indicators",
  status: "/api/v1/status",
  usage: "/api/v1/usage",
  keys: "/api/v1/api-keys",

  // Shared backend auth (Crypto Pulse Hub Go API).
  login: "/api/auth/login",
  register: "/api/auth/register",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  me: "/api/me",
} as const;

export const LIMITS = {
  minCandles: 5,
  maxCandles: 5000,
  minIndicators: 1,
  maxIndicators: 12,
  maxBodyBytes: 2 * 1024 * 1024,
} as const;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Build a URL against the shared auth backend (Crypto Pulse Hub Go API). */
export function apiAuthUrl(path: string): string {
  return `${AUTH_API_BASE_URL}${path}`;
}
