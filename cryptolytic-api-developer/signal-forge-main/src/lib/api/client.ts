import type { APIError } from "@/types/indicator";
import { AUTH_CONFIGURED, API_CONFIGURED, apiAuthUrl, apiUrl } from "./config";

const TOKEN_KEY = "cryptolytic.session";

/** Persisted session — access token plus the rotating refresh token. */
interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
}

function readSession(): StoredSession {
  if (typeof window === "undefined") return { accessToken: "", refreshToken: null };
  try {
    const raw = window.sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return { accessToken: "", refreshToken: null };
    const parsed: unknown = JSON.parse(raw);
    // Legacy value: a plain token string stored before refresh tokens existed.
    if (typeof parsed === "string") return { accessToken: parsed, refreshToken: null };
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof (parsed as StoredSession).accessToken === "string"
    ) {
      const session = parsed as StoredSession;
      return {
        accessToken: session.accessToken,
        refreshToken: typeof session.refreshToken === "string" ? session.refreshToken : null,
      };
    }
    return { accessToken: "", refreshToken: null };
  } catch {
    return { accessToken: "", refreshToken: null };
  }
}

function writeSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  try {
    if (session.accessToken) {
      window.sessionStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({ accessToken: session.accessToken, refreshToken: session.refreshToken }),
      );
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY);
    }
    window.dispatchEvent(new Event("cryptolytic:auth"));
  } catch {
    /* storage unavailable */
  }
}

/** Session token is kept in sessionStorage only — never API secrets. */
export function getToken(): string | null {
  return readSession().accessToken || null;
}

/** Refresh token issued by the shared auth backend, or null. */
export function getRefreshToken(): string | null {
  return readSession().refreshToken;
}

/** Persist a full session (access + refresh). An empty access token clears it. */
export function setSession(session: { accessToken: string; refreshToken?: string | null }) {
  writeSession({ accessToken: session.accessToken, refreshToken: session.refreshToken ?? null });
}

/**
 * Backwards-compatible single-token setter used by sign-out and legacy callers.
 * Preserves the stored refresh token when replacing the access token.
 */
export function setToken(token: string | null) {
  const previous = readSession();
  writeSession({
    accessToken: token ?? "",
    refreshToken: token ? previous.refreshToken : null,
  });
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(error: APIError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

const STATUS_CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  413: "payload_too_large",
  422: "validation_error",
  429: "rate_limited",
  500: "internal_server_error",
};

export interface RequestResult<T> {
  data: T;
  status: number;
  elapsedMs: number;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<RequestResult<T>> {
  if (!API_CONFIGURED) {
    throw new ApiRequestError({
      status: 0,
      code: "api_not_configured",
      message:
        "No API base URL is configured. Set VITE_API_BASE_URL to your Indicator API host to enable live requests.",
    });
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (init.auth !== false) {
    const token = getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new ApiRequestError({
      status: 0,
      code: "network_error",
      message:
        "The Indicator API could not be reached. Check the API base URL and that the service is running.",
    });
  }
  const elapsedMs = Math.round(
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - started,
  );

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const body = (parsed ?? {}) as { message?: string; error?: string; detail?: unknown };
    throw new ApiRequestError({
      status: response.status,
      code: STATUS_CODES[response.status] ?? "request_failed",
      message:
        body.message ??
        body.error ??
        `Request failed with status ${response.status} ${response.statusText}`.trim(),
      details: body.detail ?? parsed,
    });
  }

  return { data: parsed as T, status: response.status, elapsedMs };
}

// ---------------------------------------------------------------------------
// Shared auth backend (Crypto Pulse Hub Go API)
// ---------------------------------------------------------------------------

/** The Go backend wraps every response in a { success, data, error } envelope. */
interface AuthEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/**
 * Fetches against the shared auth backend (VITE_AUTH_API_BASE_URL), unwraps its
 * envelope and throws ApiRequestError on failure. This is the same API the main
 * platform signs in against, so accounts live in the same database.
 */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!AUTH_CONFIGURED) {
    throw new ApiRequestError({
      status: 0,
      code: "auth_api_not_configured",
      message:
        "No shared auth backend is configured. Set VITE_AUTH_API_BASE_URL to your Crypto Pulse Hub API host.",
    });
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  let response: Response;
  try {
    response = await fetch(apiAuthUrl(path), { ...init, headers });
  } catch {
    throw new ApiRequestError({
      status: 0,
      code: "network_error",
      message:
        "The shared auth backend could not be reached. Check VITE_AUTH_API_BASE_URL and that the API is running.",
    });
  }

  const text = await response.text();
  let parsed: AuthEnvelope<T> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as AuthEnvelope<T>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok || !parsed || parsed.success !== true) {
    throw new ApiRequestError({
      status: response.status,
      code: parsed?.error?.code ?? STATUS_CODES[response.status] ?? "request_failed",
      message:
        parsed?.error?.message ??
        `Request failed with status ${response.status} ${response.statusText}`.trim(),
      details: parsed,
    });
  }

  return parsed.data as T;
}
