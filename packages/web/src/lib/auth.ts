// Deprecated: legacy Basic Auth helpers removed in favor of Clerk.
// This file remains as a placeholder to avoid import breakage during migration.
export function authHeader(): Record<string, string> { return {}; }
export function clearAuth(): void { /* noop */ }