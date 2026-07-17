import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("the inbox fetches one role-aware summary with the bounded queue", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx")
  );

  assert.match(page, /interface InboxSummary \{/);
  for (const field of [
    "isOwner",
    "openCount",
    "queueCount",
    "assignedCount",
    "resolvedTodayCount",
  ]) {
    assert.match(page, new RegExp(`${field}:`));
  }
  const overview = page.slice(
    page.indexOf("const fetchInboxOverview"),
    page.indexOf("const fetchAssignableMembers")
  );
  assert.match(
    overview,
    /const \[queueResponse, summaryResponse\] = await Promise\.all\(\[/
  );
  assert.match(
    overview,
    /\/inbox-summary\?resolvedSince=\$\{encodeURIComponent\(resolvedSince\)\}/
  );
  assert.match(overview, /setSummary\(summaryResponse\)/);
  assert.doesNotMatch(overview, /apiClient<InboxResponse>/);
  assert.doesNotMatch(page, /setStats\(/);
});

test("headline values and labels switch coherently by role", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx")
  );

  assert.match(
    page,
    /const primaryCount = isOwner \? summary\.openCount : summary\.assignedCount/
  );
  assert.match(
    page,
    /isOwner\s*\? "stats\.openConversations"\s*: "stats\.myActiveChats"/
  );
  assert.match(
    page,
    /isOwner\s*\? "stats\.waitingInQueue"\s*: "stats\.availableToClaim"/
  );
  assert.match(
    page,
    /isOwner\s*\? "stats\.resolvedToday"\s*: "stats\.resolvedByYouToday"/
  );
  assert.match(page, /summary\.queueCount/);
  assert.match(page, /summary\.resolvedTodayCount/);
  assert.doesNotMatch(page, /availability\?\.currentChatCount/);
  assert.doesNotMatch(page, /\{stats\./);
});

test("the queue payload is bounded while its count remains exact", async () => {
  const handoff = stripComments(
    await read("../../apps/api/src/routes/handoff.ts")
  );
  const queue = handoff.slice(
    handoff.indexOf('"/projects/:id/queue"'),
    handoff.indexOf("const OfflineMessageSchema")
  );

  assert.match(
    queue,
    /\.select\([\s\S]*\{ count: "exact" \}[\s\S]*\)\s*\.eq\("project_id", projectId\)/
  );
  assert.match(queue, /\.range\(0, 4\)/);
  assert.match(queue, /count: queueCount/);
  assert.doesNotMatch(queue, /count: \(queue \|\| \[\]\)\.length/);
});

test("both dashboard locales include every role-specific headline", async () => {
  for (const locale of ["en", "ar"]) {
    const inbox = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    ).pages.inbox;

    for (const key of ["ownerSubtitle", "memberSubtitle"]) {
      assert.equal(
        typeof inbox[key],
        "string",
        `${locale} missing inbox.${key}`
      );
      assert.ok(inbox[key].length > 0);
    }
    for (const key of [
      "openConversations",
      "myActiveChats",
      "waitingInQueue",
      "availableToClaim",
      "resolvedToday",
      "resolvedByYouToday",
    ]) {
      assert.equal(
        typeof inbox.stats[key],
        "string",
        `${locale} missing inbox.stats.${key}`
      );
      assert.ok(inbox.stats[key].length > 0);
    }
  }
});
