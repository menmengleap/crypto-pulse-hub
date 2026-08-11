import type { APIKey, IndicatorRequest, IndicatorResponse, UsageStats } from "@/types/indicator";
import { ENDPOINTS } from "./config";
import { apiFetch, authFetch, setSession, type RequestResult } from "./client";

export function calculateIndicators(
  request: IndicatorRequest,
): Promise<RequestResult<IndicatorResponse>> {
  return apiFetch<IndicatorResponse>(ENDPOINTS.calculate, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export interface ApiStatus {
  status: string;
  version?: string;
}

export async function fetchStatus(): Promise<ApiStatus> {
  return (await apiFetch<ApiStatus>(ENDPOINTS.status, { method: "GET", auth: false })).data;
}

export async function fetchUsage(range = "7d"): Promise<UsageStats> {
  return (await apiFetch<UsageStats>(`${ENDPOINTS.usage}?range=${encodeURIComponent(range)}`)).data;
}

export async function fetchApiKeys(): Promise<APIKey[]> {
  const { data } = await apiFetch<APIKey[] | { keys: APIKey[] }>(ENDPOINTS.keys);
  return Array.isArray(data) ? data : (data.keys ?? []);
}

export async function createApiKey(name: string): Promise<APIKey & { secret?: string }> {
  const { data } = await apiFetch<APIKey & { secret?: string }>(ENDPOINTS.keys, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiFetch<unknown>(`${ENDPOINTS.keys}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Shared auth backend (Crypto Pulse Hub Go API)
//
// Login/Register hit the same backend (and therefore the same Postgres
// database) as the main platform. The backend answers with a
// { success, data, error } envelope containing a JWT access token plus a
// rotating refresh token; the session is stored in sessionStorage.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; refreshToken: string | null; user: AuthUser }> {
  const result = await authFetch<AuthResult>(ENDPOINTS.login, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession({
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
  });
  return {
    token: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    user: result.user,
  };
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<{ token?: string }> {
  const result = await authFetch<AuthResult>(ENDPOINTS.register, {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  if (result?.tokens?.accessToken) {
    setSession({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });
    return { token: result.tokens.accessToken };
  }
  return {};
}

/** Revoke the session server-side so the refresh token is invalidated too. */
export async function logout(refreshToken: string): Promise<void> {
  await authFetch<{ loggedOut: boolean }>(ENDPOINTS.logout, {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
