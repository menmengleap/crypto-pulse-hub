/**
 * Lightweight user-agent parser for the "Logged-in devices" UI.
 *
 * Only needs to be good enough to label the browser, operating system and a
 * device icon — it intentionally doesn't try to fully parse every UA out
 * there (missing → "Unknown" gracefully).
 */

export type DeviceKind = "monitor" | "laptop" | "smartphone" | "tablet" | "unknown";

export type DeviceInfo = {
  kind: DeviceKind;
  browser: string;
  os: string;
  /** Human label, e.g. "Chrome · Windows" or "Safari · iOS". */
  label: string;
};

export function parseUserAgent(ua: string): DeviceInfo {
  const s = ua.toLowerCase();

  // Browser — check the more specific engines before the generic ones.
  let browser = "Unknown browser";
  if (s.includes("edg/") || s.includes("edga/") || s.includes("edgios/")) browser = "Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("samsungbrowser/")) browser = "Samsung Internet";
  else if (s.includes("crios/")) browser = "Chrome";
  else if (s.includes("fxios/") || s.includes("firefox/")) browser = "Firefox";
  else if (s.includes("chrome/") || s.includes("chromium")) browser = "Chrome";
  else if (s.includes("safari/")) browser = "Safari";
  else if (s.includes("bot") || s.includes("crawler") || s.includes("spider")) browser = "Bot";

  // OS.
  let os = "Unknown OS";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ipod")) os = "iOS";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("linux")) os = "Linux";

  // Device kind.
  let kind: DeviceKind = "monitor";
  if (s.includes("ipad") || (s.includes("android") && !s.includes("mobile"))) kind = "tablet";
  else if (
    s.includes("iphone") ||
    s.includes("ipod") ||
    s.includes("android") ||
    s.includes("mobile")
  )
    kind = "smartphone";
  else if (s.includes("macbook") || s.includes("windows") || s.includes("x11")) kind = "laptop";

  const label =
    browser === "Unknown browser" && os === "Unknown OS"
      ? ua.trim() || "Unknown device"
      : `${browser} · ${os}`;

  return { kind, browser, os, label };
}
