import { createBrowserClient } from "@supabase/ssr";

import { authCookieDomainForHost } from "@/lib/region-hosts";

export function createClient() {
  // On production hosts the auth cookie is scoped to `.frontface.app` so one
  // login spans frontface.app ↔ ksa.frontface.app. `cookieOptions.domain` is
  // applied to both cookie writes and removals, so logout clears it too.
  // During SSR of a client component there is no `window`; the cookie is
  // read/written in the browser, so host-only there is harmless.
  const domain =
    typeof window !== "undefined"
      ? authCookieDomainForHost(window.location.hostname)
      : undefined;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined
  );
}
