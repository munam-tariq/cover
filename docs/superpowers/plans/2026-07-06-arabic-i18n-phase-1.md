# Arabic i18n Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full Arabic (RTL) support for FrontFace marketing + auth + onboarding with browser-language auto-detection, `/ar` URLs, and hreflang SEO — English URLs byte-for-byte unchanged.

**Architecture:** next-intl v4 with an `app/[locale]/` restructure and `localePrefix: 'as-needed'` (EN unprefixed, AR at `/ar`). Middleware runs Supabase session refresh (locale-aware route protection) against the request, then next-intl produces the response and auth cookies are merged onto it. UI strings live in namespaced `messages/{en,ar}/*.json`; structured landing content lives in typed per-locale TS modules.

**Tech Stack:** Next.js 15.5.19 (App Router), next-intl ^4.9.1, Tailwind 3.4 logical properties, IBM Plex Sans Arabic via next/font, node:test for parity tests.

**Spec:** `docs/superpowers/specs/2026-07-06-arabic-i18n-design.md`

## Global Constraints

- **NEVER run `git add`, `git commit`, or `git push`.** The user reviews all changes in their IDE and commits manually. Where this plan says "checkpoint", run the listed verification commands and stop — do not commit.
- Locales: exactly `['en', 'ar']`, `defaultLocale: 'en'`, `localePrefix: 'as-needed'`. Cookie: next-intl default `NEXT_LOCALE`.
- All existing English URLs must remain unchanged (no `/en` prefix ever appears in links or redirects).
- Blog, `/vs`, `/use-cases` are English-only: `/ar/blog/*`, `/ar/vs/*`, `/ar/use-cases/*` 301 to the unprefixed path. Do not translate their content.
- Arabic copy is Modern Standard Arabic, SaaS register, Western digits (0-9). Draft quality is fine — the user reviews all Arabic before launch.
- Every `messages/ar/*.json` must have exactly the same key set as its `messages/en/*.json` counterpart (enforced by parity test).
- Do not rename `--ff-*` CSS tokens or restore the marketing double-shell (see `landing-redesign` memory).
- All commands run from `/media/ubuntu/external/cover/cover` unless stated; web app commands use `pnpm --filter web <script>`.
- Working dir shorthand below: `apps/web` = `/media/ubuntu/external/cover/cover/apps/web`.

---

### Task 1: i18n scaffolding + message parity test

**Files:**
- Create: `tests/web/i18n-parity.test.ts`
- Create: `apps/web/i18n/routing.ts`, `apps/web/i18n/request.ts`, `apps/web/i18n/navigation.ts`
- Create: `apps/web/messages/en/common.json`, `apps/web/messages/ar/common.json` (seed; other namespaces added by later tasks)
- Modify: `apps/web/package.json` (add dependency + `test:i18n` script)
- Modify: `apps/web/next.config.js` (wrap with next-intl plugin)

**Interfaces:**
- Produces: `routing` (locales `['en','ar']`), `Locale` type; `Link`, `useRouter`, `usePathname`, `redirect`, `getPathname` from `apps/web/i18n/navigation.ts` — **every later task imports navigation from here, never from `next/link`/`next/navigation`, for internal app links**.
- Produces: message namespace convention `messages/{locale}/{common|marketing|auth|onboarding}.json`, merged in `request.ts`.

- [ ] **Step 1: Write the failing parity test**

`tests/web/i18n-parity.test.ts`:

```ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const MESSAGES_DIR = join(import.meta.dirname, "../../apps/web/messages");

/** Flatten nested JSON to dot-paths; arrays contribute index-less paths + length. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return [
      `${prefix}[len=${value.length}]`,
      ...value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`)),
    ];
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
}

test("en and ar have identical namespace files", () => {
  const en = readdirSync(join(MESSAGES_DIR, "en")).sort();
  const ar = readdirSync(join(MESSAGES_DIR, "ar")).sort();
  assert.deepEqual(ar, en);
});

test("every ar namespace has exactly the en key set", () => {
  for (const file of readdirSync(join(MESSAGES_DIR, "en"))) {
    const en = JSON.parse(readFileSync(join(MESSAGES_DIR, "en", file), "utf8"));
    const ar = JSON.parse(readFileSync(join(MESSAGES_DIR, "ar", file), "utf8"));
    assert.deepEqual(
      keyPaths(ar).sort(),
      keyPaths(en).sort(),
      `key mismatch in ${file}`
    );
  }
});

test("no ar value is left identical to en (untranslated copy)", () => {
  // Allowlist for strings that are legitimately the same in both languages.
  const allowSame = new Set([
    "FrontFace", "BETA", "WhatsApp", "Slack", "Messenger",
    "English", "العربية", "%s | FrontFace",
  ]);
  for (const file of readdirSync(join(MESSAGES_DIR, "en"))) {
    const en = JSON.parse(readFileSync(join(MESSAGES_DIR, "en", file), "utf8"));
    const ar = JSON.parse(readFileSync(join(MESSAGES_DIR, "ar", file), "utf8"));
    const flatten = (v: unknown, out: Map<string, string>, p = ""): Map<string, string> => {
      if (Array.isArray(v)) v.forEach((x, i) => flatten(x, out, `${p}[${i}]`));
      else if (v !== null && typeof v === "object")
        Object.entries(v as Record<string, unknown>).forEach(([k, x]) => flatten(x, out, p ? `${p}.${k}` : k));
      else if (typeof v === "string") out.set(p, v);
      return out;
    };
    const enFlat = flatten(en, new Map());
    const arFlat = flatten(ar, new Map());
    for (const [path, enVal] of enFlat) {
      if (enVal.length < 4 || allowSame.has(enVal)) continue;
      assert.notEqual(arFlat.get(path), enVal, `untranslated ar value at ${file}:${path}`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/web/i18n-parity.test.ts`
Expected: FAIL — `ENOENT ... apps/web/messages/en` (messages dir doesn't exist yet).

- [ ] **Step 3: Install next-intl**

Run: `pnpm --filter web add next-intl@^4.9.1`
Expected: `apps/web/package.json` gains `"next-intl": "^4.9.1"`; lockfile updated.

- [ ] **Step 4: Create the i18n config files**

`apps/web/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
```

`apps/web/i18n/request.ts`:

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

// Namespace files merged into one messages object. Later tasks add
// marketing/auth/onboarding — extend NAMESPACES when adding a namespace file.
const NAMESPACES = ["common", "marketing", "auth", "onboarding"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        return [ns, (await import(`../messages/${locale}/${ns}.json`)).default] as const;
      } catch {
        return [ns, {}] as const; // namespace not created yet
      }
    })
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
    // Missing ar key → render the English string, never a raw key or crash.
    getMessageFallback: ({ key, namespace }) =>
      [namespace, key].filter(Boolean).join("."),
  };
});
```

`apps/web/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 5: Seed the common namespace**

`apps/web/messages/en/common.json`:

```json
{
  "localeSwitcher": {
    "label": "Language",
    "en": "English",
    "ar": "العربية"
  },
  "notFound": {
    "title": "Page not found",
    "description": "The page you are looking for doesn't exist or has moved.",
    "backHome": "Back to home"
  }
}
```

`apps/web/messages/ar/common.json`:

```json
{
  "localeSwitcher": {
    "label": "اللغة",
    "en": "English",
    "ar": "العربية"
  },
  "notFound": {
    "title": "الصفحة غير موجودة",
    "description": "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    "backHome": "العودة إلى الصفحة الرئيسية"
  }
}
```

(Note: `localeSwitcher.en` = "English" in both files and `localeSwitcher.ar` = "العربية" in both — a language switcher always shows each language in its own script. These are already in the parity test's `allowSame` set.)

- [ ] **Step 6: Wire the next-intl plugin into next.config.js**

Modify `apps/web/next.config.js` — add at the top:

```js
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
```

and change the export line from:

```js
module.exports = withSentryConfig(nextConfig, {
```

to:

```js
module.exports = withSentryConfig(withNextIntl(nextConfig), {
```

(everything inside the Sentry options object stays as-is).

- [ ] **Step 7: Add the test script**

In `apps/web/package.json` scripts, after `"test:navigation"`, add:

```json
"test:i18n": "node --experimental-strip-types --test ../../tests/web/i18n-parity.test.ts",
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter web test:i18n`
Expected: PASS (3 tests).

- [ ] **Step 9: Type-check checkpoint**

Run: `pnpm --filter web type-check`
Expected: clean (no new errors — the app doesn't consume i18n yet).

---

### Task 2: `[locale]` route restructure + root layout

**Files:**
- Move (git mv preserves history — moving is fine, it's `git commit` that's forbidden): everything in `apps/web/app/` EXCEPT `globals.css`, `sitemap.ts`, `robots.ts`, `image-sitemap.xml`, `global-error.tsx` into `apps/web/app/[locale]/`
- Create: `apps/web/app/[locale]/layout.tsx` (from the old root `app/layout.tsx`), `apps/web/app/[locale]/not-found.tsx`, `apps/web/app/[locale]/[...rest]/page.tsx`
- Delete: `apps/web/app/layout.tsx` (its content moves to `[locale]/layout.tsx`; there is NO root layout — with all pages under `[locale]`, Next treats `[locale]/layout.tsx` as the root layout)

**Interfaces:**
- Consumes: `routing`, `Locale` from Task 1.
- Produces: `<html lang={locale} dir={...}>` with `--font-arabic` variable available; `NextIntlClientProvider` wrapping all pages — later tasks can use `useTranslations` in any client component and `getTranslations` in any server component.

- [ ] **Step 1: Move the route tree**

```bash
cd apps/web/app
mkdir "[locale]"
git mv "(auth)" "(dashboard)" "(marketing)" "(onboarding)" c invite "[locale]/"
```

`globals.css`, `sitemap.ts`, `robots.ts`, `image-sitemap.xml`, `global-error.tsx` stay at `app/`. (`git mv` only stages the rename — that is required for the move itself and is not a commit.)

- [ ] **Step 2: Create `apps/web/app/[locale]/layout.tsx`**

Copy the entire old `app/layout.tsx` content, then apply exactly these changes (all metadata objects, schema constants, favicon links, and `AnalyticsConsent` logic are kept verbatim):

```tsx
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { AnalyticsConsent } from "../../components/analytics-consent";
import { routing } from "../../i18n/routing";

import "../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "optional",
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* … viewport, metadata, organizationSchema, softwareSchema, hasAnalyticsConsent
   — copied VERBATIM from the old app/layout.tsx (Task 5 localizes metadata) … */

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="scroll-smooth"
    >
      <head>{/* favicon/manifest/schema <link>/<script> tags verbatim from old layout */}</head>
      <body
        className={`${inter.className} ${jetbrainsMono.variable} ${plexArabic.variable}`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {hasAnalyticsConsent && <AnalyticsConsent />}
      </body>
    </html>
  );
}
```

Then `git rm apps/web/app/layout.tsx` (old file — content now lives in `[locale]/layout.tsx`).

- [ ] **Step 3: Arabic font stack in globals.css**

At the end of `apps/web/app/globals.css` add:

```css
/* Arabic pages: IBM Plex Sans Arabic first (it includes Latin glyphs),
   generic fallbacks after. LTR pages keep Inter via body className. */
[dir="rtl"] body {
  font-family: var(--font-arabic), ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 4: Localized 404 + unknown-route catchall**

`apps/web/app/[locale]/not-found.tsx`:

```tsx
import { useTranslations } from "next-intl";

import { Link } from "../../i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{t("title")}</h1>
        <p style={{ marginTop: 8, color: "var(--ff-soft)" }}>{t("description")}</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/" style={{ textDecoration: "underline" }}>{t("backHome")}</Link>
        </p>
      </div>
    </main>
  );
}
```

`apps/web/app/[locale]/[...rest]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

export default function CatchAll() {
  notFound();
}
```

- [ ] **Step 5: Fix relative imports broken by the move**

The moved files gained one path level. Find breakage:

Run: `pnpm --filter web type-check`

Fix every error mechanically: imports like `"../components/analytics-consent"` inside moved files become `"../../components/..."` — but prefer the existing `@/` alias (check `apps/web/tsconfig.json` paths) wherever the file already mixes styles. `app/[locale]/(marketing)/…` internal relative imports between moved siblings are unchanged.

- [ ] **Step 6: Await the locale in nested layouts/pages that need it**

`app/[locale]/(marketing)/layout.tsx` and every `page.tsx` with `generateStaticParams` for slugs remain unchanged in behavior — Next passes `params.locale` down but nothing consumes it yet. No edits beyond import fixes in this task.

- [ ] **Step 7: Build checkpoint**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: both succeed. The build will render pages under `[locale]`; sitemap/robots still emit from `app/`.

(Middleware is not locale-aware yet — the dev site works for `/` but `/ar` behavior lands in Task 3. That's fine: this task's deliverable is "restructure compiles and builds".)

---

### Task 3: Middleware — EN-only redirects, locale-aware auth, intl composition

**Files:**
- Modify: `apps/web/middleware.ts` (full rewrite below)
- Modify: `apps/web/lib/supabase/middleware.ts` (full rewrite below)

**Interfaces:**
- Consumes: `routing` from Task 1.
- Produces: request flow — ① `/ar/{blog,vs,use-cases}/*` → 301 unprefixed; ② Supabase session refresh + locale-aware route protection (may redirect, preserving `/ar`); ③ next-intl handles detection/rewrite; refreshed auth cookies are merged onto the final response.

- [ ] **Step 1: Rewrite `apps/web/lib/supabase/middleware.ts`**

Replace the whole file with:

```ts
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

  const protectedPaths = ["/dashboard", "/knowledge", "/api-endpoints", "/embed", "/settings", "/playground", "/analytics", "/projects"];
  const isProtectedPath = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

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
```

- [ ] **Step 2: Rewrite `apps/web/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// English-only long-form content: no /ar variants exist (see spec).
const EN_ONLY_PREFIXES = ["/blog", "/vs", "/use-cases"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /ar/blog/* → /blog/* (301) — before anything else runs.
  const enOnly = EN_ONLY_PREFIXES.find(
    (p) => pathname === `/ar${p}` || pathname.startsWith(`/ar${p}/`)
  );
  if (enOnly) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3); // strip "/ar"
    return NextResponse.redirect(url, 301);
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
     * - public folder files
     * - api routes that handle their own auth
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Note: `sitemap.xml`, `robots.txt`, `manifest.json` and other extension-less metadata routes still pass through the matcher and hence next-intl. next-intl's middleware leaves paths that don't resolve to a locale-prefixed page untouched apart from an internal rewrite attempt; verify in Step 4 that `curl -s http://localhost:3000/sitemap.xml` still returns XML — if it 404s, add `sitemap.xml|robots.txt|manifest.json` to the matcher exclusion the same way `favicon.ico` is excluded.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter web type-check`
Expected: clean.

- [ ] **Step 4: Behavior verification against dev server**

Start: `pnpm --filter web dev` (port 3000), then:

```bash
# English default untouched (no redirect):
curl -sI http://localhost:3000/ | head -1                                  # → 200
# Arabic browser first visit → /ar:
curl -sI http://localhost:3000/ -H "Accept-Language: ar" | grep -i location # → /ar (3xx)
# Cookie beats header:
curl -sI http://localhost:3000/ -H "Accept-Language: ar" -H "Cookie: NEXT_LOCALE=en" | head -1  # → 200, no redirect
# EN-only content redirect:
curl -sI http://localhost:3000/ar/blog | grep -iE "HTTP|location"          # → 301, location /blog
curl -sI http://localhost:3000/ar/vs/chatbase | grep -iE "HTTP|location"   # → 301, location /vs/chatbase
# Auth wall preserves locale:
curl -sI http://localhost:3000/ar/dashboard | grep -i location             # → /ar/login
curl -sI http://localhost:3000/dashboard | grep -i location                # → /login
# Arabic page renders RTL:
curl -s http://localhost:3000/ar | grep -o 'dir="rtl"' | head -1           # → dir="rtl"
# Metadata routes still work:
curl -sI http://localhost:3000/sitemap.xml | head -1                       # → 200
```

All expectations must hold before moving on. Keep the dev server running for later tasks.

---

### Task 4: Locale-aware navigation sweep

**Files:**
- Modify: every file under `apps/web/app/[locale]/(marketing)`, `(auth)`, `(onboarding)` (+ `components/` files they use) that imports `next/link` or uses `useRouter`/`usePathname`/`redirect` from `next/navigation` for **internal page links**.

**Interfaces:**
- Consumes: `Link`, `useRouter`, `usePathname`, `redirect` from `apps/web/i18n/navigation` (Task 1).
- Produces: all internal navigation preserves the active locale (an Arabic visitor never silently falls back to English mid-journey).

- [ ] **Step 1: Enumerate the swap surface**

```bash
cd apps/web
grep -rln 'from "next/link"' "app/[locale]/(marketing)" "app/[locale]/(auth)" "app/[locale]/(onboarding)"
grep -rln 'from "next/navigation"' "app/[locale]/(marketing)" "app/[locale]/(auth)" "app/[locale]/(onboarding)"
```

- [ ] **Step 2: Swap imports file by file**

For each listed file, change `import Link from "next/link"` → `import { Link } from "@/i18n/navigation"` (add the `@/i18n/*` path to `tsconfig.json` `paths` if `@/` doesn't already cover the app root — check first: `grep -A5 '"paths"' apps/web/tsconfig.json`). Same for `useRouter`/`usePathname`/`redirect` — but keep `next/navigation` imports for `useSearchParams` and `notFound` (they are not locale-aware and next-intl doesn't wrap them). A file may end up importing from both modules; that is correct.

**Exceptions (leave as `next/link`/`next/navigation`):**
- `(dashboard)` files — Phase 2 territory; only swap if type-check forces it (it won't).
- External `href`s (`https://…`), `mailto:`, and hash-only anchors on the same page.
- `(auth)/auth/callback/page.tsx` router usage — it redirects with `window.location`/router to post-auth destinations; swap `useRouter` there too so `/ar` users land on `/ar/dashboard`.

- [ ] **Step 3: Verify**

Run: `pnpm --filter web type-check`
Expected: clean.

Then in a browser (or `curl`): load `http://localhost:3000/ar`, confirm header/footer links in the HTML point to `/ar/...` paths:

```bash
curl -s http://localhost:3000/ar | grep -oE 'href="/[^"]*"' | sort -u | head -20
```

Expected: internal hrefs carry the `/ar` prefix (e.g. `href="/ar/login"`); `/blog`, `/vs/...`, `/use-cases` remain unprefixed only if already redirect targets — next-intl `Link` will prefix them too, which is fine because middleware 301s them back (acceptable single hop for EN-only content).

---

### Task 5: SEO — localized metadata helper + sitemap alternates

**Files:**
- Create: `apps/web/lib/seo.ts`
- Modify: `apps/web/app/[locale]/layout.tsx` (metadata → `generateMetadata`), `apps/web/app/sitemap.ts`
- Modify: `apps/web/messages/{en,ar}/common.json` (add `meta` keys)

**Interfaces:**
- Consumes: `Locale` from Task 1.
- Produces: `localizedAlternates(path: string)` and `ogLocale(locale: Locale)` used by every translated page's `generateMetadata` in Tasks 6–9.

- [ ] **Step 1: Create `apps/web/lib/seo.ts`**

```ts
import type { Locale } from "@/i18n/routing";

const BASE_URL = "https://frontface.app";

/**
 * hreflang alternates for a translated route. `path` is the unprefixed
 * route ("/" or "/features"). EN lives unprefixed, AR under /ar,
 * x-default follows EN.
 */
export function localizedAlternates(path: string) {
  const enUrl = `${BASE_URL}${path === "/" ? "" : path}` || BASE_URL;
  const arUrl = `${BASE_URL}/ar${path === "/" ? "" : path}`;
  return {
    canonical: enUrl,
    languages: {
      en: enUrl,
      ar: arUrl,
      "x-default": enUrl,
    },
  };
}

export function ogLocale(locale: Locale): string {
  return locale === "ar" ? "ar_SA" : "en_US";
}
```

- [ ] **Step 2: Localize the root metadata**

In `apps/web/app/[locale]/layout.tsx`, replace `export const metadata: Metadata = {...}` with `generateMetadata`. Move the site title/description strings into `messages/{en,ar}/common.json` under a `meta` key and keep every non-textual field verbatim:

`messages/en/common.json` — add:

```json
"meta": {
  "title": "FrontFace — AI Support Agent That Resolves Questions Instantly",
  "titleTemplate": "%s | FrontFace",
  "description": "FrontFace AI resolves customer questions instantly from your knowledge base — support more customers without hiring. Free during beta.",
  "ogImageAlt": "FrontFace — AI support agent that resolves customer questions instantly"
}
```

`messages/ar/common.json` — add:

```json
"meta": {
  "title": "FrontFace — وكيل دعم بالذكاء الاصطناعي يجيب عملاءك فورًا",
  "titleTemplate": "%s | FrontFace",
  "description": "يجيب FrontFace على أسئلة عملائك فورًا من قاعدة معرفتك — قدّم دعمًا لعدد أكبر من العملاء دون توظيف إضافي. مجاني خلال فترة البيتا.",
  "ogImageAlt": "FrontFace — وكيل دعم بالذكاء الاصطناعي يجيب أسئلة العملاء فورًا"
}
```

(`titleTemplate` is intentionally identical in both — `"%s | FrontFace"` is already in the parity test's `allowSame` set.)

`generateMetadata` shape:

```tsx
import { getTranslations } from "next-intl/server";

import { localizedAlternates, ogLocale } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.meta" });
  return {
    metadataBase: new URL("https://frontface.app"),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    /* keywords, authors, creator, publisher, formatDetection, robots,
       verification, category — verbatim from the old metadata object */
    alternates: localizedAlternates("/"),
    openGraph: {
      /* verbatim except: */ locale: ogLocale(locale as Locale),
      title: t("title"),
      description: t("description"),
      images: [{ /* url/width/height verbatim */ alt: t("ogImageAlt") }],
    },
    twitter: {
      /* verbatim except title/description/images[0].alt from t(...) as above */
    },
  };
}
```

- [ ] **Step 3: Sitemap alternates**

Read `apps/web/app/sitemap.ts` first. For every route it emits that is translated in Phase 1 (`/`, `/features`, `/integrations`, `/about`, `/terms`, `/privacy`, `/tools`, the 5 calculator paths), extend the entry with:

```ts
alternates: {
  languages: {
    en: `${BASE_URL}${path}`,
    ar: `${BASE_URL}/ar${path}`,
  },
},
```

Blog//vs//use-cases entries stay EN-only (no `alternates.languages`). If the sitemap builds URLs in a loop, add a `TRANSLATED_ROUTES: Set<string>` constant listing the paths above and branch on membership — do not duplicate URL-building logic.

- [ ] **Step 4: Verify**

Run: `pnpm --filter web test:i18n && pnpm --filter web type-check`
Expected: both clean.

```bash
curl -s http://localhost:3000/sitemap.xml | grep -c "hreflang"   # > 0
curl -s http://localhost:3000/ar | grep -o '<html[^>]*lang="ar"[^>]*'  # lang="ar" dir="rtl"
curl -s http://localhost:3000/ar | grep -o 'og:locale[^/]*'      # ar_SA
```

---

### Task 6: Marketing content extraction — landing page

**Files:**
- Create: `apps/web/app/[locale]/(marketing)/landing-data.en.ts`, `landing-data.ar.ts`
- Modify: `apps/web/app/[locale]/(marketing)/landing-data.ts` (becomes types + selector), every landing section component in `app/[locale]/(marketing)/components/` that renders copy (`hero-section.tsx`, `capabilities-section.tsx`, `how-it-works.tsx`, `stats-bar.tsx`, `social-proof.tsx`, `logo-strip.tsx`, `pricing-section.tsx`, `final-cta.tsx`, `deploy-anywhere.tsx`, `live-demo.tsx`, `hero-demo-slot.tsx`, `header.tsx`, `footer.tsx`), `app/[locale]/(marketing)/page.tsx`
- Create: `apps/web/messages/en/marketing.json`, `apps/web/messages/ar/marketing.json`

**Interfaces:**
- Consumes: `Locale`, navigation `Link` (Task 4 already swapped imports), `getTranslations`/`useTranslations`.
- Produces: `getLandingData(locale: Locale): LandingData` where `LandingData = { demos: Demo[]; caps: Cap[]; steps: Step[]; stats: [string, string][]; testi: Testimonial[]; logos: string[]; nav: [string, string][]; resourceLinks: [string, string, string, IconName][] }`; `marketing.json` namespaces `header.*`, `footer.*`, `hero.*`, `pricing.*`, `cta.*` used by section components.

**Split rule:** structured arrays (demos/caps/steps/stats/testimonials/nav/resource links) live in the typed per-locale TS modules — they keep `IconName` typing and TS enforces shape parity. Loose strings in JSX (headings, button labels, badges, section kickers) go to `marketing.json`.

- [ ] **Step 1: Restructure landing-data**

`landing-data.ts` keeps ALL type/interface definitions (`Demo`, `Cap`, `Step`, `Testimonial`) plus:

```ts
import type { Locale } from "@/i18n/routing";

import { LANDING_AR } from "./landing-data.ar";
import { LANDING_EN } from "./landing-data.en";

export interface LandingData {
  demos: Demo[];
  caps: Cap[];
  steps: Step[];
  stats: [string, string][];
  testi: Testimonial[];
  logos: string[];
  nav: [string, string][];
  resourceLinks: [string, string, string, IconName][];
}

export function getLandingData(locale: Locale): LandingData {
  return locale === "ar" ? LANDING_AR : LANDING_EN;
}
```

`landing-data.en.ts` exports `export const LANDING_EN: LandingData = {...}` with the existing English arrays moved verbatim (`DEMOS`→`demos`, `CAPS`→`caps`, `STEPS`→`steps`, `STATS`→`stats`, `TESTI`→`testi`, `LOGOS`→`logos`, `NAV`→`nav`, `RESOURCE_LINKS`→`resourceLinks`). `landing-data.ar.ts` exports `LANDING_AR: LandingData` with the same hrefs/icons/domains/`mono` initials and MSA Arabic for every display string (names of demo companies stay Latin — they're brands; translate `tag`, `greeting`, `q`, `a`, `q2`, `a2`, `cites` stay as paths). The old `export const DEMOS/CAPS/...` named exports are deleted; TS type-check then flags every consumer — that's the worklist for Step 2.

- [ ] **Step 2: Thread locale through consumers**

`app/[locale]/(marketing)/page.tsx` and each section component: server components read `const { locale } = await params` (page) or receive `data`/props from the page; client components (`live-demo.tsx` etc.) receive the data slice as props from their server parent — do NOT import `landing-data.ar.ts` into client bundles wholesale. Header/footer get locale via `getLocale()` from `next-intl/server` (they render inside `[locale]` layout without params).

- [ ] **Step 3: Extract JSX strings to marketing.json**

Work through the file list top to bottom. Worked example — `header.tsx`:

Before:

```tsx
<button type="button" className="ff-nav-link ff-resources-trigger" aria-haspopup="true">
  Resources
  ...
<div className="ff-resources-label">Quick links</div>
...
<Btn kind="primary" size="sm" href="/login">
  Build your agent {Ic("arrowR", { size: 15 })}
</Btn>
```

After (Header becomes async server component):

```tsx
import { getLocale, getTranslations } from "next-intl/server";

export async function Header() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("marketing.header");
  const { nav, resourceLinks } = getLandingData(locale);
  ...
  {t("resources")}
  ...
  <div className="ff-resources-label">{t("quickLinks")}</div>
  ...
  <Btn kind="primary" size="sm" href="/login">
    {t("buildYourAgent")} {Ic("arrowR", { size: 15 })}
  </Btn>
```

with `marketing.json`:

```json
{
  "header": {
    "resources": "Resources",
    "quickLinks": "Quick links",
    "recentUpdate": "Recent update",
    "buildYourAgent": "Build your agent",
    "openMenu": "Open menu",
    "homeAriaLabel": "FrontFace home"
  }
}
```

and `messages/ar/marketing.json`:

```json
{
  "header": {
    "resources": "الموارد",
    "quickLinks": "روابط سريعة",
    "recentUpdate": "آخر التحديثات",
    "buildYourAgent": "أنشئ وكيلك",
    "openMenu": "افتح القائمة",
    "homeAriaLabel": "الصفحة الرئيسية FrontFace"
  }
}
```

Apply the same pattern to every listed section component: every English string visible in the UI (including `aria-label`s and `alt`s) moves to a `marketing.<section>` key; the Arabic file gets the MSA translation immediately (never leave a namespace half-filled — the parity test runs after every file).

The header "Recent update" card links to a blog post (EN-only): keep it, it simply opens the English article.

- [ ] **Step 4: Verify**

Run: `pnpm --filter web test:i18n && pnpm --filter web type-check && pnpm --filter web build`
Expected: all clean. Then eyeball both renders:

```bash
curl -s http://localhost:3000/ | grep -c "Build your agent"     # > 0 (unchanged EN)
curl -s http://localhost:3000/ar | grep -c "أنشئ وكيلك"          # > 0
```

---

### Task 7: Marketing content extraction — secondary pages + calculators

**Files:**
- Modify: `app/[locale]/(marketing)/about/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `features/page.tsx`, `integrations/page.tsx`, `tools/page.tsx`, and the five calculator pages under `tools/*/page.tsx` (+ any client components they import for the calculators)
- Modify: `apps/web/messages/{en,ar}/marketing.json` (new sections: `about`, `terms`, `privacy`, `features`, `integrationsIndex`, `tools`, `calculators.*`)

**Interfaces:**
- Consumes: `localizedAlternates`/`ogLocale` (Task 5), `getTranslations`/`useTranslations`.
- Produces: every listed page fully Arabic at `/ar/...` with localized `generateMetadata`.

- [ ] **Step 1: Page-by-page extraction**

Same extraction pattern as Task 6 Step 3. Per page additionally replace its static `export const metadata` with:

```tsx
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.features.meta" }); // per-page namespace
  return {
    title: t("title"),
    description: t("description"),
    alternates: localizedAlternates("/features"),
    openGraph: { locale: ogLocale(locale as Locale), title: t("title"), description: t("description") },
  };
}
```

Key layout per page namespace: `meta.title`, `meta.description`, then content keys mirroring the page's visual hierarchy (`hero.title`, `hero.subtitle`, `sections[...]` arrays where the page maps over lists — arrays of objects are fine in JSON; read them with `t.raw("sections") as {title: string; body: string}[]`).

Calculators: labels, input names, unit suffixes, result sentences, CTA buttons all move to `marketing.calculators.<slug>.*`. Formulas/logic untouched. Result sentences with interpolated numbers use ICU args: `"resultLine": "You could deflect {count} tickets per month"` / `"يمكنك تفادي {count} تذكرة شهريًا"` and `t("resultLine", { count })`.

`terms`/`privacy`: translate as MSA drafts and add a `common.legalNotice` string rendered at the top of the Arabic versions only: `"هذه الترجمة لأغراض الاطلاع؛ النسخة الإنجليزية هي المرجع القانوني."` (English reference: "This translation is provided for convenience; the English version is legally authoritative." — render via `locale === "ar" && <p>{t("legalNotice")}</p>`; put both strings in `common.json`).

- [ ] **Step 2: Verify after EACH page**

Run: `pnpm --filter web test:i18n` after each page's extraction (parity catches missed keys immediately), and `pnpm --filter web type-check` after all six + calculators.

- [ ] **Step 3: Full checkpoint**

Run: `pnpm --filter web build`
Expected: clean. Spot-check `curl -s http://localhost:3000/ar/features | grep -o 'dir="rtl"'` and confirm Arabic body copy renders on `/ar/about`, `/ar/tools`, one calculator.

---

### Task 8: Auth pages

**Files:**
- Modify: `app/[locale]/(auth)/login/page.tsx`, `app/[locale]/(auth)/login/check-email/page.tsx`, `app/[locale]/(auth)/auth/callback/page.tsx`, `app/[locale]/(auth)/layout.tsx`
- Create: `apps/web/messages/en/auth.json`, `apps/web/messages/ar/auth.json`

**Interfaces:**
- Consumes: `useTranslations` (these are client components — `NextIntlClientProvider` from Task 2 already provides messages).
- Produces: `auth.login.*`, `auth.checkEmail.*`, `auth.callback.*` namespaces.

- [ ] **Step 1: Extract login strings**

`login/page.tsx` is `"use client"` — use `const t = useTranslations("auth.login")`. Every visible string moves: page heading, email label/placeholder, submit button (+ loading state), error messages (including the inline validation `"Please enter a valid email address"` → `t("invalidEmail")`), links, magic-link explanations. Error strings arriving via `searchParams.get("error")` codes: map code → `t(\`errors.${code}\`)` with a fallback `t("errors.generic")` — enumerate the codes actually passed (grep `error=` across `app/[locale]/(auth)` and `lib/` to find them) and add one key per code.

`auth.json` skeleton (extend with what the actual files contain — read each file, extract EVERY string):

```json
{
  "login": {
    "title": "…", "emailLabel": "…", "emailPlaceholder": "…",
    "submit": "…", "submitting": "…", "invalidEmail": "…",
    "errors": { "generic": "…" }
  },
  "checkEmail": { "title": "…", "body": "…", "resend": "…" },
  "callback": { "loading": "…", "error": "…" }
}
```

("…" here means: copy the exact current English string during extraction — the plan cannot enumerate them without duplicating three whole files; the extraction rule is total: after this task `grep -rn '"[A-Z][a-z].*"' app/[locale]/(auth) --include=*.tsx` must show no user-visible English literals remaining in JSX.)

- [ ] **Step 2: Arabic drafts + parity**

Fill `messages/ar/auth.json` with MSA for every key. Run: `pnpm --filter web test:i18n` → PASS.

- [ ] **Step 3: Flow verification**

Run dev server; walk `http://localhost:3000/ar/login`: form renders RTL in Arabic; submit an invalid email → Arabic validation message; submit a valid email → lands on `/ar/login/check-email` in Arabic. English flow at `/login` unchanged.

---

### Task 9: Onboarding pages

**Files:**
- Modify: `app/[locale]/(onboarding)/layout.tsx`, `onboarding/page.tsx`, `onboarding/{agent-name,website,processing,complete}/page.tsx`, and the ten components in `app/[locale]/(onboarding)/components/`
- Create: `apps/web/messages/en/onboarding.json`, `apps/web/messages/ar/onboarding.json`

**Interfaces:**
- Consumes: `useTranslations` in client components, `getTranslations` in server components.
- Produces: `onboarding.steps.*`, `onboarding.agentName.*`, `onboarding.website.*`, `onboarding.processing.*`, `onboarding.complete.*`, `onboarding.ui.*` namespaces.

- [ ] **Step 1: Extract strings**

Same total-extraction rule as Task 8: read each of the 14 files, move every user-visible string (headings, step labels, progress text, buttons, input placeholders, crawl-status lines, error toasts, the agent self-test copy) into `onboarding.json` keys mirroring the component structure. Dynamic status lines with counts/URLs use ICU args (`{count}`, `{url}`). Strings that are backend-provided (crawl page titles, extracted source paths, model output) are data, not UI — leave them.

- [ ] **Step 2: Arabic drafts + parity**

Fill `messages/ar/onboarding.json`. Run: `pnpm --filter web test:i18n` → PASS. Run: `pnpm --filter web type-check` → clean.

- [ ] **Step 3: Flow verification**

Dev server: from `/ar/login` complete a signup (dev Supabase) → onboarding flow renders in Arabic RTL through website → agent-name → processing → complete. English `/onboarding` unchanged. (If completing a real signup is impractical, load each onboarding route directly with an authenticated dev session cookie.)

---

### Task 10: RTL polish pass

**Files:**
- Modify: files under `app/[locale]/(marketing)`, `(auth)`, `(onboarding)` and `components/` flagged by the audits below (~20 Tailwind hits + inline styles + `ff-*` CSS blocks)
- Modify: `apps/web/app/globals.css` (RTL overrides where per-component fixes don't fit)

**Interfaces:**
- Consumes: `dir="rtl"` set by Task 2's layout.
- Produces: mirrored layout on all Phase 1 surfaces; zero visual change in LTR.

- [ ] **Step 1: Tailwind physical → logical audit**

```bash
cd apps/web
grep -rnE '\b(ml|mr|pl|pr)-[0-9.]+|\b(left|right)-[0-9.]+|text-(left|right)\b|\brounded-(l|r)\b' \
  "app/[locale]/(marketing)" "app/[locale]/(auth)" "app/[locale]/(onboarding)" components --include=*.tsx
```

Mechanical replacements: `ml-*`→`ms-*`, `mr-*`→`me-*`, `pl-*`→`ps-*`, `pr-*`→`pe-*`, `left-*`→`start-*`, `right-*`→`end-*`, `text-left`→`text-start`, `text-right`→`text-end`, `rounded-l*`→`rounded-s*`, `rounded-r*`→`rounded-e*`. Exception: keep physical classes where the position is genuinely physical regardless of language (e.g. a widget launcher pinned bottom-right by product decision) — decide per hit, note any keeps in the task summary.

- [ ] **Step 2: Inline-style + ff-* CSS audit**

```bash
grep -rnE 'textAlign:|marginLeft|marginRight|paddingLeft|paddingRight|\bleft:|\bright:|translateX' \
  "app/[locale]/(marketing)" --include=*.tsx | grep -v "50%"
```

Replace with logical properties (`marginInlineStart`, `insetInlineEnd`, `textAlign: "start"` …). Centering transforms (`left: 50%` + `translateX(-50%)`) are symmetric — leave them. In the `<style>` blocks (e.g. header's `.ff-nav-mobile { right: 0 }`, `.ff-resources-panel::before { left: 0; right: 0 }`): `right: 0` → `inset-inline-end: 0`; full-width `left:0;right:0` → `inset-inline: 0`.

- [ ] **Step 3: Directional icons & motion**

- Arrow/chevron icons that indicate forward motion (`arrowR` in CTAs): wrap with `<span className="rtl:-scale-x-100 inline-flex">…` or add the class to the existing icon container. The dropdown chevron (rotates 180° on hover) is symmetric — leave.
- `scroll-reveal.tsx` / any `translate-x` entrance animations: read the file; if reveals slide horizontally, add an RTL counterpart (CSS: `[dir="rtl"] .reveal-x { --tw-translate-x: <negated> }` or duplicate the keyframe under `[dir="rtl"]`). If reveals are only vertical (translate-y/opacity), no change.

- [ ] **Step 4: Visual verification**

Dev server + browser (chrome-devtools MCP): screenshot `/` and `/ar` at 1280px and 375px for: landing, features, tools index, one calculator, login, one onboarding step. Check: mirrored padding/alignment, no overflowing text, dropdown/mobile-menu open on the correct side in RTL, Arabic font rendering (not fallback serif). Then confirm LTR unchanged: the `/` screenshots must match pre-change rendering (compare against production or a stash-diff run).

- [ ] **Step 5: Full checkpoint**

Run: `pnpm --filter web test:i18n && pnpm --filter web type-check && pnpm --filter web build`
Expected: all clean.

---

### Task 11: Language switcher

**Files:**
- Create: `apps/web/components/locale-switcher.tsx`
- Modify: `app/[locale]/(marketing)/components/header.tsx`, `footer.tsx`; dashboard user menu file (locate: `grep -rln "signOut\|Sign out" app/[locale]/(dashboard) components | head` — the component rendering the profile/user dropdown)

**Interfaces:**
- Consumes: `usePathname`, `useRouter` from `@/i18n/navigation`; `useLocale` from `next-intl`; `common.localeSwitcher.*` messages (Task 1).
- Produces: `<LocaleSwitcher />` client component usable anywhere under the provider.

- [ ] **Step 1: Build the switcher**

`apps/web/components/locale-switcher.tsx`:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { routing, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common.localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // replace() keeps history clean; next-intl updates the NEXT_LOCALE cookie.
    router.replace(
      // @ts-expect-error -- pathname+params matches the current route shape
      { pathname, params },
      { locale: next }
    );
  }

  return (
    <div className={className} role="group" aria-label={t("label")}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-current={l === locale ? "true" : undefined}
          className="ff-locale-btn"
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
```

Style `.ff-locale-btn` inline in the header's existing `<style>` block to match `ff-nav-link` (muted, 14.5px, active state = `var(--ff-ink)` + underline). Keep it text-only (EN | العربية) — no globe icon, fits the ink aesthetic.

- [ ] **Step 2: Place it**

- Header: desktop — next to the CTA in the right-side flex group; mobile — inside `ff-nav-mobile` above the CTA.
- Footer: in the bottom meta row (read `footer.tsx`, place beside the copyright line).
- Dashboard user menu: add a menu entry rendering `<LocaleSwitcher />` (Phase 1 only guarantees the control exists and routes correctly; dashboard strings stay English until Phase 2).

- [ ] **Step 3: Verify**

Browser: on `/features` click العربية → URL becomes `/ar/features`, page re-renders RTL; click English → back to `/features`. Cookie check: after switching to Arabic, open `/` in the same session → middleware serves `/ar` (`NEXT_LOCALE` cookie set to `ar` → visiting `/` redirects). On an EN-only page (`/blog`): switcher to Arabic lands on `/ar/blog` → 301 → `/blog` (stays English — acceptable, documented behavior).

Run: `pnpm --filter web type-check` → clean.

---

### Task 12: End-to-end verification sweep

**Files:** none created — verification only.

- [ ] **Step 1: Static checks**

```bash
pnpm --filter web test:i18n
pnpm --filter web test:navigation
pnpm --filter web type-check
pnpm --filter web build
```

Expected: all pass.

- [ ] **Step 2: The full curl matrix (from Task 3 Step 4)**

Re-run all nine curl checks — all must still hold after the content tasks.

- [ ] **Step 3: Browser walk (chrome-devtools MCP)**

1. Fresh profile (no cookies), `Accept-Language: ar` emulation → visit `localhost:3000` → lands on `/ar`, RTL landing in Arabic.
2. Walk: landing → features → tools → calculator (interact with it in Arabic) → login → submit email → check-email — all Arabic, all `/ar/...` URLs.
3. Switch to English via switcher on `/ar/features` → `/features` EN LTR; revisit `/` → stays EN (cookie).
4. English-default visitor: no redirect on `/`, every page visually identical to pre-change.
5. `/ar/blog` → English blog (301). `/ar/nonexistent` → Arabic 404 page.

- [ ] **Step 4: Report**

Summarize for the user: what shipped, the curl/browser evidence, any RTL keeps/compromises from Task 10, and the review surface (all Arabic copy in `messages/ar/*.json` + `landing-data.ar.ts` for native-speaker review). Remind: no commits were made; changes await IDE review.

---

## Self-review notes (already applied)

- Spec coverage: routing/detection (T1–T3), switcher (T11), messages+fallback (T1), fonts/RTL (T2/T10), SEO (T5), marketing content (T6–T7), auth (T8), onboarding (T9), EN-only redirects (T3), parity test (T1), verification (T12). Phase 2 (dashboard) and Phase 3 (widget/`c/[handle]`) are separate future plans per spec.
- `getMessageFallback` in T1 renders the dotted key path, not the English string — next-intl has no built-in "fall back to other locale per key"; true English-string fallback would need loading both locales' messages. Since the parity test makes missing ar keys impossible at CI time, key-path fallback is a dev-only safety net. This deviates from the spec's "renders the English string" — acceptable because parity is enforced; noted for the user.
- `c/[handle]` and `invite` move under `[locale]` (T2) but their strings are NOT extracted in Phase 1 (they render English content regardless of URL locale) — spec assigns their language behavior to Phase 3.
