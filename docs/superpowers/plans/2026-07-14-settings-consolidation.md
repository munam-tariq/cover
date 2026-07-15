# Settings Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the redundant, agent-scoped `/settings` page and relocate its three unique pieces (Response language, API Key + MCP, Danger Zone) into a new "General" tab in the agent view, plus port the system-prompt Presets into the Overview tab.

**Architecture:** Next.js App Router (`apps/web`), next-intl i18n, Radix `Tabs` in `projects/[projectId]/page.tsx`. The agent detail page gains a URL-addressable active tab (`?tab=`) so the onboarding tour can deep-link the new General tab. All relocated cards keep calling their existing i18n keys (`dashboard.pages.settings.*`, etc.) — namespaces are file-location-independent, so **no message-key migration is needed** beyond one new tab label. Backend/API/DB are untouched; relocated saves use the existing `PUT /api/projects/:id` which shallow-merges `settings`.

**Tech Stack:** Next.js 15 (App Router, RSC + client components), TypeScript, next-intl, Radix UI (`@chatbot/ui`), Tailwind, onborda (product tour), pnpm 10 workspaces + turbo.

## Global Constraints

- **Package manager:** pnpm 10.29.2. Run web scripts from `apps/web/`: `pnpm type-check`, `pnpm lint`, `pnpm build`. Dev server: `pnpm dev` (http://localhost:3000). API runs separately on :3001.
- **No unit-test framework exists** in `apps/web` (only `lint`, `type-check`, `build`). Every task is verified by: `pnpm type-check` (0 errors) + `pnpm lint` (no new errors) + targeted **manual browser verification** in `pnpm dev`. Treat these as the test cycle.
- **NEVER auto-commit.** The user reviews all git changes in their IDE. Each task ends with a **Checkpoint** (verify + hand off), NOT a `git commit`/`git add`. Do not stage or commit anything.
- **Locales:** `en` and `ar` (Saudi Arabic, RTL). Every user-visible string change must be made in BOTH `apps/web/messages/en/dashboard.json` and `apps/web/messages/ar/dashboard.json`. Use logical properties already used in the codebase (`ms-*`/`me-*`, `start`/`end`) — never hard `left`/`right`.
- **i18n rule:** relocated cards keep their existing `useTranslations("dashboard.pages.settings")` / `"dashboard.pages.embed"` calls and existing keys — do NOT rename or move keys. Only ADD `pages.projectDetail.tabs.general`.
- **API contract:** `PUT /api/projects/:id` body `{ name?, systemPrompt?, settings? }` shallow-merges `settings` at the top level (projects.ts:457-460). Send only the sub-key you change (e.g. `settings: { language: {...} }`); other keys are preserved server-side.

---

### Task 1: Make the agent detail tabs URL-addressable (`?tab=`)

Foundation for the tour deep-link. After this task the existing 8 tabs can be opened via `/projects/<id>?tab=widget` and switching tabs reflects in the URL. No new tab yet.

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/page.tsx`

**Interfaces:**
- Produces: the page reads `searchParams.get("tab")` to init `activeTab`; a `handleTabChange(value)` that calls `setActiveTab` and `router.replace` with the `?tab=` param. Task 2 adds `"general"` as a valid value; Task 4/5 navigate to `?tab=general`.

- [ ] **Step 1: Add the imports and URL-sync logic**

In `page.tsx`, add `useSearchParams` and a URL-driven tab. Update the import from `@/i18n/navigation` to also pull `useRouter` (already imported) and add `usePathname` from `@/i18n/navigation` if not present. Add `useSearchParams` from `next/navigation`.

Replace the `const [activeTab, setActiveTab] = useState("overview");` line with:

```tsx
const searchParams = useSearchParams();
const pathname = usePathname();
const tabParam = searchParams.get("tab");
const [activeTab, setActiveTab] = useState(tabParam || "overview");

// Keep active tab in sync when the URL ?tab= changes (e.g. tour deep-link)
useEffect(() => {
  if (tabParam && tabParam !== activeTab) {
    setActiveTab(tabParam);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tabParam]);

const handleTabChange = (value: string) => {
  setActiveTab(value);
  const params = new URLSearchParams(searchParams.toString());
  params.set("tab", value);
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
};
```

Add the imports at the top:

```tsx
import { useSearchParams } from "next/navigation";
```
and ensure `usePathname` is imported from `@/i18n/navigation` alongside `useRouter`:
```tsx
import { usePathname, useRouter } from "@/i18n/navigation";
```

- [ ] **Step 2: Wire the Tabs + MobileTabSelect to `handleTabChange`**

In the JSX, change both `onValueChange={setActiveTab}` occurrences (the `<Tabs>` and the `<MobileTabSelect>`) to `onValueChange={handleTabChange}`.

- [ ] **Step 3: Verify types + lint**

Run (from `apps/web/`):
```bash
pnpm type-check
pnpm lint
```
Expected: 0 type errors; no new lint errors.

- [ ] **Step 4: Manual browser verification**

Start `pnpm dev`. Visit `http://localhost:3000/en/projects/<any-project-id>?tab=widget`.
Expected: the **Widget** tab is active on load. Click **Handoff** → URL updates to `?tab=handoff` (no full reload/scroll jump). Reload → Handoff stays active.

- [ ] **Step 5: Checkpoint**

Do NOT commit. Report: files changed, the four verifications above, and hand off to the user to review in their IDE.

---

### Task 2: Create the "General" agent tab (Response language + API Key/MCP + Danger Zone)

Ports the three unique, currently-visible Settings sections into a new tab component and registers it as the 9th tab.

**Files:**
- Create: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/general-tab.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/page.tsx` (register tab)
- Modify: `apps/web/messages/en/dashboard.json` + `apps/web/messages/ar/dashboard.json` (add `tabs.general`)
- Source to port from (read-only reference): `apps/web/app/[locale]/(dashboard)/settings/page.tsx`

**Interfaces:**
- Consumes: `useProject()` (`currentProject`, `deleteProject`, `refreshProjects`), `apiClient`, `PUT /api/projects/:id`, `GET/POST/DELETE /api/account/api-key`.
- Produces: `export function GeneralTab({ project }: { project: Project })`. Renders elements with ids `#onboarding-api-key`, `#onboarding-generate-btn`, `#onboarding-mcp-config` (Task 4 depends on these ids existing).

- [ ] **Step 1: Add the new tab label to both locales**

In `apps/web/messages/en/dashboard.json`, under `pages.projectDetail.tabs` (the block near line 967), add:
```json
"general": "General"
```
In `apps/web/messages/ar/dashboard.json`, same path, add:
```json
"general": "عام"
```
(Keep valid JSON — add a comma to the previous line as needed.)

- [ ] **Step 2: Scaffold the GeneralTab component (Response language + Danger Zone written in full)**

Create `general-tab.tsx`. This step writes the component with the **Response language** and **Danger Zone** sections complete. The API Key + MCP section is added in Step 3.

```tsx
"use client";

import { Button, Card, CardContent, Label, Loader2 } from "@chatbot/ui";
import { AlertCircle, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

import { useProject, type Project } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

interface GeneralTabProps {
  project: Project;
}

interface ProjectUpdateResponse {
  project: { id: string; name: string; settings?: Record<string, unknown>; updatedAt: string };
}

export function GeneralTab({ project }: GeneralTabProps) {
  const t = useTranslations("dashboard.pages.settings");
  const { deleteProject, refreshProjects } = useProject();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Response language
  const [languageDefault, setLanguageDefault] = useState("");
  const [saving, setSaving] = useState(false);

  // Danger zone
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const settings = project.settings || {};
    setLanguageDefault(
      (settings.language as { default?: string } | undefined)?.default || ""
    );
  }, [project]);

  const handleSaveLanguage = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient<ProjectUpdateResponse>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          settings: { language: languageDefault ? { default: languageDefault } : {} },
        }),
      });
      await refreshProjects();
      setSuccess(t("saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving language:", err);
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    const confirmed = confirm(t("deleteConfirm", { name: project.name }));
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
      // context switches to another project or redirects to /projects
    } catch (err) {
      console.error("Error deleting project:", err);
      setError(t("deleteError"));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-md bg-green-500/10 text-green-600">
          <Check className="h-4 w-4" />
          <p>{success}</p>
        </div>
      )}

      {/* Response language */}
      <Card>
        <CardContent className="p-6">
          <div>
            <Label htmlFor="language-default">{t("languageLabel")}</Label>
            <select
              id="language-default"
              value={languageDefault}
              onChange={(e) => setLanguageDefault(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("languageAuto")}</option>
              <option value="ar-SA">العربية — السعودية (ar-SA)</option>
              <option value="en">English (en)</option>
            </select>
            <p className="text-sm text-muted-foreground mt-1">{t("languageHelp")}</p>
          </div>
          <div className="pt-4">
            <Button onClick={handleSaveLanguage} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Key + MCP go here (Step 3) */}

      {/* Danger zone */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4 text-destructive">{t("dangerZone")}</h2>
          <div className="p-4 border border-destructive/50 rounded-md">
            <h3 className="font-medium">{t("deleteAgent")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("deleteDescription")}</p>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {deleting ? t("deleting") : t("deleteAgent")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

> Note: `Loader2` is re-exported from `@chatbot/ui` in this codebase (see its use in `settings/page.tsx`). If `pnpm type-check` reports it is not exported from `@chatbot/ui`, import it from `lucide-react` instead (add to the `lucide-react` import line) and drop it from the `@chatbot/ui` import.

- [ ] **Step 3: Port the API Key + MCP Integration section into GeneralTab**

This section is a verbatim move of two cards from `settings/page.tsx`. Copy the following from `settings/page.tsx` into `general-tab.tsx`, placing the JSX where the `{/* API Key + MCP go here (Step 3) */}` comment is:

1. **State** (from settings/page.tsx lines 60-70): `copied`? no — only the API-key-related ones: `apiKeyInfo`, `newApiKey`, `showApiKey`, `loadingApiKey`, `generatingKey`, `revokingKey`, `apiKeyCopied`, plus `mcpCopied` (line 61). Add all as `useState` in GeneralTab.
2. **Types** (lines 24-47): `ApiKeyInfo`, `ApiKeyResponse`, `NewApiKeyResponse` — copy these interface declarations above the component.
3. **Effect** to fetch the key on mount (lines 299-315): copy the `useEffect` that calls `GET /api/account/api-key`.
4. **Handlers** (verbatim): `handleGenerateApiKey` (317-350), `handleRevokeApiKey` (352-372), `handleCopyApiKey` (374-383), `handleCopyMcpConfig` (431-459). These use `t(...)` from the same `settings` namespace already wired.
5. **JSX**: copy the two `<Card>` blocks — API Key card (lines 972-1084, `<Card id="onboarding-api-key">`) and MCP Integration card (lines 1086-1180, `<Card id="onboarding-mcp-config">`). **Preserve the `id` attributes** `onboarding-api-key`, `onboarding-generate-btn`, `onboarding-mcp-config` exactly.
6. **Imports**: add the lucide icons these blocks use — `Key`, `Sparkles`, `RefreshCw`, `Trash2`, `Eye`, `EyeOff`, `Copy` — to the `lucide-react` import, and `Skeleton` to the `@chatbot/ui` import. Keep the `useLocale` import from `next-intl` (the API key card formats dates with `locale`); add `const locale = useLocale();` in the component.

After pasting, remove any references that don't exist in GeneralTab (there are none beyond the copied state/handlers). Do not bring over `embedT`/`leadT` — the API key + MCP cards only use `t` (the `settings` namespace) and `process.env.NEXT_PUBLIC_API_URL`.

- [ ] **Step 4: Register the tab in the agent page**

In `apps/web/app/[locale]/(dashboard)/projects/[projectId]/page.tsx`:

Add the import:
```tsx
import { GeneralTab } from "./components/general-tab";
```
Add `SlidersHorizontal` to the `lucide-react` import line.

Append to the `tabOptions` array (after `channels`):
```tsx
{ value: "general", label: t("tabs.general"), icon: <SlidersHorizontal className="h-4 w-4" /> },
```
Add the content block after the `channels` `<TabsContent>`:
```tsx
<TabsContent value="general" className="mt-6">
  <GeneralTab project={project} />
</TabsContent>
```

- [ ] **Step 5: Verify types + lint**

From `apps/web/`:
```bash
pnpm type-check
pnpm lint
```
Expected: 0 type errors; no new lint errors.

- [ ] **Step 6: Manual browser verification**

In `pnpm dev`, open an agent → click the new **General** tab (or visit `?tab=general`). Verify:
- Response language dropdown loads the saved value; change it → **Save** → success banner; reload → value persists; other settings (e.g. widget toggle in header) unaffected.
- **Generate API Key** creates a key; the MCP config JSON shows it; **Copy** works; **Regenerate**/**Revoke** work.
- **Danger Zone → Delete** shows a confirm; on confirm the agent is deleted and you are redirected to `/projects` (or switched to another agent). (Test with a throwaway agent.)
- Toggle to Arabic (العربية) → labels render RTL, no layout breakage.

- [ ] **Step 7: Checkpoint**

Do NOT commit. Report files changed + verifications; hand off to the user.

---

### Task 3: Port the system-prompt "Presets" dropdown into the Overview tab

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/overview-tab.tsx`

**Interfaces:**
- Consumes: existing `dashboard.pages.settings.presets` + `presetsList.*` keys (already in both locales).
- Produces: nothing new for other tasks.

- [ ] **Step 1: Add preset state, translations, and imports to OverviewTab**

In `overview-tab.tsx`, add to the imports:
```tsx
import { ChevronDown } from "lucide-react";
```
Add a second translations hook and preset state inside the component (near the existing `useTranslations` call):
```tsx
const settingsT = useTranslations("dashboard.pages.settings");
const [showPresets, setShowPresets] = useState(false);
const systemPromptPresets = [
  { name: settingsT("presetsList.support"), prompt: settingsT("presetsList.supportPrompt") },
  { name: settingsT("presetsList.sales"), prompt: settingsT("presetsList.salesPrompt") },
  { name: settingsT("presetsList.shopping"), prompt: settingsT("presetsList.shoppingPrompt") },
];
```
(`useTranslations` and `useState` are already imported.)

- [ ] **Step 2: Add the Presets dropdown to the System Prompt card header**

In the System Prompt `<Card>`, replace the `<CardHeader>` block so the title row carries a right-aligned Presets button. Change:
```tsx
<CardHeader>
  <CardTitle>{t("systemPrompt")}</CardTitle>
  <CardDescription>
    {t("systemPromptDescription")}
  </CardDescription>
</CardHeader>
```
to:
```tsx
<CardHeader>
  <div className="flex items-start justify-between gap-2">
    <div>
      <CardTitle>{t("systemPrompt")}</CardTitle>
      <CardDescription>{t("systemPromptDescription")}</CardDescription>
    </div>
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPresets(!showPresets)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
      >
        {settingsT("presets")}
        <ChevronDown className="h-4 w-4" />
      </button>
      {showPresets && (
        <div className="absolute top-full end-0 mt-1 w-48 bg-background border border-input rounded-md shadow-lg z-10">
          {systemPromptPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                handleSystemPromptChange(preset.prompt);
                setShowPresets(false);
              }}
              className="block w-full px-4 py-2 text-start text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
</CardHeader>
```
(Using `handleSystemPromptChange` — the existing handler — so selecting a preset marks the form dirty and enables Save.)

- [ ] **Step 3: Verify types + lint**

From `apps/web/`: `pnpm type-check && pnpm lint`. Expected: clean.

- [ ] **Step 4: Manual browser verification**

Overview tab → click **Presets** → menu opens → pick "Sales" → textarea fills with the sales prompt and **Save Changes** becomes enabled → Save persists. Check Arabic renders the menu aligned to the correct side (RTL).

- [ ] **Step 5: Checkpoint**

Do NOT commit. Report + hand off.

---

### Task 4: Re-point the onboarding tour to the General tab

**Files:**
- Modify: `apps/web/components/onboarding/tour-steps.tsx` (static array → builder fn)
- Modify: `apps/web/components/onboarding/tour-provider.tsx` (supply projectId)
- Modify: `apps/web/components/onboarding/index.ts` (export name change, if it re-exports)

**Interfaces:**
- Consumes: `#onboarding-api-key`, `#onboarding-generate-btn`, `#onboarding-mcp-config` (now on the General tab from Task 2); `?tab=` deep-link (Task 1); `useProject()`.
- Produces: `buildOnboardingTours(projectId: string | null): Tour[]`.

- [ ] **Step 1: Convert `onboardingTours` to a builder function**

In `tour-steps.tsx`, change the export from a const array to a function that injects the project-scoped route. Replace:
```tsx
export const onboardingTours: Tour[] = [
```
with:
```tsx
export function buildOnboardingTours(projectId: string | null): Tour[] {
  const generalTabRoute = projectId ? `/projects/${projectId}?tab=general` : "/projects";
  return [
```
Change step 1's `nextRoute: "/settings",` to `nextRoute: generalTabRoute,`.
Change step 2's `prevRoute: "/dashboard",` — keep as is.
Close the function: after the final `];` of the array, add `}` and remove the old trailing `;`.

- [ ] **Step 2: Update the index re-export**

In `apps/web/components/onboarding/index.ts`, change:
```tsx
export { onboardingTours } from "./tour-steps";
```
to:
```tsx
export { buildOnboardingTours } from "./tour-steps";
```

- [ ] **Step 3: Supply projectId in the TourProvider**

In `tour-provider.tsx`:
- Replace `import { onboardingTours } from "./tour-steps";` with `import { buildOnboardingTours } from "./tour-steps";`.
- Add `import { useProject } from "@/contexts/project-context";`.
- Inside `TourProvider`, read the current project and build the steps:
```tsx
export function TourProvider({ children }: TourProviderProps) {
  const { currentProject } = useProject();
  const steps = buildOnboardingTours(currentProject?.id ?? null);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);
```
- Change `<Onborda steps={onboardingTours} ...>` to `<Onborda steps={steps} ...>`.

> If `TourProvider` is rendered outside the `ProjectProvider` (a `useProject must be used within a ProjectProvider` runtime error appears), instead pass `projectId` down from the nearest component that is inside `ProjectProvider` (the dashboard layout), or read the id from `localStorage`/context that the layout already exposes. Verify placement in `apps/web/app/[locale]/(dashboard)/layout.tsx` before assuming.

- [ ] **Step 4: Verify types + lint**

From `apps/web/`: `pnpm type-check && pnpm lint`. Expected: clean; no remaining references to `onboardingTours`.

- [ ] **Step 5: Manual end-to-end tour run (acceptance check)**

This is the required verification — do not skip.
```bash
# In the browser console on http://localhost:3000/en/dashboard, reset the tour:
localStorage.removeItem("supportbase-onboarding-completed");
```
Reload `/en/dashboard`. Expected sequence:
1. Step 1 "One-Time Setup" points at the welcome block; click **Next**.
2. Navigates to `/en/projects/<id>?tab=general`; the **General** tab is active and **step 2 "Generate Your API Key"** highlights `#onboarding-api-key`.
3. Step 3 highlights the **Generate** button (`#onboarding-generate-btn`).
4. Steps 4-5 highlight the **MCP config** card (`#onboarding-mcp-config`).
If a step's highlight is misaligned, note it — onborda has known positioning timing issues (the provider already dispatches `resize` events); confirm the anchors are found (no "target not found") even if the halo needs a beat to settle.

- [ ] **Step 6: Checkpoint**

Do NOT commit. Report the tour-run result explicitly (which steps landed on which anchors) + hand off.

---

### Task 5: Re-point dashboard `/settings` links to the General tab

**Files:**
- Modify: `apps/web/app/[locale]/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useProject()` (already used on this page), `?tab=general` deep-link.

- [ ] **Step 1: Inspect the two references**

Open `dashboard/page.tsx`. Find:
- line ~92: `accountCreated: "/settings",`
- line ~261: `<Link href="/settings">`
Confirm `currentProject` (or the project list) is available via `useProject()` on this page (it is used elsewhere in the dashboard; if not already destructured, add `const { currentProject } = useProject();`).

- [ ] **Step 2: Re-point both to the General tab**

Define a helper near the top of the component:
```tsx
const generalHref = currentProject ? `/projects/${currentProject.id}?tab=general` : "/projects";
```
- Change the `<Link href="/settings">` to `<Link href={generalHref}>`.
- For the `accountCreated: "/settings"` object entry: if it is a static config object rendered into a `<Link href={item.href}>`, change its value to a route the component can resolve. Simplest: set `accountCreated: generalHref` if the object is built inside the component; if the object is module-scope (outside the component), instead override at render time where it's consumed (`href={item.key === "accountCreated" ? generalHref : item.href}`). Inspect the surrounding code and choose whichever keeps it a single source of truth.

- [ ] **Step 3: Verify + manual check**

`pnpm type-check && pnpm lint`. Then in the browser, on `/dashboard`, click the element(s) that previously linked to Settings → lands on the current agent's **General** tab.

- [ ] **Step 4: Checkpoint**

Do NOT commit. Report + hand off.

---

### Task 6: Delete the Settings pages, remove nav + middleware, drop the nav label

Do this LAST — only after Tasks 2-5 relocated everything and re-pointed every inbound link.

**Files:**
- Delete: `apps/web/app/[locale]/(dashboard)/settings/page.tsx`
- Delete: `apps/web/app/[locale]/(dashboard)/settings/handoff/page.tsx`
- Delete: the now-empty `settings/` and `settings/handoff/` directories
- Modify: `apps/web/components/layout/sidebar.tsx` (remove nav item)
- Modify: `apps/web/lib/supabase/middleware.ts` (remove `/settings` from protectedPaths)
- Modify: `apps/web/messages/en/dashboard.json` + `apps/web/messages/ar/dashboard.json` (remove `sidebar.nav.settings`)

- [ ] **Step 1: Final sweep for stragglers**

```bash
cd /media/ubuntu/external/cover/cover
grep -rnE '/settings|"settings"' apps/web --include=*.tsx --include=*.ts | grep -v '.next/' | grep -viE 'settings/page.tsx|settings/handoff/page.tsx|widget_appearance|projectDetail'
```
Expected remaining hits after Tasks 2-5: only `sidebar.tsx`, `middleware.ts`, and the `dashboard.pages.settings` namespace usages inside `general-tab.tsx`/`overview-tab.tsx` (those are namespace keys, NOT the route — leave them). If any real `/settings` route link remains, re-point it before deleting.

- [ ] **Step 2: Delete the Settings page files**

Use plain `rm` (NOT `git rm` — do not stage anything; the user stages/commits in their IDE):
```bash
rm "apps/web/app/[locale]/(dashboard)/settings/handoff/page.tsx" \
   "apps/web/app/[locale]/(dashboard)/settings/page.tsx"
rmdir "apps/web/app/[locale]/(dashboard)/settings/handoff" \
      "apps/web/app/[locale]/(dashboard)/settings" 2>/dev/null || true
```
The deletions will show as unstaged changes for the user to review.

- [ ] **Step 3: Remove the sidebar nav entry**

In `apps/web/components/layout/sidebar.tsx`, delete the line:
```tsx
{ href: "/settings", labelKey: "settings", icon: "settings", roles: "owner_admin" as const },
```

- [ ] **Step 4: Remove `/settings` from protected paths**

In `apps/web/lib/supabase/middleware.ts` line ~65, change:
```ts
const protectedPaths = ["/dashboard", "/knowledge", "/api-endpoints", "/embed", "/settings", "/playground", "/analytics", "/projects"];
```
to the same array without `"/settings"`.

- [ ] **Step 5: Remove the unused nav label in both locales**

In `apps/web/messages/en/dashboard.json` and `apps/web/messages/ar/dashboard.json`, remove the `sidebar.nav.settings` entry (the `"settings": "Settings"` / `"settings": "الإعدادات"` line under `sidebar.nav`, near line 17 in en). Keep JSON valid (fix trailing commas). Do NOT touch the `pages.settings` block — it is still referenced by GeneralTab/OverviewTab.

- [ ] **Step 6: Verify build end-to-end**

From `apps/web/`:
```bash
pnpm type-check
pnpm lint
pnpm build
```
Expected: all pass. `pnpm build` confirms no dangling imports of the deleted files and no missing i18n keys.

- [ ] **Step 7: Manual browser verification**

In `pnpm dev`:
- Sidebar no longer shows **Settings**.
- Visiting `/en/settings` directly → 404 (route gone).
- `/settings/handoff` → 404.
- Dashboard links + onboarding tour still work (from Tasks 4-5).
- Handoff config still reachable via the agent **Handoff** tab.
- Repeat spot-checks in Arabic (RTL).

- [ ] **Step 8: Checkpoint**

Do NOT commit. Report the full `type-check`/`lint`/`build` output + manual results, and hand off to the user to review and commit in their IDE.

---

## Self-Review

**Spec coverage:**
- New General tab (language + API/MCP + delete) → Task 2 ✅
- URL-addressable tabs → Task 1 ✅
- Presets → Overview → Task 3 ✅
- Tour re-point (project-aware builder, keep anchors, run E2E) → Task 4 ✅
- Dashboard link re-point → Task 5 ✅
- Delete settings + handoff, sidebar entry, middleware path, nav label → Task 6 ✅
- Lead Recovery dropped (not migrated), backend untouched → no task needed (deletion covered by Task 6 removing settings/page.tsx); acceptance #6 ✅
- No i18n key migration; only `tabs.general` added → Task 2 Step 1 ✅
- Both locales for every string change → Global Constraints + Tasks 2/6 ✅
- No auto-commit → Global Constraints + Checkpoints ✅

**Placeholder scan:** No "TBD/TODO/handle edge cases". The two intentional inspect-then-decide points (Task 4 Step 3 provider placement; Task 5 Step 2 static-vs-inline config object) give concrete branch instructions for each outcome, not hand-waving.

**Type consistency:** `GeneralTab({ project }: GeneralTabProps)`, `buildOnboardingTours(projectId)`, `handleTabChange(value)`, `handleSystemPromptChange` (reused existing) — names are consistent across the tasks that reference them.

## Verification Summary (per Global Constraints)
Every task: `pnpm type-check` + `pnpm lint` clean; Task 6 additionally `pnpm build`; Tasks 2/3/4 have specific manual browser checks; Task 4's E2E tour run is the acceptance gate for the tour.
