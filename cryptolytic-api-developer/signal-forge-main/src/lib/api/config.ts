/**
 * Runtime configuration for the Indicator API.
 * The base URL is never hardcoded across the app — it comes from env.
 * (VITE_API_BASE_URL is the Vite equivalent of NEXT_PUBLIC_API_BASE_URL.)
 */
export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? ""
).replace(/\/+$/, "");

export const API_CONFIGURED = API_BASE_URL.length > 0;

export const ENDPOINTS = {
  calculate: "/api/v1/indicators/calculate",
  indicators: "/api/v1/indicators",
  status: "/api/v1/status",
  usage: "/api/v1/usage",
  keys: "/api/v1/api-keys",
  login: "/api/v1/auth/login",
  register: "/api/v1/auth/register",
  me: "/api/v1/auth/me",
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
