import { useEffect, useState } from "react";
import { useAuth, type AuthUser, type UserProfile } from "./auth";

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

// ---------------------------------------------------------------------------
// 401 handling — automatic token refresh + purge
// ---------------------------------------------------------------------------

/**
 * Endpoints that must never trigger the refresh flow (they're the ones that
 * create/rotate tokens, and a 401 there means the credentials themselves are
 * bad — purging is correct).
 */
const AUTH_PATHS = new Set(["/auth/refresh", "/auth/login", "/auth/register", "/auth/logout"]);

// Single-flight refresh: the backend rotates the session (the old refresh
// token is revoked), so concurrent 401s must share one in-flight refresh —
// otherwise the second call would fail with the already-rotated token.
let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) return false;

  try {
    const res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const body = (await res.json()) as ApiEnvelope<{
      user?: AuthUser;
      tokens: { accessToken: string; refreshToken: string };
    }>;
    if (
      body.success !== true ||
      !body.data?.tokens?.accessToken ||
      !body.data.tokens.refreshToken
    ) {
      return false;
    }
    const { tokens, user } = body.data;
    const prev = useAuth.getState();
    useAuth.getState().setSession({
      user: user ?? prev.user, // refresh response may not include the user
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

/** Purge the invalid session and send the user back to the sign-in page. */
function purgeSession() {
  useAuth.getState().clearSession();
  // Avoid a redirect loop if the user is already on an auth page; otherwise
  // preserve the current path so login can send them back after re-auth.
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const dest = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?redirect=${dest}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = (token: string | null) =>
    fetch(apiUrl(path), {
      ...init,
      // Cross-origin Render frontend ⇄ backend: send cookies if the backend ever
      // sets them (CORS_ORIGINS is the explicit origin, so credentials are
      // allowed). Harmless for the current Bearer-token flow.
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

  // Attach the session access token when present.
  let token = useAuth.getState().accessToken;
  let res = await doFetch(token);

  // Access token expired mid-session: refresh once, then retry the request.
  // If the refresh token is also invalid — or the retry still 401s (session
  // revoked server-side) — drop the session and redirect to the sign-in page.
  if (res.status === 401 && !AUTH_PATHS.has(path)) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      token = useAuth.getState().accessToken;
      res = await doFetch(token);
      if (res.status === 401) {
        purgeSession();
      }
    } else {
      purgeSession();
    }
  }

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
  profile: UserProfile;
  preferences: Record<string, unknown>;
};

/**
 * Fetch the authenticated user + profile from the backend and hydrate the auth
 * store. Call once after login/OAuth and on console mount so the sidebar and
 * navbar always show real database data (name, avatar, member-since date).
 */
export async function refreshMe(): Promise<MeResponse> {
  const me = await api.get<MeResponse>("/me");
  useAuth.getState().applyMe({ user: me.user, profile: me.profile });
  return me;
}

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
        const res = await fetch(HEALTH_URL, { cache: "no-store", credentials: "include" });
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
