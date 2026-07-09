import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { authCookieDomainForHost } from "@/lib/region-hosts";

/**
 * Creates a Supabase client for server-side use
 * Uses cookies for session management
 */
export async function createClient() {
  const cookieStore = await cookies();
  // Shared `.frontface.app` auth cookie on production hosts (SSO); host-only
  // elsewhere. Applied to writes and removals alike, so logout clears it too.
  const domain = authCookieDomainForHost((await headers()).get("host"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain ? { cookieOptions: { domain } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - cookies are read-only
          }
        },
      },
    }
  );
}
