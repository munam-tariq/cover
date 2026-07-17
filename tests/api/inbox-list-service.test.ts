import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_KEY ??= "test-service-key";

const service = import("../../apps/api/src/services/inbox-list.ts");

test("inbox RPC decoder accepts ordered items and an independent total", async () => {
  const { parseInboxPageRpc } = await service;
  const value = {
    total: 12,
    items: [
      {
        conversation_id: "11111111-1111-4111-8111-111111111111",
        priority_reason: "customer_reply",
        priority_at: "2026-07-16T07:00:00.000Z",
      },
    ],
  };

  assert.deepEqual(parseInboxPageRpc(value), value);
});

test("inbox RPC decoder preserves non-zero totals for empty stale pages", async () => {
  const { parseInboxPageRpc } = await service;
  assert.deepEqual(parseInboxPageRpc({ total: 12, items: [] }), {
    total: 12,
    items: [],
  });
});

test("inbox RPC decoder rejects malformed database payloads", async () => {
  const { parseInboxPageRpc } = await service;

  assert.throws(() =>
    parseInboxPageRpc({
      total: -1,
      items: [
        {
          conversation_id: "not-a-uuid",
          priority_reason: "unknown",
          priority_at: "not-a-date",
        },
      ],
    })
  );
});
