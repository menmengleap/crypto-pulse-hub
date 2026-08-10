import type { APIError } from "@/types/indicator";
import { API_CONFIGURED, apiUrl } from "./config";

const TOKEN_KEY = "cryptolutic.session";

/** Session token is kept in sessionStorage only — never API secrets. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("cryptolutic:auth"));
  } catch {
    /* storage unavailable */
  }
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
      message: "The Indicator API could not be reached. Check the API base URL and that the service is running.",
    });
  }
  const elapsedMs = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - started);

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
