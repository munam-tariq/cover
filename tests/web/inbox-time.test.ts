import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInboxTime,
  type InboxTimeLabels,
} from "../../apps/web/lib/inbox-time.ts";

process.env.TZ = "UTC";

const now = new Date("2026-07-16T12:00:00.000Z");
const labels: InboxTimeLabels = {
  lessThanMinute: "less than a minute",
  waitingFor: ({ duration }) => `Waiting ${duration}`,
  customerReplied: ({ relative }) => `Customer replied ${relative}`,
  yesterdayAt: ({ time }) => `Yesterday, ${time}`,
};

const format = (
  overrides: Partial<Parameters<typeof formatInboxTime>[0]> = {}
) =>
  formatInboxTime({
    sort: "recent",
    priorityReason: "activity",
    priorityAt: "2026-07-16T10:37:00.000Z",
    meaningfulActivityAt: "2026-07-16T10:37:00.000Z",
    locale: "en-US",
    labels,
    now,
    ...overrides,
  });

test("attention timestamps explain waiting and customer reply priority", () => {
  assert.equal(
    format({
      sort: "attention",
      priorityReason: "waiting",
      priorityAt: "2026-07-16T11:42:00.000Z",
    }).text,
    "Waiting 18 min"
  );

  const replied = format({
    sort: "attention",
    priorityReason: "customer_reply",
    priorityAt: "2026-07-16T11:18:00.000Z",
  }).text;
  assert.match(replied, /^Customer replied /);
  assert.match(replied, /42/);
});

test("recent timestamps add calendar context only when needed", () => {
  assert.equal(format().text, "10:37 AM");
  assert.equal(
    format({ meaningfulActivityAt: "2026-07-15T18:12:00.000Z" }).text,
    "Yesterday, 6:12 PM"
  );
  assert.equal(
    format({ meaningfulActivityAt: "2026-07-12T14:05:00.000Z" }).text,
    "Jul 12, 2:05 PM"
  );
  assert.equal(
    format({ meaningfulActivityAt: "2025-07-12T14:05:00.000Z" }).text,
    "Jul 12, 2025, 2:05 PM"
  );
});

test("timestamp tooltip includes the full localized date and timezone", () => {
  const full = format().full;
  assert.match(full, /Thursday/);
  assert.match(full, /July 16, 2026/);
  assert.match(full, /(Coordinated Universal Time|UTC)/);
});

test("future clock skew never produces a negative waiting duration", () => {
  assert.equal(
    format({
      sort: "attention",
      priorityReason: "waiting",
      priorityAt: "2026-07-16T12:00:30.000Z",
    }).text,
    "Waiting less than a minute"
  );
});
