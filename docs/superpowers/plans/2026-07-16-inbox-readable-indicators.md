# Inbox Readable Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inbox channel and voice metadata self-explanatory, remove the redundant status dot, and make the inclusive closed filter explicit.

**Architecture:** Keep status semantics in `conversation-status.ts`, move channel definitions into one ordered registry, and render all inbox metadata through one shared chip component. The API queries remain unchanged: **All closed** is `status=closed` and **Closed – inactive** remains its `closeReason=inactivity` subset.

**Tech Stack:** Next.js 15, React 18, TypeScript, next-intl, Tailwind CSS, lucide-react, Node's built-in test runner.

## Global Constraints

- Follow DRY, KISS, and SOLID; one channel registry must drive row labels, detail labels, icons, and source-filter options.
- Do not add a dependency or change the database/API contract.
- Keep **Closed** as the individual row badge and use **All closed** only for the broad filter.
- Keep inactivity-closed conversations in both **All closed** and **Closed – inactive**.
- Do not rely on icon shape, color, hover, or tooltips to communicate meaning.
- Keep English and Arabic message keys identical.
- Never stage, commit, or push; the user reviews the existing dirty worktree.

---

## File map

- Modify `apps/web/lib/channels.ts`: ordered localized channel registry and options accessor.
- Create `apps/web/components/inbox/conversation-metadata-chip.tsx`: shared chip and channel-icon presentation.
- Modify `apps/web/lib/conversation-status.ts`: filter-only label key and removal of dead icon/dot settings.
- Modify both inbox list/detail pages: consume shared readable channel presentation.
- Modify both dashboard locale files: filter, source, fallback, and voice-activity copy.
- Modify `tests/web/channel-meta.test.ts` and `tests/web/inbox-status-scope.test.ts`.
- Create `tests/web/inbox-readable-indicators.test.ts`.

### Task 1: Make the channel registry the single configuration source

**Files:**
- Modify: `tests/web/channel-meta.test.ts`
- Modify: `apps/web/lib/channels.ts`

**Interfaces:**
- Produces: `getChannelMeta(source: string): ChannelMeta`
- Produces: `getChannelOptions(): readonly ChannelOption[]`
- Produces: `ChannelMeta.labelKey`, relative to `dashboard.pages.inbox`

- [x] **Step 1: Update the channel test for translation keys and the complete ordered source list**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getChannelMeta,
  getChannelOptions,
} from "../../apps/web/lib/channels.ts";

describe("channel metadata", () => {
  it("returns localized metadata for configured sources", () => {
    assert.deepEqual(getChannelMeta("whatsapp"), {
      labelKey: "sources.whatsapp",
      icon: "MessageCircle",
      color: "#25D366",
    });
    assert.equal(getChannelMeta("widget").labelKey, "sources.widget");
    assert.equal(getChannelMeta("public").labelKey, "sources.public");
    assert.equal(getChannelMeta("voice").labelKey, "sources.voice");
    assert.equal(getChannelMeta("mobile").labelKey, "sources.mobile");
  });

  it("exposes every API-supported source once in display order", () => {
    assert.deepEqual(
      getChannelOptions().map(({ source, labelKey }) => ({ source, labelKey })),
      [
        { source: "widget", labelKey: "sources.widget" },
        { source: "whatsapp", labelKey: "sources.whatsapp" },
        { source: "public", labelKey: "sources.public" },
        { source: "voice", labelKey: "sources.voice" },
        { source: "mobile", labelKey: "sources.mobile" },
        { source: "playground", labelKey: "sources.playground" },
        { source: "api", labelKey: "sources.api" },
        { source: "mcp", labelKey: "sources.mcp" },
      ]
    );
  });

  it("uses the localized Chat fallback for unknown legacy sources", () => {
    assert.deepEqual(getChannelMeta("something_new"), {
      labelKey: "sources.chat",
      icon: "MessageSquare",
      color: "currentColor",
    });
  });
});
```

- [x] **Step 2: Run the test and verify the new contract fails**

Run: `node --experimental-strip-types --test tests/web/channel-meta.test.ts`

Expected: FAIL because `labelKey` and `getChannelOptions` do not exist.

- [x] **Step 3: Replace the separate map shape with one ordered registry**

```ts
export interface ChannelMeta {
  labelKey: string;
  icon: string;
  color: string;
}

export interface ChannelOption extends ChannelMeta {
  source: string;
}

const DEFAULT_CHANNEL_COLOR = "currentColor";

const CHANNELS = [
  { source: "widget", labelKey: "sources.widget", icon: "MessageSquare", color: DEFAULT_CHANNEL_COLOR },
  { source: "whatsapp", labelKey: "sources.whatsapp", icon: "MessageCircle", color: "#25D366" },
  { source: "public", labelKey: "sources.public", icon: "Globe", color: DEFAULT_CHANNEL_COLOR },
  { source: "voice", labelKey: "sources.voice", icon: "Phone", color: DEFAULT_CHANNEL_COLOR },
  { source: "mobile", labelKey: "sources.mobile", icon: "Smartphone", color: DEFAULT_CHANNEL_COLOR },
  { source: "playground", labelKey: "sources.playground", icon: "Play", color: DEFAULT_CHANNEL_COLOR },
  { source: "api", labelKey: "sources.api", icon: "Code", color: DEFAULT_CHANNEL_COLOR },
  { source: "mcp", labelKey: "sources.mcp", icon: "Terminal", color: DEFAULT_CHANNEL_COLOR },
] as const satisfies readonly ChannelOption[];

const CHANNEL_MAP = new Map<string, ChannelMeta>(
  CHANNELS.map(({ source, ...meta }) => [source, meta])
);

const FALLBACK: ChannelMeta = {
  labelKey: "sources.chat",
  icon: "MessageSquare",
  color: DEFAULT_CHANNEL_COLOR,
};

export function getChannelMeta(source: string): ChannelMeta {
  return CHANNEL_MAP.get(source) ?? FALLBACK;
}

export function getChannelOptions(): readonly ChannelOption[] {
  return CHANNELS;
}
```

- [x] **Step 4: Re-run the test**

Run: `node --experimental-strip-types --test tests/web/channel-meta.test.ts`

Expected: all channel metadata tests PASS.

### Task 2: Share channel and metadata chip presentation

**Files:**
- Create: `tests/web/inbox-readable-indicators.test.ts`
- Create: `apps/web/components/inbox/conversation-metadata-chip.tsx`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx`

**Interfaces:**
- Consumes: `getChannelMeta(source).labelKey`, `icon`, and `color` from Task 1
- Produces: `ConversationMetadataChip({ icon, label, iconStyle? })`
- Produces: `ChannelChip({ source, label })`

- [x] **Step 1: Add a failing structural test for one shared channel component**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("the detail view uses the shared localized channel chip", async () => {
  const [detail, chip] = await Promise.all([
    read("../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx"),
    read("../../apps/web/components/inbox/conversation-metadata-chip.tsx"),
  ]);

  assert.match(
    detail,
    /import\s*\{\s*ChannelChip\s*\}\s*from\s*"@\/components\/inbox\/conversation-metadata-chip"/
  );
  assert.doesNotMatch(detail, /const CHANNEL_ICONS/);
  assert.match(detail, /conversation\.source && \(\s*<ChannelChip/);
  assert.match(detail, /getChannelMeta\(conversation\.source\)\.labelKey/);
  assert.match(chip, /export function ConversationMetadataChip/);
  assert.match(chip, /export function ChannelChip/);
  assert.match(chip, /aria-hidden="true"/);
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test tests/web/inbox-readable-indicators.test.ts`

Expected: FAIL with `ENOENT` because the shared component does not exist.

- [x] **Step 3: Create the shared visibly labeled metadata chip component**

```tsx
import {
  Code,
  Globe,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  Smartphone,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

import { getChannelMeta } from "@/lib/channels";

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  MessageCircle,
  MessageSquare,
  Globe,
  Phone,
  Smartphone,
  Play,
  Code,
  Terminal,
};

interface ConversationMetadataChipProps {
  icon: LucideIcon;
  label: string;
  iconStyle?: CSSProperties;
}

export function ConversationMetadataChip({
  icon: Icon,
  label,
  iconStyle,
}: ConversationMetadataChipProps) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-normal">
      <Icon aria-hidden="true" className="h-3 w-3" style={iconStyle} />
      <span>{label}</span>
    </span>
  );
}

export function ChannelChip({ source, label }: { source: string; label: string }) {
  const meta = getChannelMeta(source);
  const Icon = CHANNEL_ICONS[meta.icon] ?? MessageSquare;

  return (
    <ConversationMetadataChip
      icon={Icon}
      label={label}
      iconStyle={{ color: meta.color }}
    />
  );
}
```

- [x] **Step 4: Replace the detail page's local icon map and English-only label**

Add this import, remove the local `CHANNEL_ICONS`/`ChannelIcon`, and remove only icon/type imports
made unused by that deletion. Rename the main component's `conversationStatusT` translator to
`inboxT`, because it now translates both channel and status keys:

```tsx
import { ChannelChip } from "@/components/inbox/conversation-metadata-chip";
```

Render every present source, including Widget:

```tsx
{conversation.source && (
  <ChannelChip
    source={conversation.source}
    label={inboxT(
      getChannelMeta(conversation.source).labelKey
    )}
  />
)}
```

- [x] **Step 5: Re-run the structural test**

Run: `node --experimental-strip-types --test tests/web/inbox-readable-indicators.test.ts`

Expected: the shared-component/detail test PASS.

### Task 3: Separate broad-filter copy from row status and remove dead status settings

**Files:**
- Modify: `tests/web/inbox-status-scope.test.ts`
- Modify: `apps/web/lib/conversation-status.ts`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**
- Produces: closed filter `labelKey: "filters.allClosed"`
- Preserves: plain row status `labelKey: "status.closed"`
- Removes: unused `ConversationStatusMeta.icon` and `.dotColor`

- [x] **Step 1: Add a failing test for distinct filter and row labels**

Extend the existing status import with `getConversationStatusMeta`, then add:

```ts
test("All closed is an inclusive filter label, not an individual row status", async () => {
  assert.equal(getStatusFilterOption("closed")?.labelKey, "filters.allClosed");

  const closedStatus = getConversationStatusMeta("closed");
  assert.equal(closedStatus.labelKey, "status.closed");
  assert.equal("dotColor" in closedStatus, false);
  assert.equal("icon" in closedStatus, false);

  for (const locale of ["en", "ar"]) {
    const inbox = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    ).pages.inbox;
    assert.equal(typeof inbox.filters.allClosed, "string");
    assert.ok(inbox.filters.allClosed.length > 0);
    assert.equal(typeof inbox.status.closed, "string");
  }
});
```

- [x] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test tests/web/inbox-status-scope.test.ts`

Expected: FAIL because `filters.allClosed` is absent and the status object still has dead fields.

- [x] **Step 3: Remove dead status fields and change only the broad filter key**

```ts
export interface ConversationStatusMeta {
  labelKey: string;
  labelValues?: Record<string, string>;
  textColor: string;
  badgeVariant: "default" | "secondary" | "outline";
}
```

Remove `icon` and `dotColor` from every `BASE` entry, and update the module header comment so it no
longer claims consumers receive an icon name. Change only the filter option:

```ts
{ value: "closed", labelKey: "filters.allClosed", status: "closed" },
```

Do not change `BASE.closed.labelKey` or `CLOSE_REASON_LABELS`.

- [x] **Step 4: Add filter-only translations**

English:

```json
"filters": {
  "allOpen": "All open",
  "allClosed": "All closed",
  "label": "Status"
}
```

Arabic:

```json
"filters": {
  "allOpen": "كل المفتوحة",
  "allClosed": "كل المحادثات المغلقة",
  "label": "الحالة"
}
```

- [x] **Step 5: Re-run status and locale parity tests**

Run: `node --experimental-strip-types --test tests/web/inbox-status-scope.test.ts tests/web/i18n-parity.test.ts`

Expected: both files PASS.

### Task 4: Render readable inline chips and derive the source filter from the registry

**Files:**
- Modify: `tests/web/inbox-readable-indicators.test.ts`
- Modify: `apps/web/app/[locale]/(dashboard)/inbox/page.tsx`
- Modify: `apps/web/messages/en/dashboard.json`
- Modify: `apps/web/messages/ar/dashboard.json`

**Interfaces:**
- Consumes: `ChannelChip`, `ConversationMetadataChip`, `getChannelMeta`, `getChannelOptions`
- Preserves: the localized status badge as the sole row status presentation
- Adds: `metadata.voiceUsed` and complete `sources.*` keys

- [x] **Step 1: Extend the structural test with the complete list-row contract**

```ts
test("inbox rows use visible metadata labels and no status dot", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(
    page,
    /import\s*\{[\s\S]*?ChannelChip,[\s\S]*?ConversationMetadataChip[\s\S]*?\}\s*from\s*"@\/components\/inbox\/conversation-metadata-chip"/
  );
  assert.doesNotMatch(page, /const CHANNEL_ICONS/);
  assert.doesNotMatch(page, /status\.dotColor/);
  assert.match(page, /conversation\.source && \(\s*<ChannelChip/);
  assert.match(page, /getChannelMeta\(conversation\.source\)\.labelKey/);
  assert.match(
    page,
    /conversation\.hasVoiceActivity &&\s*conversation\.source !== "voice"/
  );
  assert.match(page, /label=\{t\("metadata\.voiceUsed"\)\}/);
  assert.match(page, /getChannelOptions\(\)\.map/);
});

test("both locales label every channel and voice activity", async () => {
  for (const locale of ["en", "ar"]) {
    const inbox = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    ).pages.inbox;

    for (const key of [
      "widget",
      "whatsapp",
      "public",
      "voice",
      "mobile",
      "playground",
      "api",
      "mcp",
      "chat",
    ]) {
      assert.equal(typeof inbox.sources[key], "string");
      assert.ok(inbox.sources[key].length > 0);
    }
    assert.equal(typeof inbox.metadata.voiceUsed, "string");
    assert.ok(inbox.metadata.voiceUsed.length > 0);
  }
});
```

- [x] **Step 2: Run the structural test and verify the list contract fails**

Run: `node --experimental-strip-types --test tests/web/inbox-readable-indicators.test.ts`

Expected: the Task 2 test passes; the new list and locale tests FAIL.

- [x] **Step 3: Replace bare row glyphs with visible inline chips**

Add:

```tsx
import {
  ChannelChip,
  ConversationMetadataChip,
} from "@/components/inbox/conversation-metadata-chip";
```

Replace the current name/icon/dot line with:

```tsx
<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
  <span className="min-w-0 max-w-full truncate font-medium">
    {displayName}
  </span>
  {conversation.source && (
    <ChannelChip
      source={conversation.source}
      label={t(getChannelMeta(conversation.source).labelKey)}
    />
  )}
  {conversation.hasVoiceActivity && conversation.source !== "voice" && (
    <ConversationMetadataChip
      icon={Phone}
      label={t("metadata.voiceUsed")}
    />
  )}
</div>
```

Delete the list page's local `CHANNEL_ICONS`, local `ChannelIcon`, and `status.dotColor` span. Remove
only imports made unused by those deletions.

- [x] **Step 4: Generate source-filter options from the registry**

Import `getChannelOptions` beside `getChannelMeta`, then replace the hard-coded source options:

```tsx
<option value="all">{t("sources.all")}</option>
{getChannelOptions().map((channel) => (
  <option key={channel.source} value={channel.source}>
    {t(channel.labelKey)}
  </option>
))}
```

- [x] **Step 5: Add complete source and voice copy to both locales**

English:

```json
"sources": {
  "all": "All channels",
  "widget": "Widget",
  "whatsapp": "WhatsApp",
  "public": "Public Page",
  "voice": "Voice",
  "mobile": "Mobile",
  "playground": "Playground",
  "api": "API",
  "mcp": "MCP",
  "chat": "Chat"
},
"metadata": {
  "voiceUsed": "Voice used"
}
```

Arabic:

```json
"sources": {
  "all": "كل القنوات",
  "widget": "الأداة",
  "whatsapp": "WhatsApp",
  "public": "الصفحة العامة",
  "voice": "الصوت",
  "mobile": "الجوال",
  "playground": "ساحة التجربة",
  "api": "واجهة API",
  "mcp": "بروتوكول MCP",
  "chat": "الدردشة"
},
"metadata": {
  "voiceUsed": "تم استخدام الصوت"
}
```

- [x] **Step 6: Run focused presentation and localization coverage**

Run:

```bash
node --experimental-strip-types --test tests/web/channel-meta.test.ts tests/web/inbox-status-scope.test.ts tests/web/inbox-readable-indicators.test.ts tests/web/conversation-detail-presentation.test.ts tests/web/i18n-parity.test.ts
```

Expected: all focused tests PASS.

### Task 5: Verify behavior and responsive presentation

**Files:**
- Verify only; fix the files above if a command exposes a defect.

**Interfaces:**
- Verifies: tests, TypeScript, lint, formatting, responsive UI, localization, and inclusive filter semantics

- [x] **Step 1: Format only touched implementation/test files**

Run:

```bash
pnpm exec prettier --write apps/web/lib/channels.ts apps/web/components/inbox/conversation-metadata-chip.tsx apps/web/lib/conversation-status.ts 'apps/web/app/[locale]/(dashboard)/inbox/page.tsx' 'apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx' apps/web/messages/en/dashboard.json apps/web/messages/ar/dashboard.json tests/web/channel-meta.test.ts tests/web/inbox-status-scope.test.ts tests/web/inbox-readable-indicators.test.ts
```

Expected: Prettier exits 0 and touches no unrelated file.

- [x] **Step 2: Run the complete repository test suite**

Run: `pnpm test`

Expected: all test files PASS with zero failures.

- [x] **Step 3: Run web type checking**

Run: `pnpm --filter @chatbot/web type-check`

Expected: exit code 0 with no TypeScript errors.

- [x] **Step 4: Run targeted lint**

Run:

```bash
pnpm --filter @chatbot/web exec eslint lib/channels.ts components/inbox/conversation-metadata-chip.tsx lib/conversation-status.ts 'app/[locale]/(dashboard)/inbox/page.tsx' 'app/[locale]/(dashboard)/inbox/[id]/page.tsx'
```

Expected: exit code 0 with no warnings or errors.

- [x] **Step 5: Smoke-test the authenticated staging inbox at desktop width**

Using Chrome DevTools against the FrontFace staging inbox:

1. Open **All** with **All open** and **All channels** selected.
2. Confirm every source indicator has readable text and no standalone status-colored dot remains.
3. Confirm a Playground row reads **Playground**, and a mixed text/voice row shows its source plus **Voice used**.
4. Confirm a Voice-source row shows **Voice** only once.
5. Open a row and confirm the detail header uses the same localized source chip.

Expected: labels are understandable, neutral, and do not duplicate status or Voice.

- [x] **Step 6: Verify the inclusive closed-filter relationship**

1. Select **All closed** and record the visible inactivity-closed conversation links.
2. Select **Closed – inactive**.
3. Confirm every visible result was also present under **All closed** and has the **Closed – inactive** badge.

Expected: the broad label explains the intentional overlap; no API/database change occurs.

- [x] **Step 7: Check narrow and Arabic layouts**

1. Set the viewport to 375 by 812. Confirm long names truncate and chips wrap without displacing the right-hand time/status block.
2. Open the Arabic staging inbox and repeat the row/filter checks. Confirm RTL chip order and labels are readable.

Expected: no overflow, clipped chip text, duplicate Voice label, or English fallback copy.

- [x] **Step 8: Review the final unstaged diff**

Run `git diff --check`, `git status --short`, then inspect the diff for every file listed in the
file map.

Expected: no whitespace errors, only intended feature changes, and everything remains unstaged and uncommitted.
