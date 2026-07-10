import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authCookieDomainForHost } from "@/lib/region-hosts";

// Next.js bundles a separate copy of this module into each route's chunk, so
// a module-level singleton isn't actually unique across routes/pages — each
// chunk gets its own `browserClient` variable, defeating the whole point.
// `window` is the one thing every chunk in the same tab actually shares.
const GLOBAL_KEY = Symbol.for("frontface.supabase.browserClient");

export function createClient() {
  const isBrowser = typeof window !== "undefined";
  // Module state is per-process on the server, which handles many users'
  // requests, so only cache the instance in the browser (one tab, one user).
  const store = isBrowser
    ? (window as unknown as Record<symbol, SupabaseClient | undefined>)
    : undefined;
  if (store?.[GLOBAL_KEY]) return store[GLOBAL_KEY]!;

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

  if (store) store[GLOBAL_KEY] = client;
  return client;
}
