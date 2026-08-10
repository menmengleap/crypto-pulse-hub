import { useEffect, useState } from "react";
import { useAuth, type AuthUser } from "./auth";

/**
 * Client for the Cryptolytic Go backend.
 *
 * The backend wraps every response in an envelope:
 *   { "success": true,  "data": {...}, "meta": {...} }
 *   { "success": false, "error": { "code": "...", "message": "..." } }
 *
 * In development the Vite dev server proxies `/api/*` to the Go API, so the
 * browser talks to the same origin and never hits CORS. In production
 * (separate frontend/backend services) point VITE_API_BASE at the backend
 * origin without a path prefix, e.g. https://cryptolytic-api.onrender.com
 * (the same convention social-auth.tsx uses) — every request is then built as
 * {origin}/api{path}, e.g. …/api/live/markets.
 */
const RAW_BASE = (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "";

/** Backend origin without a trailing "/api" (normalized). */
const API_ORIGIN = RAW_BASE.replace(/\/+$/, "").replace(/\/api$/i, "");

/** Build an API URL: "/api<path>" on the origin (or the dev proxy). */
function apiUrl(path: string): string {
  return API_ORIGIN ? `${API_ORIGIN}/api${path}` : `/api${path}`;
}

type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };
type ApiFailure = {
  success: false;
  error: { code: string; message: string };
  data?: unknown;
};
type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly data: unknown;

  constructor(code: string, message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the session access token when present.
  const token = useAuth.getState().accessToken;
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  let body: ApiEnvelope<T> | undefined;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = undefined;
  }

  if (!res.ok || body === undefined || body.success === false) {
    const error =
      body !== undefined && body.success === false
        ? body.error
        : { code: "HTTP_ERROR", message: `Request failed (${res.status})` };
    const data = body !== undefined && body.success === false ? body.data : undefined;
    throw new ApiError(error.code, error.message, res.status, data);
  }

  return body.data;
}

/** Typed helpers mirroring the backend routes. */
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export type BackendStatus = "connecting" | "online" | "offline";

/** Response shape of GET /api/me. */
export type MeResponse = {
  user: AuthUser;
  profile: { displayName: string; bio: string; avatarUrl: string };
  preferences: Record<string, unknown>;
};

const HEALTH_URL = apiUrl("/health");

/**
 * Polls the backend health endpoint so the UI can reflect whether the API is
 * reachable, and keeps the Render free-tier instance warm between visits
 * (it spins down after ~15 min idle). Works whether BASE is the Vite proxy
 * ("/api") or an absolute backend origin
 * (VITE_API_BASE=https://cryptolytic-api.onrender.com →
 * https://cryptolytic-api.onrender.com/api/health). Returns "connecting" until
 * the first check resolves. 45s is well inside the requested 30–60s window.
 */
export function useBackendHealth(intervalMs = 45_000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("connecting");

  useEffect(() => {
    let disposed = false;

    const check = async () => {
      let next: BackendStatus;
      try {
        const res = await fetch(HEALTH_URL, { cache: "no-store" });
        next = res.ok ? "online" : "offline";
      } catch {
        next = "offline";
      }
      if (!disposed) setStatus(next);
    };

    void check();
    const id = window.setInterval(() => void check(), intervalMs);
    return () => {
      disposed = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
