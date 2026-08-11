import { useEffect, useState } from "react";
import { useAuth, useAuthHydrated, type AuthUser, type UserProfile } from "./auth";

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

/** Outcome of a refresh attempt — drives the 401 handling below. */
type RefreshOutcome = "ok" | "unauthorized" | "unreachable";

// Single-flight refresh: the backend rotates the session (the old refresh
// token is revoked), so concurrent 401s must share one in-flight refresh —
// otherwise the second call would fail with the already-rotated token.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function attemptRefresh(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) return "unauthorized";

  try {
    const res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    // 429 / 5xx / network flake ≠ invalid credentials — keep the session so a
    // Render cold start or a rate-limit burst doesn't log users out (only
    // explicit 401/403 means the refresh token itself is dead).
    if (res.status >= 500 || res.status === 429) return "unreachable";
    if (!res.ok) return "unauthorized";

    const body = (await res.json()) as ApiEnvelope<{
      user?: AuthUser;
      tokens: { accessToken: string; refreshToken: string };
    }>;
    if (
      body.success !== true ||
      !body.data?.tokens?.accessToken ||
      !body.data.tokens.refreshToken
    ) {
      return "unauthorized";
    }
    const { tokens, user } = body.data;
    const prev = useAuth.getState();
    useAuth.getState().setSession({
      user: user ?? prev.user, // refresh response may not include the user
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return "ok";
  } catch {
    return "unreachable";
  }
}

/**
 * Purge the invalid session and send the user back to the sign-in page.
 *
 * Never fires while already on /login or /register — redirecting from an auth
 * page to an auth page is exactly how the infinite /login ⇄ /market loop is
 * born. Guards only run this when leaving a protected page.
 */
function purgeSession() {
  useAuth.getState().clearSession();
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/register")) return;
  // Preserve the current path so login can send them back after re-auth.
  const dest = encodeURIComponent(path + window.location.search);
  window.location.replace(`/login?redirect=${dest}`);
}

async function request<T>(
  path: string,
  init?: RequestInit,
  opts: { purge?: boolean } = {},
): Promise<T> {
  const purge = opts.purge !== false; // default: hard-purge + redirect
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
  // The refresh outcome decides the fate of the session:
  //   - "ok"            → retry with the fresh token; a second 401 means the
  //                       session was revoked server-side → purge.
  //   - "unauthorized"  → the refresh token is dead → purge (or silent clear
  //                       when purge is disabled, e.g. during boot validation).
  //   - "unreachable"   → backend flake / cold start → keep the session and
  //                       surface the original 401 to the caller.
  if (res.status === 401 && !AUTH_PATHS.has(path)) {
    const outcome = await attemptRefresh();
    if (outcome === "ok") {
      token = useAuth.getState().accessToken;
      res = await doFetch(token);
    }
    if (res.status === 401 || outcome === "unauthorized") {
      if (purge) purgeSession();
      else useAuth.getState().clearSession();
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

// ---------------------------------------------------------------------------
// Logged-in devices (Settings)
// ---------------------------------------------------------------------------

/** A signed-in device session, as returned by GET /api/sessions. */
export type DeviceSession = {
  id: string;
  userAgent: string;
  ip: string;
  /** True when this session issued the current request (this browser tab). */
  current: boolean;
  createdAt: string;
  expiresAt: string;
};

/** Device/session management — backed by the sessions table in Postgres. */
export const sessionsApi = {
  list: () => api.get<DeviceSession[]>("/sessions"),
  revoke: (id: string) => api.delete<{ revoked: boolean }>(`/sessions/${encodeURIComponent(id)}`),
  revokeOthers: () => api.post<{ revoked: boolean }>("/sessions/revoke-others", {}),
};

/**
 * Validate the persisted session against /api/me on boot. The guards call
 * this once per page load before deciding to redirect, which closes the
 * /login ⇄ /market loop caused by a stale token in localStorage:
 *
 *   - /me 200          → session is real; user + profile are hydrated → true
 *   - /me 401          → token invalid → session cleared silently → false
 *   - network error    → backend cold start → session KEPT → true (never log
 *                        users out just because Render is waking up)
 *   - >8s timeout      → treat as cold start → session KEPT → true
 *
 * Never hard-redirects — navigation is the guard's job.
 */
export async function validateSession(): Promise<boolean> {
  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 8000));
  try {
    const me = await Promise.race([
      request<MeResponse>("/me", undefined, { purge: false }).catch((err: unknown) =>
        err instanceof ApiError ? err : new ApiError("NETWORK_ERROR", "request failed", 0),
      ),
      timeout,
    ]);
    if (me === "timeout") return true;
    if (me instanceof ApiError) {
      if (me.status === 401) {
        useAuth.getState().clearSession();
        return false;
      }
      return true; // any other HTTP error — keep the session
    }
    // Valid: hydrate user + profile in one shot (the sidebar/navbar reads
    // these), so the console doesn't need a second /me call on mount.
    useAuth.getState().applyMe({ user: me.user, profile: me.profile });
    return true;
  } catch {
    return true; // transport error — keep the session
  }
}

// ---------------------------------------------------------------------------
// Session gate — the single source of truth for route guards
// ---------------------------------------------------------------------------

export type SessionGate = { loading: boolean; authed: boolean };

// One validation per token per 60s window, shared by every mounted guard
// (AppShell, /login, /register). The resolved promise stays cached for the TTL
// so console page navigations (which remount AppShell) don't fire a /me burst;
// it re-validates only when the stored token changes (e.g. right after
// signing in) or the window expires.
const SESSION_VALIDATE_TTL_MS = 60_000;
let sessionValidation: Promise<boolean> | null = null;
let lastValidatedToken: string | null | undefined;
let sessionValidatedAt = 0;

function getSessionValidation(token: string | null): Promise<boolean> {
  const now = Date.now();
  if (
    lastValidatedToken !== token ||
    !sessionValidation ||
    now - sessionValidatedAt > SESSION_VALIDATE_TTL_MS
  ) {
    lastValidatedToken = token;
    sessionValidatedAt = now;
    sessionValidation = validateSession();
  }
  return sessionValidation;
}

/**
 * Route-guard hook. `loading` stays true until (a) zustand has hydrated the
 * persisted session from localStorage AND (b) that session has been checked
 * against the backend. Only when `loading` flips false is it safe for a guard
 * to redirect — deciding earlier is what bounces signed-in users to /login
 * while /login bounces them back: the infinite redirect loop.
 */
export function useSessionGate(): SessionGate {
  const hydrated = useAuthHydrated();
  const accessToken = useAuth((s) => s.accessToken);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!hydrated) return; // keep loading until storage hydration settles
    if (!accessToken) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getSessionValidation(accessToken).then((ok) => {
      if (cancelled) return;
      setAuthed(ok);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, accessToken]);

  return { loading, authed };
}

const HEALTH_URL = apiUrl("/health");

// ---------------------------------------------------------------------------
// Finnhub research data (server-side key, cached by the backend)
// ---------------------------------------------------------------------------

export type FinnhubEventKind = "economic" | "earnings";

export type FinnhubEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or ""
  event: string;
  country: string;
  symbol: string;
  kind: FinnhubEventKind;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
};

export type FinnhubEvents = {
  source: "economic" | "earnings" | "unavailable";
  events: FinnhubEvent[];
};

export type CompanyFundamentals = {
  symbol: string;
  peTTM: number;
  peAnnual: number;
  epsTTM: number;
  epsGrowth3Y: number;
  revenueGrowth3Y: number;
  revenueGrowthTTMYoy: number;
  dividendYield: number;
  beta: number;
  roeTTM: number;
  grossMargin: number;
  currentRatio: number;
  week52High: number;
  week52Low: number;
  week52HighDate: string;
  week52LowDate: string;
  updated: string;
};

export type FinnhubNewsHeadline = {
  id: number;
  category: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  related: string;
  time: number; // unix seconds
};

export const finnhubApi = {
  /** Upcoming events — macro economic calendar (paid plan) ⇄ earnings (free). */
  events: () => api.get<FinnhubEvents>("/finnhub/events"),
  /** Company fundamentals for one supported stock symbol. */
  fundamentals: (symbol: string) =>
    api.get<CompanyFundamentals>(`/finnhub/fundamentals?symbol=${encodeURIComponent(symbol)}`),
  /** Recent general market headlines. */
  news: () => api.get<FinnhubNewsHeadline[]>("/finnhub/news"),
};

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
