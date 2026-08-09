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
 * origin, e.g. https://cryptolytic-api.onrender.com.
 */
const BASE = (import.meta.env["VITE_API_BASE"] as string | undefined) ?? "/api";

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
  const res = await fetch(`${BASE}${path}`, {
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

/**
 * Polls GET /api/health so the UI can reflect whether the backend API is
 * reachable. Returns "connecting" until the first check resolves.
 */
export function useBackendHealth(intervalMs = 15_000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("connecting");

  useEffect(() => {
    let disposed = false;

    const check = async () => {
      let next: BackendStatus;
      try {
        const res = await fetch(`${BASE}/health`, { cache: "no-store" });
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
