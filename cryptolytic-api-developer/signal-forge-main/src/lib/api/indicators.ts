import type {
  APIKey,
  IndicatorRequest,
  IndicatorResponse,
  UsageStats,
} from "@/types/indicator";
import { ENDPOINTS } from "./config";
import { apiFetch, type RequestResult } from "./client";

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

export async function login(email: string, password: string): Promise<{ token: string }> {
  const { data } = await apiFetch<{ token: string }>(ENDPOINTS.login, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  return data;
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<{ token?: string }> {
  const { data } = await apiFetch<{ token?: string }>(ENDPOINTS.register, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password, name }),
  });
  return data;
}
