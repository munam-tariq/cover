# Arabic i18n for FrontFace — Design

**Date:** 2026-07-06
**Status:** Approved (pending user review of this document)
**Goal:** Align FrontFace with the Arabic market: full Arabic translation with RTL across marketing, auth, onboarding, dashboard, and widget, with browser-language auto-detection for first-time visitors.

## Decisions (agreed in brainstorming)

| Question | Decision |
|---|---|
| Scope | Everything: marketing + auth + onboarding + dashboard + widget (phased) |
| Content depth | Core marketing pages fully Arabic; blog, /vs, /use-cases long-form stay English-only |
| Detection | Browser `Accept-Language` (next-intl middleware built-in), persisted in `NEXT_LOCALE` cookie, visible switcher override |
| Translation source | Claude drafts Modern Standard Arabic; user/native speaker reviews before launch |
| Widget language | Project-level setting: `en` / `ar` / `auto` (auto = end-user's `navigator.language`) |
| Architecture | **A:** next-intl v4 with `app/[locale]/` across the whole web app, `localePrefix: 'as-needed'` |

Reference implementations: `onego/OneGo-marketplace/voiture` and `ra-admin_next` (both next-intl v4 with the same `i18n/{routing,request,navigation}` structure). FrontFace follows the same pattern.

## Architecture

### Routing & middleware (`apps/web`)

- **New `apps/web/i18n/`**:
  - `routing.ts` — `defineRouting({ locales: ['en','ar'], defaultLocale: 'en', localePrefix: 'as-needed' })`
  - `request.ts` — `getRequestConfig` that validates the requested locale and merges namespace message files
  - `navigation.ts` — `createNavigation(routing)` exporting locale-aware `Link`, `useRouter`, `usePathname`, `redirect`; all internal links/navigations in the web app switch to these imports
- **Route restructure**: everything in `apps/web/app/` — `(marketing)`, `(auth)`, `(dashboard)`, `(onboarding)`, `invite`, `c` — moves under `apps/web/app/[locale]/`. `sitemap.ts`, `robots.ts`, `image-sitemap.xml`, `global-error.tsx` stay at app root.
- **`[locale]/layout.tsx`** (was root layout): validates locale (`hasLocale` → `notFound()`), calls `setRequestLocale(locale)`, renders `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`, wraps children in `NextIntlClientProvider`, `generateStaticParams` over both locales.
- **`middleware.ts` composition**: run next-intl `createMiddleware(routing)` first (it may redirect `/` → `/ar` on first Arabic-browser visit or rewrite internally), then pass the response through the existing Supabase `updateSession` so auth cookie refresh is preserved on every response, including intl rewrites. Matcher keeps excluding `_next`, static assets, and API routes.
- **Untranslated-content redirect**: before intl middleware, 301 `/ar/blog/*`, `/ar/vs/*`, `/ar/use-cases/*` → same path without `/ar`. No half-translated pages; no duplicate content.

### URLs

- All existing English URLs unchanged (`/`, `/features`, `/dashboard`, …) — zero SEO disruption.
- Arabic mirrors at `/ar/...` for every translated route.
- First visit: Arabic `Accept-Language` → redirect to `/ar`; everyone else sees `/` with no redirect. Choice persists in `NEXT_LOCALE`; cookie wins thereafter.
- Language switcher (EN ⇄ العربية) in marketing header + footer and dashboard user menu; switches URL prefix and updates the cookie.

### Messages

- `apps/web/messages/{en,ar}/` split by namespace: `common.json` (nav, footer, buttons, form labels, errors), `marketing.json`, `auth.json`, `onboarding.json`, `dashboard.json` (may split further per dashboard area in Phase 2 if it grows unwieldy). `request.ts` merges them into one messages object.
- Marketing copy currently hardcoded in `app/(marketing)/landing-data.ts` and the ~20 section components moves into `marketing.json` (structured nesting for feature lists, pricing tiers, calculator labels/results). Calculator logic untouched.
- Key-parity: `en/*` and `ar/*` must have identical key sets (enforced by test, below).
- Missing-key behavior: `getMessageFallback` returns the English string — never a crash or a raw key on screen; dev console warns.

### Typography & RTL

- **Arabic font**: IBM Plex Sans Arabic (400/500/600/700) via `next/font`, exposed as a CSS variable. `html[dir="rtl"]` font stack: IBM Plex Sans Arabic first, Inter as Latin fallback. JetBrains Mono stays for code. Pairs with the monochrome-ink marketing design (`--ff-*` tokens untouched).
- **Numerals**: Western digits (0-9) — the norm for Gulf SaaS.
- **Logical properties**: migrate physical direction Tailwind classes to logical ones (`ml-*`→`ms-*`, `mr-*`→`me-*`, `pl-*`→`ps-*`, `pr-*`→`pe-*`, `left-*`→`start-*`, `right-*`→`end-*`, `text-left`→`text-start`, `text-right`→`text-end`). Measured burden: ~20 occurrences in `(marketing)`, ~137 in `(dashboard)` + `components`. Tailwind 3.4 supports these natively.
- **Directional icons**: chevrons/arrows that indicate flow get `rtl:-scale-x-100`.
- **Animations**: scroll-reveal / transitions using `translate-x` get `rtl:` counterparts so entrances slide from the correct side.

### SEO

- Shared metadata helper (DRY) that every translated page's `generateMetadata` uses: translated title/description + `alternates.languages` hreflang (`en`, `ar`, `x-default` → en) + correct `og:locale` (`en_US` / `ar_SA`).
- Root metadata currently hardcoded in `app/layout.tsx` moves into `[locale]/layout.tsx` and localizes.
- `sitemap.ts`: emits both locale URLs (with hreflang alternates) for translated pages; blog//vs//use-cases remain EN-only entries.

## Phasing

**Phase 1 — Infrastructure + full Arabic visitor journey.** i18n plumbing, `[locale]` restructure, middleware composition, fonts, RTL migration for marketing/auth/onboarding, language switcher, SEO, Arabic copy for: landing, features, integrations index, pricing section, about, terms, privacy, tools index + 5 calculators, auth pages, onboarding flow, plus common chrome. Blog//vs//use-cases redirect rule.

**Phase 2 — Dashboard.** Extract + translate strings across the 33 dashboard page files and shared `components/`; dashboard RTL polish (the ~137 physical classes); switcher in user menu (built in Phase 1, verified against the dashboard here).

**Phase 3 — Widget + hosted chat page.**
- New `language: 'en' | 'ar' | 'auto'` key inside `projects.settings.widget_appearance` (JSONB) — **no DB migration needed**.
- `apps/api/src/routes/embed.ts` `buildWidgetAppearanceConfig` maps it into the client-safe widget config (default `'auto'`).
- Embed settings UI control in `app/(dashboard)/embed/page.tsx`.
- Widget (`apps/widget`, vanilla TS, bundle-size-sensitive): a ~50-line dictionary module (`en`/`ar` string maps + `t()` helper — no library), `dir="rtl"` on the widget container when Arabic, logical-property CSS in widget styles, `auto` resolves via end-user `navigator.language`.
- Hosted `c/[handle]` chat page: in Phases 1–2 it behaves like every other route in the `[locale]` tree (URL/cookie/browser detection). In Phase 3, the project's widget language setting becomes its *default* when the visitor has expressed no choice (no cookie, no explicit `/ar` URL); an explicit visitor choice always wins.

## Error handling

- Invalid locale segment → `notFound()`.
- Missing Arabic key → English fallback (see Messages), console warning in dev.
- Middleware composition failure mode: if intl middleware redirects, Supabase session refresh still runs on the redirect response, so auth cookies never go stale.
- Widget: unknown/absent `language` value → treated as `'auto'`.

## Testing

- **Key-parity test** in existing `tests/`: asserts `messages/en/*` and `messages/ar/*` have identical key sets (CI catches forgotten translations).
- **Middleware tests**: Arabic `Accept-Language` → `/ar` redirect; cookie overrides header; `/ar/blog/*` → `/blog/*` 301; English URLs untouched.
- **Manual verification** on dev: `/` vs `/ar` layout mirroring, switcher round-trip + cookie persistence, Arabic-browser first-visit redirect, auth + onboarding flow in Arabic, English pages pixel-identical to today.
- **Widget (Phase 3)**: setting round-trip dashboard → API → widget; `auto` with an Arabic-locale browser; RTL rendering inside an LTR host page.

## Out of scope

- Translating blog posts, /vs comparisons, /use-cases articles (English-only, redirected from `/ar`).
- Geo-IP detection (browser-language only; can be added later if data shows a need).
- AI answer language behavior (the agent already replies in the end-user's question language via the LLM; no change).
- Locale-aware pricing/currency.
