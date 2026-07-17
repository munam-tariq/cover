import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMessageCursorFilter,
  pageDescendingMessages,
} from "../../apps/api/src/services/message-pagination.ts";

test("message pages stay chronological but continue from the oldest returned row", () => {
  const descending = [
    { id: "newest" },
    { id: "middle" },
    { id: "oldest-on-page" },
    { id: "next-page" },
  ];

  const page = pageDescendingMessages(descending, 3);

  assert.deepEqual(
    page.messages.map(({ id }) => id),
    ["oldest-on-page", "middle", "newest"]
  );
  assert.equal(page.nextCursor, "oldest-on-page");
  assert.equal(page.hasMore, true);
  assert.deepEqual(
    descending.map(({ id }) => id),
    ["newest", "middle", "oldest-on-page", "next-page"]
  );
});

test("message cursor filters use timestamp and id as a deterministic pair", () => {
  const createdAt = "2026-07-16T01:02:03.000Z";
  const id = "11111111-1111-4111-8111-111111111111";

  assert.equal(
    buildMessageCursorFilter("before", createdAt, id),
    `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`
  );
  assert.equal(
    buildMessageCursorFilter("after", createdAt, id),
    `created_at.gt.${createdAt},and(created_at.eq.${createdAt},id.gt.${id})`
  );
});
