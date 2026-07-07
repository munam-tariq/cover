# Arabic i18n Phase 2 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize Phase 1 Arabic routing, then add Arabic translation and RTL support across the authenticated dashboard without changing existing English URLs or English behavior.

**Architecture:** Keep the Phase 1 `next-intl` App Router architecture: EN remains unprefixed, AR remains `/ar`, messages stay in `apps/web/messages/{en,ar}/`, and internal dashboard navigation uses `@/i18n/navigation`. Dashboard copy moves into `dashboard.json`; implementation is page-grouped so each batch can pass parity/type checks independently.

**Tech Stack:** Next.js 15.5.19 App Router, next-intl v4, Tailwind 3.4 logical properties, node:test for i18n helper parity, existing `@chatbot/ui` dashboard components.

**Spec:** `docs/superpowers/specs/2026-07-06-arabic-i18n-design.md`

## Global Constraints

- **NEVER run `git add`, `git commit`, or `git push`.** The user reviews all changes in their IDE and commits manually.
- Locales remain exactly `['en', 'ar']`, `defaultLocale: 'en'`, `localePrefix: 'as-needed'`. No `/en` public URLs.
- Blog, `/vs`, and `/use-cases` remain English-only. `/ar/blog/*`, `/ar/vs/*`, `/ar/use-cases/*` 301 to unprefixed paths and must not redirect-loop when `NEXT_LOCALE=ar`.
- Dashboard Arabic copy is Modern Standard Arabic, SaaS register, Western digits (0-9). Draft quality is acceptable for user/native-speaker review.
- `messages/ar/*.json` and `messages/en/*.json` must have identical namespace files and identical key paths. Run `pnpm --filter web test:i18n` after every message-file batch.
- Data returned by the API stays data: project names, visitor messages, uploaded document names, URLs, campaign answers, lead field labels, and AI-generated conversation text are not translated unless they are default UI strings owned by the frontend.
- Do not rename existing CSS variables or UI package APIs. Keep changes scoped to i18n, navigation, and RTL fixes.
- Commands run from `/media/ubuntu/external/cover/cover` unless stated.

---

### Task 1: Phase 1.5 routing stabilization

**Files:**
- Create: `apps/web/i18n/english-only-routes.ts`
- Create: `tests/web/english-only-routes.test.ts`
- Modify: `apps/web/middleware.ts`
- Modify: `apps/web/app/[locale]/layout.tsx`

**Interfaces:**
- Produces: pure route helpers `isEnglishOnlyPath`, `stripArabicPrefixForEnglishOnly`, `defaultLocaleRewritePath`.
- Produces: middleware behavior where EN-only routes render English even when `NEXT_LOCALE=ar`, instead of bouncing between `/blog` and `/ar/blog`.
- Produces: root layout metadata without inherited hreflang alternates, so EN-only pages do not emit Arabic alternates.

- [ ] **Step 1: Write the failing helper test**

Create `tests/web/english-only-routes.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  defaultLocaleRewritePath,
  isEnglishOnlyPath,
  stripArabicPrefixForEnglishOnly,
} from "../../apps/web/i18n/english-only-routes";

test("detects English-only public routes", () => {
  assert.equal(isEnglishOnlyPath("/blog"), true);
  assert.equal(isEnglishOnlyPath("/blog/cut-support-tickets-without-hiring"), true);
  assert.equal(isEnglishOnlyPath("/vs"), true);
  assert.equal(isEnglishOnlyPath("/vs/chatbase"), true);
  assert.equal(isEnglishOnlyPath("/use-cases"), true);
  assert.equal(isEnglishOnlyPath("/use-cases/saas"), true);
  assert.equal(isEnglishOnlyPath("/features"), false);
  assert.equal(isEnglishOnlyPath("/ar/blog"), false);
});

test("strips /ar only for English-only Arabic URLs", () => {
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/blog"), "/blog");
  assert.equal(
    stripArabicPrefixForEnglishOnly("/ar/blog/cut-support-tickets-without-hiring"),
    "/blog/cut-support-tickets-without-hiring"
  );
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/vs/chatbase"), "/vs/chatbase");
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/use-cases/saas"), "/use-cases/saas");
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/features"), null);
  assert.equal(stripArabicPrefixForEnglishOnly("/blog"), null);
});

test("builds internal default-locale rewrite paths", () => {
  assert.equal(defaultLocaleRewritePath("/blog"), "/en/blog");
  assert.equal(defaultLocaleRewritePath("/blog/post"), "/en/blog/post");
  assert.equal(defaultLocaleRewritePath("/vs/chatbase"), "/en/vs/chatbase");
});
```

Run:

```bash
node --experimental-strip-types --test tests/web/english-only-routes.test.ts
```

Expected: FAIL with module-not-found for `apps/web/i18n/english-only-routes`.

- [ ] **Step 2: Add the pure route helper**

Create `apps/web/i18n/english-only-routes.ts`:

```ts
export const EN_ONLY_PREFIXES = ["/blog", "/vs", "/use-cases"] as const;

export function isEnglishOnlyPath(pathname: string): boolean {
  return EN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function stripArabicPrefixForEnglishOnly(pathname: string): string | null {
  if (!(pathname === "/ar" || pathname.startsWith("/ar/"))) {
    return null;
  }

  const stripped = pathname.slice(3) || "/";
  return isEnglishOnlyPath(stripped) ? stripped : null;
}

export function defaultLocaleRewritePath(pathname: string): string {
  return `/en${pathname === "/" ? "" : pathname}`;
}
```

Run:

```bash
node --experimental-strip-types --test tests/web/english-only-routes.test.ts
```

Expected: PASS.

- [ ] **Step 3: Use the helper in middleware**

Modify `apps/web/middleware.ts` so it imports the helper:

```ts
import {
  defaultLocaleRewritePath,
  isEnglishOnlyPath,
  stripArabicPrefixForEnglishOnly,
} from "./i18n/english-only-routes";
```

Remove the local `EN_ONLY_PREFIXES` constant.

Replace the existing EN-only redirect block with this code before the Supabase session refresh:

```ts
  const strippedEnglishOnlyPath = stripArabicPrefixForEnglishOnly(pathname);
  if (strippedEnglishOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = strippedEnglishOnlyPath;
    return NextResponse.redirect(url, 301);
  }

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
```

Keep the later generic session refresh plus `intlMiddleware(request)` branch unchanged.

- [ ] **Step 4: Stop root layout alternates from leaking onto EN-only pages**

In `apps/web/app/[locale]/layout.tsx`, remove the `localizedAlternates` import and remove this property from `generateMetadata`:

```ts
alternates: localizedAlternates("/"),
```

Keep page-level alternates in translated pages such as `/`, `/features`, `/tools`, `/about`, `/privacy`, and `/terms`. Blog, `/vs`, and `/use-cases` page metadata should continue to define only canonical URLs.

- [ ] **Step 5: Static verification**

Run:

```bash
pnpm --filter web test:i18n
node --experimental-strip-types --test tests/web/english-only-routes.test.ts
pnpm --filter web type-check
```

Expected: all pass.

- [ ] **Step 6: Dev-server regression matrix**

With the dev server running on port 3000, run:

```bash
curl -sI http://localhost:3000/blog -H "Cookie: NEXT_LOCALE=ar" | grep -iE "HTTP|location|x-middleware-rewrite"
curl -sI http://localhost:3000/vs/chatbase -H "Cookie: NEXT_LOCALE=ar" | grep -iE "HTTP|location|x-middleware-rewrite"
curl -sI http://localhost:3000/use-cases/saas -H "Cookie: NEXT_LOCALE=ar" | grep -iE "HTTP|location|x-middleware-rewrite"
curl -sI http://localhost:3000/ar/blog | grep -iE "HTTP|location"
curl -sI http://localhost:3000/ar/vs/chatbase | grep -iE "HTTP|location"
curl -sI http://localhost:3000/ar/use-cases/saas | grep -iE "HTTP|location"
curl -sI http://localhost:3000/features -H "Cookie: NEXT_LOCALE=ar" | grep -iE "HTTP|location"
curl -sI http://localhost:3000/blog | grep -i 'hreflang="ar"' || true
curl -sI http://localhost:3000/features | grep -i 'hreflang="ar"'
```

Expected:
- `/blog`, `/vs/chatbase`, `/use-cases/saas` with `NEXT_LOCALE=ar` return `HTTP/1.1 200 OK` and no `location:` header.
- Those unprefixed EN-only routes show `x-middleware-rewrite: /en/...`.
- `/ar/blog`, `/ar/vs/chatbase`, `/ar/use-cases/saas` return `301` to the unprefixed path.
- `/features` with `NEXT_LOCALE=ar` still redirects to `/ar/features`.
- `/blog` does not emit Arabic hreflang; `/features` still emits Arabic hreflang.

---

### Task 2: Dashboard i18n namespace and shell

**Files:**
- Create: `apps/web/messages/en/dashboard.json`
- Create: `apps/web/messages/ar/dashboard.json`
- Modify: `apps/web/i18n/request.ts`
- Modify: `apps/web/components/layout/sidebar.tsx`
- Modify: `apps/web/components/layout/header.tsx`
- Modify: `apps/web/components/layout/agent-status-dropdown.tsx`
- Modify: `apps/web/components/layout/project-switcher.tsx`
- Modify: `apps/web/components/layout/project-guard.tsx`
- Modify: `apps/web/components/layout/dashboard-loading-skeleton.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/loading.tsx`

**Interfaces:**
- Consumes: `useTranslations` from `next-intl`.
- Consumes: `Link`, `useRouter`, `usePathname` from `@/i18n/navigation` for internal dashboard links.
- Produces: `dashboard.shell.*`, `dashboard.status.*`, `dashboard.states.*`, and `dashboard.actions.*` messages used by all dashboard pages.

- [ ] **Step 1: Add the namespace to request config**

In `apps/web/i18n/request.ts`, extend `NAMESPACES`:

```ts
const NAMESPACES = ["common", "marketing", "auth", "onboarding", "legal", "dashboard"] as const;
```

- [ ] **Step 2: Seed dashboard messages**

Create `apps/web/messages/en/dashboard.json`:

```json
{
  "shell": {
    "sidebar": {
      "nav": {
        "dashboard": "Dashboard",
        "inbox": "Inbox",
        "team": "Team",
        "projects": "Agents",
        "leads": "Leads",
        "analytics": "Analytics",
        "feedback": "Feedback",
        "pulse": "Pulse",
        "playground": "Playground",
        "knowledge": "Knowledge Base",
        "apiEndpoints": "API Endpoints",
        "embed": "Embed",
        "settings": "Settings"
      },
      "agentStatus": "Agent Status"
    },
    "header": {
      "userFallback": "User",
      "signedIn": "Signed in",
      "profile": "Profile",
      "language": "Language",
      "signOut": "Sign out",
      "signingOut": "Signing out...",
      "notifications": "Notifications"
    },
    "projectSwitcher": {
      "loading": "Loading projects...",
      "noProjects": "No projects yet",
      "newProject": "New Project",
      "viewAllProjects": "View all projects",
      "currentProject": "Current project"
    },
    "projectGuard": {
      "redirecting": "Redirecting to setup...",
      "noProjectTitle": "No project selected",
      "noProjectDescription": "Create or select a project to continue."
    }
  },
  "status": {
    "title": "Agent Status",
    "loading": "Loading...",
    "online": "Online",
    "away": "Away",
    "offline": "Offline",
    "onlineDescription": "Accepting new conversations",
    "awayDescription": "Not accepting new conversations",
    "offlineDescription": "Not available for chat",
    "updateError": "Failed to update status"
  },
  "actions": {
    "save": "Save",
    "saving": "Saving...",
    "cancel": "Cancel",
    "delete": "Delete",
    "copy": "Copy",
    "copied": "Copied",
    "refresh": "Refresh",
    "generate": "Generate",
    "regenerate": "Regenerate",
    "edit": "Edit",
    "add": "Add",
    "remove": "Remove",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "open": "Open",
    "test": "Test"
  },
  "states": {
    "loading": "Loading...",
    "empty": "Nothing here yet.",
    "error": "Something went wrong. Please try again.",
    "notFound": "Not found",
    "saved": "Saved"
  },
  "pages": {}
}
```

Create `apps/web/messages/ar/dashboard.json` with the same keys:

```json
{
  "shell": {
    "sidebar": {
      "nav": {
        "dashboard": "لوحة التحكم",
        "inbox": "صندوق المحادثات",
        "team": "الفريق",
        "projects": "الوكلاء",
        "leads": "العملاء المحتملون",
        "analytics": "التحليلات",
        "feedback": "التقييمات",
        "pulse": "نبض العملاء",
        "playground": "ساحة التجربة",
        "knowledge": "قاعدة المعرفة",
        "apiEndpoints": "نقاط API",
        "embed": "التضمين",
        "settings": "الإعدادات"
      },
      "agentStatus": "حالة الوكيل"
    },
    "header": {
      "userFallback": "مستخدم",
      "signedIn": "تم تسجيل الدخول",
      "profile": "الملف الشخصي",
      "language": "اللغة",
      "signOut": "تسجيل الخروج",
      "signingOut": "جارٍ تسجيل الخروج...",
      "notifications": "الإشعارات"
    },
    "projectSwitcher": {
      "loading": "جارٍ تحميل المشاريع...",
      "noProjects": "لا توجد مشاريع بعد",
      "newProject": "مشروع جديد",
      "viewAllProjects": "عرض كل المشاريع",
      "currentProject": "المشروع الحالي"
    },
    "projectGuard": {
      "redirecting": "جارٍ تحويلك إلى الإعداد...",
      "noProjectTitle": "لم يتم تحديد مشروع",
      "noProjectDescription": "أنشئ مشروعًا أو اختر مشروعًا للمتابعة."
    }
  },
  "status": {
    "title": "حالة الوكيل",
    "loading": "جارٍ التحميل...",
    "online": "متصل",
    "away": "بعيد",
    "offline": "غير متصل",
    "onlineDescription": "يستقبل محادثات جديدة",
    "awayDescription": "لا يستقبل محادثات جديدة",
    "offlineDescription": "غير متاح للدردشة",
    "updateError": "تعذر تحديث الحالة"
  },
  "actions": {
    "save": "حفظ",
    "saving": "جارٍ الحفظ...",
    "cancel": "إلغاء",
    "delete": "حذف",
    "copy": "نسخ",
    "copied": "تم النسخ",
    "refresh": "تحديث",
    "generate": "إنشاء",
    "regenerate": "إعادة الإنشاء",
    "edit": "تعديل",
    "add": "إضافة",
    "remove": "إزالة",
    "close": "إغلاق",
    "back": "رجوع",
    "next": "التالي",
    "open": "فتح",
    "test": "اختبار"
  },
  "states": {
    "loading": "جارٍ التحميل...",
    "empty": "لا يوجد شيء هنا بعد.",
    "error": "حدث خطأ ما. حاول مرة أخرى.",
    "notFound": "غير موجود",
    "saved": "تم الحفظ"
  },
  "pages": {}
}
```

- [ ] **Step 3: Translate sidebar and make links locale-aware**

In `apps/web/components/layout/sidebar.tsx`:

```ts
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
```

Change `label` to `labelKey` in `allNavItems`:

```ts
{ href: "/dashboard", labelKey: "dashboard", icon: "home", roles: undefined },
{ href: "/inbox", labelKey: "inbox", icon: "inbox", roles: undefined },
{ href: "/team", labelKey: "team", icon: "users", roles: undefined },
{ href: "/projects", labelKey: "projects", icon: "folder", roles: "owner" as const },
{ href: "/leads", labelKey: "leads", icon: "user-plus", roles: "owner" as const },
{ href: "/analytics", labelKey: "analytics", icon: "bar-chart", roles: "owner" as const },
{ href: "/feedback", labelKey: "feedback", icon: "thumbs-up", roles: "owner" as const },
{ href: "/pulse", labelKey: "pulse", icon: "activity", roles: "owner" as const },
{ href: "/playground", labelKey: "playground", icon: "sparkles", roles: "owner_admin" as const },
{ href: "/knowledge", labelKey: "knowledge", icon: "book", roles: "owner_admin" as const },
{ href: "/api-endpoints", labelKey: "apiEndpoints", icon: "code", roles: "owner" as const },
{ href: "/embed", labelKey: "embed", icon: "code-2", roles: "owner" as const },
{ href: "/settings", labelKey: "settings", icon: "settings", roles: "owner_admin" as const },
```

Inside `Sidebar()` add:

```ts
const t = useTranslations("dashboard.shell.sidebar");
const statusT = useTranslations("dashboard.status");
```

Render labels through translations:

```tsx
<span className="flex-1">{t(`nav.${item.labelKey}`)}</span>
```

Render the status title and status value through translations:

```tsx
<p>{t("agentStatus")}</p>
<span className="capitalize">
  {statusT(availability?.status ?? "offline")}
</span>
```

Change `border-r` to `border-e`.

- [ ] **Step 4: Translate header and make router locale-aware**

In `apps/web/components/layout/header.tsx`:

```ts
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
```

Inside `Header()`:

```ts
const t = useTranslations("dashboard.shell.header");
```

Use these replacements:

```tsx
<button
  aria-label={t("notifications")}
  className="p-2 rounded-md hover:bg-muted transition-colors"
>
<div className="absolute end-0 mt-2 w-56 bg-card border rounded-md shadow-lg py-1 z-50">
<p className="text-sm font-medium truncate">{user?.email || t("userFallback")}</p>
<p className="text-xs text-muted-foreground">{t("signedIn")}</p>
{t("profile")}
<span className="text-muted-foreground">{t("language")}</span>
{isLoggingOut ? t("signingOut") : t("signOut")}
```

Change physical alignment classes in this file:
- `right-0` to `end-0`
- `text-left` to `text-start`

Keep `router.push("/login")`; the locale-aware router preserves `/ar/login` when the current locale is Arabic.

- [ ] **Step 5: Translate shared shell components**

Apply the same pattern:
- `apps/web/components/layout/agent-status-dropdown.tsx` uses `useTranslations("dashboard.status")`.
- `apps/web/components/layout/project-switcher.tsx` uses `useTranslations("dashboard.shell.projectSwitcher")`.
- `apps/web/components/layout/project-guard.tsx` uses `useTranslations("dashboard.shell.projectGuard")`.
- `apps/web/components/layout/dashboard-loading-skeleton.tsx` and `apps/web/app/[locale]/(dashboard)/loading.tsx` use `dashboard.states.loading`.

Run:

```bash
pnpm --filter web test:i18n
pnpm --filter web type-check
```

Expected: both pass.

---

### Task 3: Dashboard overview and reporting pages

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/analytics/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/feedback/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/profile/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**
- Produces: `dashboard.pages.home.*`, `dashboard.pages.analytics.*`, `dashboard.pages.feedback.*`, `dashboard.pages.profile.*`.
- Consumes: `useTranslations("dashboard.pages.<page>")` and shared `dashboard.actions` / `dashboard.states`.

- [ ] **Step 1: Add overview page keys**

Extend `dashboard.json` under `pages.home` with keys matching the current UI:

```json
"home": {
  "title": "Dashboard",
  "loading": "Loading...",
  "welcomeWithProject": "Welcome to {projectName}",
  "welcomeGeneric": "Welcome to your chatbot command center",
  "setupProgress": "Setup Progress",
  "setupProgressCount": "{completed}/{total} complete",
  "setupProgressDescription": "Complete these steps to get your chatbot live",
  "stats": {
    "totalConversations": "Total Conversations",
    "totalLeads": "Total Leads",
    "qualifiedProspects": "Qualified Prospects",
    "completionRate": "Completion Rate",
    "qualificationRate": "Qualification Rate",
    "disqualificationRate": "Disqualification Rate"
  },
  "setupCompleteTitle": "Setup Complete!",
  "setupCompleteDescription": "Your chatbot is live and ready to help your visitors",
  "quickActions": {
    "testTitle": "Test Your Chatbot",
    "testDescription": "Try out your chatbot in the playground to see how it responds to questions.",
    "settingsTitle": "Configure Settings",
    "settingsDescription": "Customize your chatbot behavior, appearance, and handoff settings."
  }
}
```

Add the Arabic equivalent under the same key path:

```json
"home": {
  "title": "لوحة التحكم",
  "loading": "جارٍ التحميل...",
  "welcomeWithProject": "مرحبًا بك في {projectName}",
  "welcomeGeneric": "مرحبًا بك في مركز إدارة روبوت الدردشة",
  "setupProgress": "تقدم الإعداد",
  "setupProgressCount": "{completed}/{total} مكتمل",
  "setupProgressDescription": "أكمل هذه الخطوات لتشغيل روبوت الدردشة",
  "stats": {
    "totalConversations": "إجمالي المحادثات",
    "totalLeads": "إجمالي العملاء المحتملين",
    "qualifiedProspects": "العملاء المؤهلون",
    "completionRate": "معدل الإكمال",
    "qualificationRate": "معدل التأهيل",
    "disqualificationRate": "معدل الاستبعاد"
  },
  "setupCompleteTitle": "اكتمل الإعداد!",
  "setupCompleteDescription": "روبوت الدردشة جاهز الآن لمساعدة زوارك",
  "quickActions": {
    "testTitle": "اختبر روبوت الدردشة",
    "testDescription": "جرّب روبوت الدردشة في ساحة التجربة لترى كيف يجيب عن الأسئلة.",
    "settingsTitle": "اضبط الإعدادات",
    "settingsDescription": "خصص سلوك روبوت الدردشة ومظهره وإعدادات التحويل إلى البشر."
  }
}
```

- [ ] **Step 2: Update dashboard page**

In `dashboard/page.tsx`:
- Import `useTranslations` from `next-intl`.
- Import `Link` from `@/i18n/navigation`.
- Add `const t = useTranslations("dashboard.pages.home");`.
- Replace visible hardcoded strings with explicit calls to the keys added in Step 1, such as `t("title")`, `t("loading")`, `t("setupProgress")`, `t("stats.totalConversations")`, `t("setupCompleteTitle")`, and `t("quickActions.testTitle")`.
- Keep `step.label` and `step.description` as API data for now, because the onboarding endpoint owns those values.

Use this shape for the project welcome:

```tsx
{currentProject ? (
  <>{t("welcomeWithProject", { projectName: currentProject.name })}</>
) : (
  t("welcomeGeneric")
)}
```

Use shared `dashboard.actions` only for labels already in the shared namespace.

- [ ] **Step 3: Translate analytics, feedback, and profile pages**

For each page:
- Add a namespace under `pages.analytics`, `pages.feedback`, or `pages.profile`.
- Move visible headings, chart titles, table headings, filter labels, empty states, button labels, toast/success/error copy, and confirmation prompts into `dashboard.json`.
- Leave timestamps, visitor-provided feedback, conversation snippets, project names, and API error messages as data.
- Use ICU placeholders for counts and percentages: `{count}`, `{percent}`, `{period}`.

Run after each page:

```bash
pnpm --filter web test:i18n
```

Run after all three:

```bash
pnpm --filter web type-check
```

Expected: both pass.

---

### Task 4: Conversations, leads, and team pages

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/leads/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/leads/constants.ts`
- Modify: `apps/web/app/[locale]/(dashboard)/leads/components/lead-detail-panel.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/leads/components/lead-list-item.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/leads/components/lead-list-panel.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/team/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**
- Produces: `dashboard.pages.inbox.*`, `dashboard.pages.leads.*`, `dashboard.pages.team.*`.
- Keeps conversation messages and lead values unmodified.

- [ ] **Step 1: Translate inbox list**

In `inbox/page.tsx`:
- Import locale-aware `Link`.
- Use `useTranslations("dashboard.pages.inbox")`.
- Translate tabs/filters such as queue, assigned, closed, waiting, active, search placeholders, empty states, loading states, and error messages.
- Leave customer names, snippets, URLs, and message body text as data.

Required English keys:

```json
"inbox": {
  "title": "Inbox",
  "subtitle": "Manage conversations that need human attention.",
  "tabs": {
    "queue": "Queue",
    "assigned": "Assigned",
    "closed": "Closed"
  },
  "filters": {
    "searchPlaceholder": "Search conversations...",
    "allStatuses": "All statuses"
  },
  "states": {
    "empty": "No conversations found.",
    "loading": "Loading conversations...",
    "error": "Failed to load conversations."
  },
  "actions": {
    "openConversation": "Open conversation",
    "assignToMe": "Assign to me",
    "closeConversation": "Close conversation"
  }
}
```

Required Arabic keys mirror the same structure:

```json
"inbox": {
  "title": "صندوق المحادثات",
  "subtitle": "إدارة المحادثات التي تحتاج إلى تدخل بشري.",
  "tabs": {
    "queue": "الانتظار",
    "assigned": "المسندة إليّ",
    "closed": "المغلقة"
  },
  "filters": {
    "searchPlaceholder": "ابحث في المحادثات...",
    "allStatuses": "كل الحالات"
  },
  "states": {
    "empty": "لم يتم العثور على محادثات.",
    "loading": "جارٍ تحميل المحادثات...",
    "error": "تعذر تحميل المحادثات."
  },
  "actions": {
    "openConversation": "فتح المحادثة",
    "assignToMe": "إسنادها إليّ",
    "closeConversation": "إغلاق المحادثة"
  }
}
```

- [ ] **Step 2: Translate inbox detail**

In `inbox/[id]/page.tsx`:
- Translate header labels, timeline labels, composer placeholder, human handoff states, status badges, assignment controls, and error/empty states.
- Keep message content, visitor identity, and agent names as data.
- Use shared `dashboard.actions` for buttons where the meaning matches exactly.

- [ ] **Step 3: Translate leads feature**

In `leads/constants.ts`, replace exported display labels with translation keys:

```ts
export const LEAD_STAGE_KEYS = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  disqualified: "disqualified",
  converted: "converted",
} as const;
```

In lead UI components, translate those keys through `dashboard.pages.leads.stages.<key>`.

Add these base keys:

```json
"leads": {
  "title": "Leads",
  "subtitle": "Review and qualify captured leads.",
  "searchPlaceholder": "Search leads...",
  "empty": "No leads found.",
  "stages": {
    "new": "New",
    "contacted": "Contacted",
    "qualified": "Qualified",
    "disqualified": "Disqualified",
    "converted": "Converted"
  },
  "fields": {
    "email": "Email",
    "source": "Source",
    "created": "Created",
    "qualification": "Qualification",
    "notes": "Notes"
  }
}
```

Arabic:

```json
"leads": {
  "title": "العملاء المحتملون",
  "subtitle": "راجع العملاء المحتملين الذين تم التقاطهم وقم بتأهيلهم.",
  "searchPlaceholder": "ابحث في العملاء المحتملين...",
  "empty": "لا توجد عملاء محتملون.",
  "stages": {
    "new": "جديد",
    "contacted": "تم التواصل",
    "qualified": "مؤهل",
    "disqualified": "مستبعد",
    "converted": "تم التحويل"
  },
  "fields": {
    "email": "البريد الإلكتروني",
    "source": "المصدر",
    "created": "تاريخ الإنشاء",
    "qualification": "التأهيل",
    "notes": "الملاحظات"
  }
}
```

- [ ] **Step 4: Translate team page**

In `team/page.tsx`:
- Translate title, invite controls, role labels, status labels, empty state, loading state, and errors.
- Keep member emails and names as data.

Run:

```bash
pnpm --filter web test:i18n
pnpm --filter web type-check
```

Expected: both pass.

---

### Task 5: Project, knowledge, playground, embed, API, and settings pages

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/projects/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/agent-header.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/channels-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/endpoints-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/handoff-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/knowledge-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/lead-capture-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/overview-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/public-page-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/widget-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/knowledge/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/playground/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/embed/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/api-endpoints/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/settings/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/settings/handoff/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**
- Produces: `dashboard.pages.projects.*`, `dashboard.pages.projectDetail.*`, `dashboard.pages.knowledge.*`, `dashboard.pages.playground.*`, `dashboard.pages.embed.*`, `dashboard.pages.apiEndpoints.*`, `dashboard.pages.settings.*`.
- Leaves code snippets, script tags, URLs, API keys, project names, and uploaded source names unchanged.

- [ ] **Step 1: Translate project list and project detail shell**

Use `useTranslations("dashboard.pages.projects")` in `projects/page.tsx` and `useTranslations("dashboard.pages.projectDetail")` in `projects/[projectId]/page.tsx`.

Required tab keys for project detail:

```json
"projectDetail": {
  "tabs": {
    "overview": "Overview",
    "knowledge": "Knowledge",
    "widget": "Widget",
    "leadCapture": "Lead Capture",
    "handoff": "Handoff",
    "channels": "Channels",
    "endpoints": "Endpoints",
    "publicPage": "Public Page"
  }
}
```

Arabic:

```json
"projectDetail": {
  "tabs": {
    "overview": "نظرة عامة",
    "knowledge": "المعرفة",
    "widget": "الأداة",
    "leadCapture": "التقاط العملاء",
    "handoff": "التحويل البشري",
    "channels": "القنوات",
    "endpoints": "نقاط النهاية",
    "publicPage": "الصفحة العامة"
  }
}
```

- [ ] **Step 2: Translate widget and embed settings**

In `embed/page.tsx` and `projects/[projectId]/components/widget-tab.tsx`:
- Translate appearance labels, helper text, copy buttons, upload errors, preview controls, domain whitelist text, mobile SDK key text, and success/error messages.
- Keep the generated embed code, domains, keys, URLs, and script URLs unchanged.
- Keep `localeDefault` as a plain string setting for now. The full widget language control is Phase 3, but labels around this existing setting should be translated.

Use shared keys:

```json
"embed": {
  "title": "Embed",
  "subtitle": "Customize and install your website chat widget.",
  "preview": "Preview",
  "desktop": "Desktop",
  "mobile": "Mobile",
  "embedCode": "Embed Code",
  "copyEmbedCode": "Copy embed code",
  "domainWhitelist": "Domain Whitelist",
  "domainWhitelistDescription": "Restrict which websites can embed your chat widget. Leave empty to allow all domains.",
  "invalidDomain": "Invalid domain format. Example: example.com or *.example.com",
  "domainAlreadyAdded": "Domain already added",
  "domainsUpdated": "Domain whitelist updated ({count} domains)",
  "domainsDisabled": "Domain whitelist disabled"
}
```

Arabic:

```json
"embed": {
  "title": "التضمين",
  "subtitle": "خصص أداة الدردشة وثبّتها على موقعك.",
  "preview": "المعاينة",
  "desktop": "سطح المكتب",
  "mobile": "الجوال",
  "embedCode": "كود التضمين",
  "copyEmbedCode": "نسخ كود التضمين",
  "domainWhitelist": "قائمة النطاقات المسموحة",
  "domainWhitelistDescription": "حدد المواقع التي يمكنها تضمين أداة الدردشة. اتركها فارغة للسماح بكل النطاقات.",
  "invalidDomain": "صيغة النطاق غير صحيحة. مثال: example.com أو *.example.com",
  "domainAlreadyAdded": "تمت إضافة هذا النطاق مسبقًا",
  "domainsUpdated": "تم تحديث قائمة النطاقات المسموحة ({count} نطاقات)",
  "domainsDisabled": "تم تعطيل قائمة النطاقات المسموحة"
}
```

- [ ] **Step 3: Translate knowledge and playground**

In `knowledge/page.tsx`:
- Translate headings, upload controls, source type labels, indexing/crawl status labels, table headers, empty states, and delete confirmations.
- Keep source URLs, file names, crawl titles, and backend extraction output as data.

In `playground/page.tsx`:
- Translate shell labels, placeholders, empty state, test prompt suggestions, source labels, error states, and action buttons.
- Keep chat content and model answers as data.

- [ ] **Step 4: Translate API endpoints and settings**

In `api-endpoints/page.tsx`:
- Translate headings, descriptions, endpoint labels, copy buttons, access warnings, and empty states.
- Keep URLs, HTTP methods, keys, tokens, JSON payload examples, and code blocks unchanged.

In `settings/page.tsx` and `settings/handoff/page.tsx`:
- Translate headings, form labels, helper text, validation messages, status messages, and buttons.
- Keep email addresses, webhook URLs, and provider names unchanged.

Run:

```bash
pnpm --filter web test:i18n
pnpm --filter web type-check
```

Expected: both pass.

---

### Task 6: Pulse campaigns

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/pulse/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/pulse/new/page.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/pulse/[id]/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**
- Produces: `dashboard.pages.pulse.*`.
- Keeps campaign response text, visitor-provided answers, page URLs, generated AI summaries, and CSV data values as data.

- [ ] **Step 1: Translate campaign list and builder**

Add keys under `pages.pulse`:

```json
"pulse": {
  "title": "Pulse",
  "subtitle": "Collect short feedback from visitors.",
  "newCampaign": "New campaign",
  "campaignTypes": {
    "nps": "NPS Score",
    "poll": "Quick Poll",
    "sentiment": "Sentiment",
    "open": "Open Feedback"
  },
  "states": {
    "loading": "Loading campaigns...",
    "empty": "No campaigns yet.",
    "notFound": "Campaign not found",
    "loadError": "Failed to load campaign data"
  },
  "metrics": {
    "responses": "Responses",
    "totalResponses": "Total Responses",
    "uniqueVisitors": "Unique Visitors",
    "status": "Status",
    "breakdown": "Breakdown"
  },
  "actions": {
    "create": "Create campaign",
    "deleteConfirm": "Delete this campaign and all its responses?",
    "generateSummary": "Generate AI summary",
    "regenerateSummary": "Regenerate",
    "exportCsv": "Export CSV"
  }
}
```

Arabic:

```json
"pulse": {
  "title": "نبض العملاء",
  "subtitle": "اجمع ملاحظات قصيرة من زوارك.",
  "newCampaign": "حملة جديدة",
  "campaignTypes": {
    "nps": "درجة NPS",
    "poll": "استطلاع سريع",
    "sentiment": "المشاعر",
    "open": "ملاحظات مفتوحة"
  },
  "states": {
    "loading": "جارٍ تحميل الحملات...",
    "empty": "لا توجد حملات بعد.",
    "notFound": "الحملة غير موجودة",
    "loadError": "تعذر تحميل بيانات الحملة"
  },
  "metrics": {
    "responses": "الردود",
    "totalResponses": "إجمالي الردود",
    "uniqueVisitors": "زوار فريدون",
    "status": "الحالة",
    "breakdown": "التفصيل"
  },
  "actions": {
    "create": "إنشاء حملة",
    "deleteConfirm": "هل تريد حذف هذه الحملة وكل ردودها؟",
    "generateSummary": "إنشاء ملخص بالذكاء الاصطناعي",
    "regenerateSummary": "إعادة الإنشاء",
    "exportCsv": "تصدير CSV"
  }
}
```

- [ ] **Step 2: Update the three Pulse pages**

In each Pulse page:
- Import `useTranslations`.
- Translate all visible strings, confirmation prompts, chart labels, cards, tabs, form labels, validation messages, and action labels.
- For CSV export headers, translate exported column names only if the UI currently exports English headers. Keep response values unchanged.
- For `summary` content returned by AI, do not translate; it is generated data.

Run:

```bash
pnpm --filter web test:i18n
pnpm --filter web type-check
```

Expected: both pass.

---

### Task 7: Dashboard navigation and RTL polish

**Files:**
- Modify: every dashboard file still importing `next/link` for internal app navigation.
- Modify: every dashboard file still importing `useRouter`, `usePathname`, or `redirect` from `next/navigation` where the call navigates to an internal app route.
- Modify: dashboard files flagged by the physical-class audits below.

**Interfaces:**
- Produces: dashboard links and router pushes preserve active locale.
- Produces: dashboard layout mirrors cleanly in RTL without changing LTR layout.

- [ ] **Step 1: Navigation import sweep**

Run:

```bash
rg -n 'from "next/link"|from "next/navigation"' 'apps/web/app/[locale]/(dashboard)' apps/web/components/layout
```

For internal links:

```ts
import { Link } from "@/i18n/navigation";
```

For internal router navigation:

```ts
import { useRouter, usePathname } from "@/i18n/navigation";
```

Keep these imports from `next/navigation` when used:
- `useSearchParams`
- `useParams`
- `notFound`

If a file needs both kinds of imports, use both modules explicitly:

```ts
import { useParams, useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
```

- [ ] **Step 2: Tailwind logical-property sweep**

Run:

```bash
rg -n '\b(ml|mr|pl|pr)-[0-9.]+|\b(left|right)-[0-9.]+|text-(left|right)\b|\brounded-(l|r)\b|\bborder-(l|r)\b' 'apps/web/app/[locale]/(dashboard)' apps/web/components/layout
```

Apply these replacements when the direction is semantic:
- `ml-*` to `ms-*`
- `mr-*` to `me-*`
- `pl-*` to `ps-*`
- `pr-*` to `pe-*`
- `left-*` to `start-*`
- `right-*` to `end-*`
- `text-left` to `text-start`
- `text-right` to `text-end`
- `rounded-l*` to `rounded-s*`
- `rounded-r*` to `rounded-e*`
- `border-l` to `border-s`
- `border-r` to `border-e`

Keep physical positioning only where the product explicitly pins a preview or launcher to a physical side, such as a bottom-right widget position preview.

- [ ] **Step 3: Directional icon sweep**

Run:

```bash
rg -n 'ArrowRight|ChevronRight|arrow-right|chevron-right|rotate\\(-90deg\\)' 'apps/web/app/[locale]/(dashboard)' apps/web/components/layout
```

For icons that mean forward/back or previous/next, add:

```tsx
className="h-4 w-4 rtl:-scale-x-100"
```

Do not mirror symmetric icons, dropdown chevrons, notification bells, status dots, or charts.

- [ ] **Step 4: Full static verification**

Run:

```bash
pnpm --filter web test:i18n
pnpm --filter web test:navigation
node --experimental-strip-types --test tests/web/english-only-routes.test.ts
pnpm --filter web type-check
pnpm --filter web build
```

Expected: all pass.

---

### Task 8: Browser verification and review surface

**Files:** none.

- [ ] **Step 1: Authenticated Arabic dashboard walkthrough**

Using a dev account with dashboard access, verify these routes in both English and Arabic:

```text
/dashboard
/inbox
/inbox/<conversation-id>
/projects
/projects/<project-id>
/knowledge
/playground
/embed
/api-endpoints
/settings
/settings/handoff
/analytics
/feedback
/leads
/team
/pulse
/pulse/new
/pulse/<campaign-id>
```

Expected:
- `/ar/...` pages render Arabic dashboard chrome and page UI.
- Internal navigation preserves `/ar`.
- Data values remain unchanged.
- Tables, panels, menus, and forms do not overlap in RTL.
- English pages remain LTR and keep existing URLs.

- [ ] **Step 2: Screenshot check**

Capture or manually inspect desktop width `1280px` and mobile width `375px` for:

```text
/ar/dashboard
/ar/inbox
/ar/projects/<project-id>
/ar/embed
/ar/pulse
```

Expected:
- Sidebar/header align correctly.
- Dropdowns open from the correct logical side.
- Long Arabic button labels wrap or truncate cleanly.
- Cards are not nested inside unrelated cards.
- Tables remain horizontally scrollable where needed.

- [ ] **Step 3: Final curl matrix**

Re-run the Phase 1.5 route checks:

```bash
curl -sI http://localhost:3000/blog -H "Cookie: NEXT_LOCALE=ar" | grep -iE "HTTP|location|x-middleware-rewrite"
curl -sI http://localhost:3000/ar/blog | grep -iE "HTTP|location"
curl -sI http://localhost:3000/dashboard | grep -i location
curl -sI http://localhost:3000/ar/dashboard | grep -i location
```

Expected:
- EN-only pages do not loop.
- `/ar/blog` still strips to `/blog`.
- unauthenticated `/dashboard` redirects to `/login`.
- unauthenticated `/ar/dashboard` redirects to `/ar/login`.

- [ ] **Step 4: User review surface**

Tell the user the main review files are:

```text
apps/web/messages/ar/dashboard.json
apps/web/components/layout/sidebar.tsx
apps/web/components/layout/header.tsx
apps/web/app/[locale]/(dashboard)/**
```

Do not stage or commit. The user reviews and commits manually.

---

## Phase 3 Handoff: Widget + Public Hosted Page

Do not implement widget/public page translation in this Phase 2 plan. After dashboard passes, create a separate Phase 3 plan for:

- `apps/web/app/[locale]/(dashboard)/embed/page.tsx`: formal project-level widget language control with values `auto`, `en`, `ar`.
- `apps/api/src/routes/embed.ts`: map `settings.widget_appearance.language` or the existing `locale_default` into the client-safe config.
- `apps/widget/src/utils/widget-appearance.ts`: add Arabic dictionary entries, normalize `auto`, and return `dir: "rtl" | "ltr"` or `isRtl`.
- `apps/widget/src/widget.ts`: set `dir="rtl"` on the widget wrapper for Arabic.
- `apps/widget/src/styles/widget.css`: convert chat window internals to logical properties and add targeted RTL overrides.
- `apps/web/app/[locale]/c/[handle]/**`: hosted page defaults to project language when the visitor has no explicit locale choice; explicit `/ar` URL or `NEXT_LOCALE` cookie wins.

## Self-Review Notes

- Spec coverage: Phase 1.5 fixes the redirect loop and EN-only hreflang issue; Tasks 2-7 cover dashboard shell, all dashboard routes, navigation, and RTL; Task 8 covers verification; Phase 3 is explicitly deferred.
- Placeholder scan: there are no `TBD` or empty sections. Translation batches specify exact files, namespaces, commands, and expected outcomes.
- Type consistency: all message keys live under `dashboard.*`; shared actions/states are reused across page batches; dashboard navigation imports come from `@/i18n/navigation`.
- User workflow: no staging, commits, pushes, or branch operations are part of this plan.
