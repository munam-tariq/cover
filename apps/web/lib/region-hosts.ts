/**
 * Host-based deployment rules for the hosted web app.
 *
 * Two pure, side-effect-free helpers so they're trivial to unit-test and safe
 * to call in middleware, server components, and the browser:
 *
 *  - `regionLocaleForHost` — a region subdomain (e.g. `ksa.frontface.app`)
 *    serves a default UI language. This is a *default*, not a lock: the
 *    LocaleSwitcher's NEXT_LOCALE cookie still overrides it.
 *  - `authCookieDomainForHost` — production hosts share one auth cookie across
 *    `frontface.app` ↔ `*.frontface.app` (SSO). Everywhere else (localhost,
 *    preview hosts) the cookie stays host-only, so `undefined` is returned.
 */

const PROD_APEX = "frontface.app";

/** Region subdomain → default UI locale. Add more region hosts here. */
const REGION_HOST_LOCALES: Record<string, "ar"> = {
  "ksa.frontface.app": "ar",
};

/** Lowercase the host and drop any `:port` so comparisons are exact. */
function normalizeHost(host: string | null | undefined): string {
  return (host || "").split(":")[0].trim().toLowerCase();
}

/**
 * The default UI locale for a region subdomain, or `null` when the host has no
 * regional default (the app then resolves locale the usual way).
 */
export function regionLocaleForHost(
  host: string | null | undefined
): "ar" | null {
  return REGION_HOST_LOCALES[normalizeHost(host)] ?? null;
}

/**
 * The auth-cookie `domain` for a request host: `.frontface.app` for the
 * production apex and its subdomains (shared login), `undefined` otherwise so
 * localhost and preview deployments keep host-only cookies.
 *
 * The exact-or-dotted-suffix test deliberately rejects lookalikes like
 * `notfrontface.app`.
 */
export function authCookieDomainForHost(
  host: string | null | undefined
): string | undefined {
  const h = normalizeHost(host);
  if (h === PROD_APEX || h.endsWith(`.${PROD_APEX}`)) {
    return `.${PROD_APEX}`;
  }
  return undefined;
}
