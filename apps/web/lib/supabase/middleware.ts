import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type SetCookie = { name: string; value: string; options: CookieOptions };

export type SessionResult = {
  /** Non-null when auth rules demand a redirect (login wall / away from login). */
  redirect: NextResponse | null;
  /** Refreshed auth cookies the caller must copy onto whatever response it returns. */
  cookiesToSet: SetCookie[];
};

/** Strip the locale prefix so route rules match both /dashboard and /ar/dashboard. */
function splitLocale(pathname: string): { prefix: "" | "/ar"; path: string } {
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    return { prefix: "/ar", path: pathname.slice(3) || "/" };
  }
  return { prefix: "", path: pathname };
}

/**
 * Refreshes the Supabase session and evaluates route protection.
 * Mutates request.cookies with refreshed values so downstream middleware
 * (next-intl) and server components see the fresh session; returns the
 * Set-Cookie list for the final response instead of building one itself.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  const cookiesToSet: SetCookie[] = [];
  const { prefix, path } = splitLocale(request.nextUrl.pathname);

  // Callback route handles the auth flow client-side — pass through untouched.
  if (path.startsWith("/auth/callback")) {
    return { redirect: null, cookiesToSet };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies: SetCookie[]) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.push(...cookies);
        },
      },
    }
  );

  // Get current user (also refreshes session)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes that require authentication (dashboard routes)
  const protectedPaths = ["/dashboard", "/knowledge", "/api-endpoints", "/embed", "/settings", "/playground", "/analytics", "/projects"];
  const isProtectedPath = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  // Auth paths where logged-in users should be redirected to dashboard
  const authPaths = ["/login"];
  const isAuthPath = authPaths.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  let redirect: NextResponse | null = null;
  if (isProtectedPath && !user) {
    redirect = NextResponse.redirect(new URL(`${prefix}/login`, request.url));
  } else if (isAuthPath && user) {
    redirect = NextResponse.redirect(new URL(`${prefix}/dashboard`, request.url));
  }

  return { redirect, cookiesToSet };
}
