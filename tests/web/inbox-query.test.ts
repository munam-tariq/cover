import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInboxApiParams,
  getActiveInboxFilters,
  isTerminalInboxStatus,
  parseInboxQuery,
  serializeInboxQuery,
  type InboxQueryState,
} from "../../apps/web/lib/inbox-query.ts";

const channels = [
  "widget",
  "whatsapp",
  "public",
  "mobile",
  "playground",
  "api",
  "mcp",
];

test("inbox query defaults to the active attention queue", () => {
  const state = parseInboxQuery(new URLSearchParams(), true, channels);

  assert.equal(state.scope, "mine");
  assert.equal(state.status, "active");
  assert.equal(state.sort, "attention");
  assert.equal(state.page, 1);
  assert.equal(state.needsReply, false);
});

test("inbox query normalizes status, role, and assignment invariants", () => {
  assert.equal(
    parseInboxQuery(
      new URLSearchParams("status=closed&sort=attention"),
      true,
      channels
    ).sort,
    "recent"
  );
  assert.equal(
    parseInboxQuery(new URLSearchParams("scope=all"), false, channels).scope,
    "mine"
  );
  assert.equal(
    parseInboxQuery(
      new URLSearchParams("status=waiting&scope=mine"),
      false,
      channels
    ).scope,
    "all"
  );
  assert.equal(
    parseInboxQuery(new URLSearchParams("status=ai_active"), false, channels)
      .status,
    "active"
  );
  assert.equal(
    parseInboxQuery(
      new URLSearchParams("scope=mine&assignedAgent=me"),
      true,
      channels
    ).assignedAgent,
    null
  );
});

test("terminal inbox statuses expose their sort restriction from shared query logic", () => {
  assert.equal(isTerminalInboxStatus("resolved"), true);
  assert.equal(isTerminalInboxStatus("closed"), true);
  assert.equal(isTerminalInboxStatus("auto_closed"), true);
  assert.equal(isTerminalInboxStatus("waiting"), false);
  assert.equal(isTerminalInboxStatus("active"), false);
});

test("inbox query whitelists URL values and literal true flags", () => {
  const state = parseInboxQuery(
    new URLSearchParams(
      "channel=voice&sort=random&needsReply=false&voiceUsed=true&flagged=1&page=-2"
    ),
    true,
    channels
  );

  assert.equal(state.source, null);
  assert.equal(state.sort, "attention");
  assert.equal(state.needsReply, false);
  assert.equal(state.voiceUsed, true);
  assert.equal(state.flagged, false);
  assert.equal(state.page, 1);
  assert.equal(
    parseInboxQuery(new URLSearchParams("page=2147483648"), true, channels)
      .page,
    1
  );
});

test("inbox query serializes only meaningful non-default state", () => {
  const state: InboxQueryState = {
    scope: "all",
    status: "agent_active",
    source: "widget",
    sort: "attention",
    needsReply: true,
    voiceUsed: true,
    assignedAgent: "me",
    handoffReason: "keyword",
    activityPeriod: "7d",
    flagged: true,
    page: 2,
  };

  const serialized = serializeInboxQuery(state);
  assert.equal(serialized.get("scope"), "all");
  assert.equal(serialized.get("channel"), "widget");
  assert.equal(serialized.get("needsReply"), "true");
  assert.equal(serialized.get("page"), "2");
  assert.equal(serialized.has("sort"), false);

  const defaults = serializeInboxQuery(
    parseInboxQuery(new URLSearchParams(), true, channels)
  );
  assert.equal(defaults.toString(), "");
});

test("inbox API parameters and secondary filter descriptors share normalized state", () => {
  const state = parseInboxQuery(
    new URLSearchParams(
      "scope=all&status=agent_active&channel=widget&needsReply=true&voiceUsed=true&assignedAgent=me&flagged=true&page=3"
    ),
    true,
    channels
  );
  const params = buildInboxApiParams(
    state,
    "11111111-1111-4111-8111-111111111111"
  );

  assert.equal(params.get("status"), "agent_active");
  assert.equal(params.get("source"), "widget");
  assert.equal(params.get("scope"), "all");
  assert.equal(params.get("flagged"), "true");
  assert.equal(params.get("limit"), "25");

  assert.deepEqual(getActiveInboxFilters(state), [
    "needsReply",
    "voiceUsed",
    "assignedAgent",
    "flagged",
  ]);
});
