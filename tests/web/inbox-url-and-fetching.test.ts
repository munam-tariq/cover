import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("the URL is the inbox control-state source of truth once role is known", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(page, /useSearchParams/);
  assert.match(page, /parseInboxQuery\(/);
  assert.match(page, /serializeInboxQuery\(/);
  assert.match(page, /normalizeInboxQuery\(/);
  assert.match(page, /router\.replace\([\s\S]*scroll: false/);
  assert.match(
    page,
    /if \(!currentProject \|\| agentLoading \|\| !role\) return/
  );
  assert.doesNotMatch(page, /useState<"mine" \| "all">/);
  assert.doesNotMatch(page, /\[statusFilter, setStatusFilter\]/);
});

test("list and overview requests have independent boundaries and stale guards", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(page, /const fetchConversationPage = useCallback/);
  assert.match(page, /const fetchInboxOverview = useCallback/);
  assert.match(page, /latestListRequestIdRef/);
  assert.match(page, /latestOverviewRequestIdRef/);
  assert.match(page, /buildInboxApiParams\(\s*inboxQuery/);

  const listStart = page.indexOf("const fetchConversationPage");
  const overviewStart = page.indexOf("const fetchInboxOverview");
  const listFetch = page.slice(listStart, overviewStart);
  assert.match(listFetch, /apiClient<InboxResponse>/);
  assert.doesNotMatch(listFetch, /\/queue/);
  assert.doesNotMatch(listFetch, /inbox-summary/);
  assert.doesNotMatch(listFetch, /refreshAvailability/);

  assert.match(
    page,
    /await Promise\.all\(\[\s*fetchConversationPage\(\),\s*fetchInboxOverview\(\)/
  );
  assert.match(page, /fetchAssignableMembers/);
});

test("list failures, quiet refreshes, and stale pages are handled honestly", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(page, /const \[listError, setListError\]/);
  assert.match(page, /background\) \{[\s\S]*console\.error/);
  assert.match(
    page,
    /responsePagination\.total > 0 &&[\s\S]*responsePagination\.totalPages/
  );
  assert.match(
    page,
    /updateInboxQuery\([\s\S]*page: response\.pagination\.totalPages/
  );
  assert.match(page, /listError \?/);
  assert.match(page, /filters\.retry/);
  assert.match(page, /empty\.waitingTitle/);
});
