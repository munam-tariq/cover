import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("the inline filter panel exposes the approved role-aware controls", async () => {
  const panel = await read(
    "../../apps/web/components/inbox/inbox-filters-panel.tsx"
  );

  assert.match(panel, /checked=\{value\.needsReply\}/);
  assert.match(panel, /filters\.voiceUsed/);
  assert.match(panel, /filters\.assignedAgent/);
  assert.match(panel, /filters\.handoffReason/);
  assert.match(panel, /filters\.activityPeriod/);
  assert.match(panel, /filters\.flaggedOnly/);
  assert.match(panel, /isOwner && value\.scope === "all"/);
  assert.match(panel, /status: checked \? "agent_active" : value\.status/);
  assert.match(panel, /member\.userId/);
});

test("applied filters are individually removable and clearable as a group", async () => {
  const chips = await read(
    "../../apps/web/components/inbox/inbox-filter-chips.tsx"
  );

  assert.match(chips, /getActiveInboxFilters/);
  assert.match(chips, /removeInboxFilter/);
  assert.match(chips, /clearSecondaryInboxFilters/);
  assert.match(chips, /filters\.clearAll/);
  assert.match(chips, /filters\.appliedLabel/);
  assert.match(chips, /aria-label=\{t\("filters\.remove"/);
});

test("the page renders a counted Filters button, inline panel, and active chips", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(page, /<InboxFiltersPanel/);
  assert.match(page, /<InboxFilterChips/);
  assert.match(page, /getActiveInboxFilters\(inboxQuery\)\.length/);
  assert.match(page, /aria-expanded=\{filtersOpen\}/);
  assert.match(page, /filters\.trigger/);
  assert.match(page, /id="inbox-status"[\s\S]*name="inbox-status"/);
  assert.match(page, /id="inbox-source"[\s\S]*name="inbox-source"/);
  assert.equal(
    page.match(/className="bg-background h-9 min-w-36 flex-1/g)?.length,
    2
  );
});

test("both locales contain the complete secondary-filter copy contract", async () => {
  for (const locale of ["en", "ar"]) {
    const filters = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    ).pages.inbox.filters;

    for (const value of [
      filters.trigger,
      filters.needsMyReply,
      filters.needsAgentReply,
      filters.voiceUsed,
      filters.assignedAgent,
      filters.anyone,
      filters.unassigned,
      filters.me,
      filters.handoffReason,
      filters.activityPeriod,
      filters.flaggedOnly,
      filters.appliedLabel,
      filters.clearAll,
      filters.remove,
      filters.handoff.lowConfidence,
      filters.handoff.keyword,
      filters.handoff.buttonClick,
      filters.handoff.offlineForm,
      filters.activity.anyTime,
      filters.activity.last24Hours,
      filters.activity.last7Days,
      filters.activity.last30Days,
    ]) {
      assert.equal(typeof value, "string");
      assert.ok(value.length > 0);
    }
  }
});
