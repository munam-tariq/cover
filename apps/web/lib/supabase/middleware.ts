import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Updates the session and handles route protection
 * Returns redirect response if auth required but user not authenticated
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Skip auth checks for callback route - it handles auth flow client-side
  // Just pass through the response with cookies intact
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get current user (also refreshes session)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes that require authentication
  const protectedPaths = ["/", "/knowledge", "/api-endpoints", "/embed", "/settings"];
  const isProtectedPath = protectedPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`)
  );

  // Auth paths where logged-in users should be redirected to dashboard
  const authPaths = ["/login"];
  const isAuthPath = authPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`)
  );

  // Redirect unauthenticated users to login for protected routes
  if (isProtectedPath && !user) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthPath && user) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
