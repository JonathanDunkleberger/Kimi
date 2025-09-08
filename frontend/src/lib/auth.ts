// Store base64("username:password") in localStorage.
// Types are tightened so HeadersInit is always satisfied.

const KEY = "vp_auth_b64";

export function setAuthBasic(username: string, password: string) {
  if (typeof window === "undefined") return;
  const b64 = typeof btoa !== "undefined" ? btoa(`${username}:${password}`) : "";
  localStorage.setItem(KEY, b64);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

/** Always returns a plain Record<string,string> suitable for HeadersInit */
export function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Basic ${token}` } : {};
}

// Preserve admin token helpers for Admin page usage
const ADMIN_KEY = "vp_admin_token";
export function saveAdminToken(t: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_KEY, t);
}
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_KEY);
}