/**
 * Customer flagging (the write side the filter needs)
 *
 * The inbox "Flagged customers only" filter reads customers.is_flagged, and the schema was built for
 * it (is_flagged + flagged_by FK + index + an RLS grant), but nothing ever wrote it — no endpoint
 * field, no UI — so the filter could never return a row. These guard the write side.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p: string) => readFile(new URL(p, import.meta.url), "utf8");

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("widget CORS permits PUT so the dashboard's customer write is not preflight-blocked", async () => {
  // /api/customers is mounted with widgetCors BEFORE its dashboardCors mount (the widget's POST
  // /identify shares the prefix), so widgetCors answers the preflight for the dashboard's
  // PUT /api/customers/:id. When its methods list omitted PUT the browser blocked the request with
  // "Failed to fetch" before it reached the handler — the flag toggle looked broken while the route
  // and DB were fine.
  const index = stripComments(await read("../../apps/api/src/index.ts"));
  const widget = index.slice(
    index.indexOf("const widgetCors"),
    index.indexOf("const widgetCors") + 400
  );
  assert.match(
    widget,
    /methods:\s*\[[^\]]*"PUT"[^\]]*\]/,
    "widgetCors must allow PUT, or PUT /api/customers/:id is preflight-blocked"
  );

  // The shadowing mount order this depends on: widget /api/customers must precede dashboard's.
  const widgetMount = index.indexOf('"/api/customers", widgetCors');
  const dashMount = index.indexOf('"/api/customers", dashboardCors');
  assert.ok(
    widgetMount > -1 && dashMount > widgetMount,
    "widgetCors owns the /api/customers preflight; if that changes, revisit the methods list"
  );
});

test("PUT /customers/:id can set the flag and records who set it", async () => {
  const route = stripComments(
    await read("../../apps/api/src/routes/customers.ts")
  );
  const put = route.slice(route.indexOf('router.put("/:id"'));

  assert.match(
    put,
    /isFlagged: z\.boolean\(\)\.optional\(\)/,
    "the schema must accept isFlagged"
  );
  assert.match(put, /updates\.is_flagged = validation\.data\.isFlagged/);
  // flagged_by is an FK to the acting user, cleared on unflag so the audit stays truthful.
  assert.match(
    put,
    /updates\.flagged_by = validation\.data\.isFlagged \? userId : null/,
    "flagging must record the actor and unflagging must clear it"
  );
});

test("the flag round-trips: it is selected and serialized back to the client", async () => {
  const route = await read("../../apps/api/src/routes/customers.ts");

  // Without is_flagged in the SELECT, serializeCustomer would always report false and the badge/
  // toggle would never reflect a real flag.
  assert.match(
    route,
    /is_flagged,\s*\$\{CUSTOMER_IDENTITY_EMBED\}`\s*\)\s*\.eq\("id", conversation\.customer_id\)/
  );
  assert.match(
    route,
    /isFlagged: c\.is_flagged \?\? false/,
    "the response must expose isFlagged"
  );
});

test("the detail page renders a flag toggle that calls the endpoint", async () => {
  const page = stripComments(
    await read("../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx")
  );

  assert.match(page, /onToggleFlag/, "the panel must receive a toggle handler");
  assert.match(
    page,
    /apiClient\(`\/api\/customers\/\$\{customer\.id\}`,\s*\{\s*method: "PUT"/,
    "the toggle must PUT the flag to the customer endpoint"
  );
  assert.match(page, /isFlagged: next/, "it must send the new flag value");
  // Optimistic, then revert on failure — the flag is cheap and reversible.
  assert.match(
    page,
    /setCustomer\(\(prev\) => \(prev \? \{ \.\.\.prev, isFlagged: !next \}/
  );
  // The label reflects state in both locales.
  for (const key of ["flagCustomer", "unflagCustomer"]) {
    for (const locale of ["en", "ar"]) {
      const messages = JSON.parse(
        await read(`../../apps/web/messages/${locale}/dashboard.json`)
      );
      assert.equal(
        typeof messages.pages.inbox.detail[key],
        "string",
        `${locale} missing inbox.detail.${key}`
      );
    }
  }
});
