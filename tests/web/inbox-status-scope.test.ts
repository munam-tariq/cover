/**
 * Inbox status filter vs. ownership scope
 *
 * The two controls are independent, and one pairing is empty by construction: an auto-closed chat
 * was handled by the AI and assigned to nobody, so it can never appear under "Mine". Left alone the
 * inbox renders "No conversations" — indistinguishable from "none exist" — and a non-owner, whom the
 * API caps at `assigned_agent_id = me OR status = waiting`, is offered filters with no reachable
 * state at all.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getConversationStatusMeta,
  getStatusFilterOption,
  getStatusFilterOptions,
} from "../../apps/web/lib/conversation-status.ts";

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("only the AI-handled statuses are marked unassigned", () => {
  // ai_active has no agent by definition, and auto_closed is the cron closing an ai_active chat.
  assert.equal(getStatusFilterOption("ai_active")?.unassigned, true);
  assert.equal(getStatusFilterOption("auto_closed")?.unassigned, true);

  // A plain close comes from an agent, the visitor, or the offline form — genuinely mixed, so it
  // must stay available to everyone.
  assert.notEqual(getStatusFilterOption("closed")?.unassigned, true);
  assert.notEqual(getStatusFilterOption("agent_active")?.unassigned, true);
  assert.notEqual(getStatusFilterOption("resolved")?.unassigned, true);
  assert.notEqual(getStatusFilterOption("waiting")?.unassigned, true);
});

test("a non-owner is not offered a filter their scope can never return", () => {
  const values = getStatusFilterOptions(false).map((o) => o.value);
  assert.ok(!values.includes("auto_closed"));
  assert.ok(!values.includes("ai_active"));

  // Everything reachable stays: their own chats, plus the waiting queue the API lets them see.
  assert.deepEqual(values, [
    "active",
    "waiting",
    "agent_active",
    "resolved",
    "closed",
  ]);
});

test("an owner still gets every filter", () => {
  const values = getStatusFilterOptions(true).map((o) => o.value);
  assert.deepEqual(values, [
    "active",
    "ai_active",
    "waiting",
    "agent_active",
    "resolved",
    "closed",
    "auto_closed",
  ]);
});

test("auto_closed is the inbox API's direct semantic filter value", () => {
  const option = getStatusFilterOption("auto_closed");
  assert.equal(option?.status, "auto_closed");
  assert.equal(option?.closeReason, undefined);
});

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

test("the inbox explains an empty list caused by the scope, and offers the way out", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx")
  );

  // The condition must be the scope/status pairing itself — not "the list came back empty", which
  // is also true when there genuinely are no such chats.
  assert.match(
    page,
    /inboxQuery\.scope === "mine" &&\s*getStatusFilterOption\(inboxQuery\.status\)\?\.unassigned === true/,
    "the explanation must key off the pairing that is empty by construction"
  );
  assert.match(page, /empty\.unassignedScopeTitle/);
  assert.match(page, /empty\.unassignedScopeHint/);
  assert.match(
    page,
    /updateInboxQuery\(\{ \.\.\.inboxQuery, scope: "all" \}\)/,
    "explaining without offering the fix just moves the guessing"
  );

  // The dropdown must be role-aware, or the non-owner filtering above is dead code.
  assert.match(page, /getStatusFilterOptions\(isOwner\)\.map/);
});

test("both locales carry the empty-state copy", async () => {
  for (const locale of ["en", "ar"]) {
    const messages = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    );
    const empty = messages.pages.inbox.empty;
    for (const key of [
      "unassignedScopeTitle",
      "unassignedScopeHint",
      "showAll",
    ]) {
      assert.equal(
        typeof empty[key],
        "string",
        `${locale} is missing inbox.empty.${key}`
      );
      assert.ok(empty[key].length > 0, `${locale} inbox.empty.${key} is blank`);
    }
  }
});

test("scope, source, status, and page are sent to the conversations API", async () => {
  const [page, query] = await Promise.all([
    read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx").then(
      stripComments
    ),
    read("../../apps/web/lib/inbox-query.ts").then(stripComments),
  ]);

  assert.match(page, /buildInboxApiParams\(/);
  assert.match(query, /scope: state\.scope/);
  assert.match(query, /status: state\.status/);
  assert.match(query, /page: String\(state\.page\)/);
  assert.match(
    query,
    /if \(state\.source\) params\.set\("source", state\.source\)/
  );
  assert.doesNotMatch(page, /\.filter\(\(conv\) =>\s*filter === "mine"/);
  assert.doesNotMatch(page, /\.filter\(\(conv\) => sourceFilter/);
});

test("the API delegates active status, source, scope, and pagination to the ordered RPC", async () => {
  const route = stripComments(
    await read("../../apps/api/src/routes/conversations.ts")
  );
  const list = route.slice(
    route.indexOf('router.get("/"'),
    route.indexOf('router.get("/:id"')
  );

  assert.match(list, /getInboxConversationPage\(/);
  assert.match(list, /scope: effectiveScope/);
  assert.match(list, /status,[\s\S]*source/);
  assert.match(
    list,
    /const effectiveScope = status === "waiting" \? "all" : scope/
  );
  assert.match(list, /page,[\s\S]*limit/);
  assert.doesNotMatch(list, /\.range\(/);
  assert.doesNotMatch(list, /\.order\("last_message_at"/);
  assert.doesNotMatch(list, /\.select\("\*/);
});

test("the inbox renders API pagination controls and summary-derived stats", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx")
  );
  assert.match(page, /pagination\.totalPages/);
  assert.match(page, /page: inboxQuery\.page - 1/);
  assert.match(page, /page: inboxQuery\.page \+ 1/);
  assert.match(page, /summary\.resolvedTodayCount/);
  assert.match(page, /summary\.queueCount/);
  assert.match(page, /summary\.openCount/);
  assert.match(page, /summary\.assignedCount/);
  assert.doesNotMatch(page, /availability\?\.currentChatCount/);
});

test("capacity-changing actions refresh the shared availability counter", async () => {
  const inbox = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );
  const detail = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx"
  );

  assert.match(
    inbox,
    /availability,[\s\S]*refreshAvailability,[\s\S]*= useAgent\(\)/
  );
  const overview = inbox.slice(
    inbox.indexOf("const fetchInboxOverview"),
    inbox.indexOf("const fetchAssignableMembers")
  );
  assert.match(overview, /refreshAvailability\(\)/);
  assert.match(
    inbox,
    /await Promise\.all\(\[fetchConversationPage\(\), fetchInboxOverview\(\)\]\)/
  );
  assert.ok(
    detail.match(/await refreshAvailability\(\)/g)?.length >= 3,
    "resolve, transfer, and return-to-AI must all refresh capacity"
  );
});

test("subsequent inbox fetches load only the conversation results", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx")
  );

  assert.match(
    page,
    /const \[listLoading, setListLoading\] = useState\(false\)/,
    "subsequent requests need loading state independent from the page shell"
  );
  assert.match(
    page,
    /const isInitialLoading =\s*projectLoading \|\|[\s\S]*listReadyProjectId !== currentProject\.id[\s\S]*overviewReadyProjectId !== currentProject\.id/,
    "initial loading must be derived from the selected project"
  );

  const initialLoadingIndex = page.indexOf("if (isInitialLoading)");
  const noProjectIndex = page.indexOf(
    "if (!currentProject)",
    initialLoadingIndex
  );
  const fullPageLoading = page.slice(initialLoadingIndex, noProjectIndex);
  assert.ok(
    fullPageLoading.length > 0,
    "the initial page skeleton must remain"
  );
  assert.doesNotMatch(
    fullPageLoading,
    /listLoading/,
    "list refetches must not activate the full-page skeleton"
  );

  const filtersIndex = page.indexOf("getStatusFilterOptions(isOwner).map");
  const listSkeletonIndex = page.indexOf("listLoading ? (");
  assert.ok(filtersIndex >= 0, "status filters must remain rendered");
  assert.ok(
    listSkeletonIndex > filtersIndex,
    "the loading branch must sit inside the results area, after the filters"
  );
  assert.match(
    page,
    /<ConversationListSkeleton label=\{statesT\("loading"\)\} \/>/
  );
});
