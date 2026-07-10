/**
 * Strips any `sb-*-auth-token` cookie regardless of the Domain it was set
 * with. @supabase/ssr's own cookie removal only clears the Domain it's
 * currently configured with (`.frontface.app`), which can never match a
 * cookie set without that attribute — deleting a cookie requires an exact
 * Domain+Path match to how it was set. Sessions created before the
 * cross-subdomain SSO cookie scoping shipped are host-only, so the library's
 * removal silently no-ops on them forever. Call this as a guaranteed
 * client-side cleanup whenever a session should end, regardless of whether
 * the library (or a server round-trip) actually managed to clear it.
 */
export function clearStaleAuthCookies() {
  document.cookie
    .split("; ")
    .map((c) => c.split("=")[0])
    .filter((name) => /^sb-.*-auth-token$/.test(name))
    .forEach((name) => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
}
