import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authCookieDomainForHost } from "@/lib/region-hosts";

// @supabase/ssr's own createBrowserClient() already singletons itself in the
// browser, so this is belt-and-suspenders against that being defeated by
// bundle duplication across route groups — not a fix for the refresh-storm
// bug (root cause still unidentified; see conversation).
let browserClient: SupabaseClient | undefined;

export function createClient() {
  // Module state is per-process: on the server that process handles many
  // users' requests, so only cache the instance in the browser (a process of
  // exactly one tab) to avoid leaking one user's client to another's SSR pass.
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) console.count("[debug] createClient called");
  if (isBrowser && browserClient) return browserClient;
  if (isBrowser) console.count("[debug] createClient constructed NEW instance");

  // On production hosts the auth cookie is scoped to `.frontface.app` so one
  // login spans frontface.app ↔ ksa.frontface.app. `cookieOptions.domain` is
  // applied to both cookie writes and removals, so logout clears it too.
  // During SSR of a client component there is no `window`; the cookie is
  // read/written in the browser, so host-only there is harmless.
  const domain = isBrowser
    ? authCookieDomainForHost(window.location.hostname)
    : undefined;

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined
  );

  if (isBrowser) browserClient = client;
  return client;
}
