import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("the sort control uses shared options and explains both modes", async () => {
  const sortMenu = await read(
    "../../apps/web/components/inbox/inbox-sort-menu.tsx"
  );

  assert.match(sortMenu, /INBOX_SORT_OPTIONS/);
  assert.match(sortMenu, /DropdownMenuRadioGroup/);
  assert.match(sortMenu, /DropdownMenuRadioItem/);
  assert.match(sortMenu, /option\.descriptionKey/);
  assert.match(
    sortMenu,
    /disabled=\{option\.value === "attention" && attentionDisabled\}/
  );
  assert.match(sortMenu, /TooltipTrigger asChild/);
  assert.match(sortMenu, /aria-label=\{t\("sort\.explanationLabel"\)\}/);
});

test("inbox rows render sort-aware activity text with a full timestamp tooltip", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(page, /import \{ InboxSortMenu \}/);
  assert.match(page, /formatInboxTime\(\{/);
  assert.match(page, /priorityReason: conversation\.priorityReason/);
  assert.match(
    page,
    /meaningfulActivityAt: conversation\.meaningfulActivityAt/
  );
  assert.match(page, /<time[\s\S]*dateTime=\{displayedAt\}/);
  assert.match(
    page,
    /<TooltipContent>\{activityTime\.full\}<\/TooltipContent>/
  );
  assert.match(page, /label=\{t\("metadata\.flagged"\)\}/);
});

test("both inbox locales contain the sort, timestamp, and flagged-copy contract", async () => {
  for (const locale of ["en", "ar"]) {
    const inbox = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    ).pages.inbox;

    for (const value of [
      inbox.sort.trigger,
      inbox.sort.explanationLabel,
      inbox.sort.attention.label,
      inbox.sort.attention.description,
      inbox.sort.attention.terminalDisabled,
      inbox.sort.recent.label,
      inbox.sort.recent.description,
      inbox.time.lessThanMinute,
      inbox.time.waitingFor,
      inbox.time.customerReplied,
      inbox.time.yesterdayAt,
      inbox.time.fullLabel,
      inbox.metadata.flagged,
    ]) {
      assert.equal(typeof value, "string");
      assert.ok(value.length > 0);
    }
  }
});
