import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import {
  defaultLocaleRewritePath,
  isEnglishOnlyPath,
  stripArabicPrefixForEnglishOnly,
} from "./i18n/english-only-routes";
import { routing } from "./i18n/routing";
import { regionLocaleForHost } from "@/lib/region-hosts";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /ar/blog/* → /blog/* (301) — before anything else runs.
  const strippedEnglishOnlyPath = stripArabicPrefixForEnglishOnly(pathname);
  if (strippedEnglishOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = strippedEnglishOnlyPath;
    return NextResponse.redirect(url, 301);
  }

  // English-only pages must stay English even when NEXT_LOCALE=ar. Rewriting
  // directly to the default locale route avoids a /blog ↔ /ar/blog loop.
  if (isEnglishOnlyPath(pathname)) {
    const { redirect, cookiesToSet } = await updateSession(request);
    const response =
      redirect ??
      NextResponse.rewrite(
        new URL(defaultLocaleRewritePath(pathname), request.url)
      );
    cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    );
    return response;
  }

  // Region subdomains (e.g. ksa.frontface.app) default the UI to their locale.
  // Only when the visitor hasn't chosen one, so the LocaleSwitcher still wins —
  // Arabic is the default here, not a lock. next-intl reads this request cookie
  // below (Prio 2, above accept-language); it's never emitted as a Set-Cookie,
  // so NEXT_LOCALE stays host-only.
  const regionLocale = regionLocaleForHost(request.headers.get("host"));
  if (regionLocale && !request.cookies.has("NEXT_LOCALE")) {
    request.cookies.set("NEXT_LOCALE", regionLocale);
  }

  // Session refresh + route protection first (mutates request cookies so
  // next-intl and server components see the fresh session).
  const { redirect, cookiesToSet } = await updateSession(request);
  const response = redirect ?? intlMiddleware(request);
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - sitemap/robots/manifest metadata routes (served outside [locale])
     * - public folder files
     * - api routes that handle their own auth
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|image-sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
