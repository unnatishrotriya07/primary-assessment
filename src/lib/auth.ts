/**
 * Check if the stored JWT token is valid (e.g. not expired)
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length < 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      const currentSecs = Math.floor(Date.now() / 1000);
      return payload.exp > currentSecs;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract user metadata from JWT token
 */
export function getUserFromToken(token: string | null): any {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}
