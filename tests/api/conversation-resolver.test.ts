import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const resolverPath = new URL(
  "../../apps/api/src/services/channels/conversation-resolver.ts",
  import.meta.url
);

describe("conversation-resolver source", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(resolverPath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("queries with latest_open statuses for that strategy", async () => {
    assert.ok(
      src.includes('"ai_active"') &&
        src.includes('"waiting"') &&
        src.includes('"agent_active"'),
      "latest_open must include ai_active, waiting, and agent_active"
    );
  });

  it("uses .in() for status matching in latest_open", async () => {
    assert.ok(
      src.includes('.in("status"'),
      "Should use .in() for multi-status query"
    );
  });

  it("filters by source to avoid cross-channel reuse", async () => {
    assert.ok(
      src.includes('.eq("source"'),
      "Must filter by source column"
    );
  });

  it("orders by created_at descending and limits to 1", async () => {
    assert.ok(src.includes("ascending: false"));
    assert.ok(src.includes(".limit(1)"));
  });

  it("creates new conversation with ai_active status", async () => {
    assert.ok(
      src.includes('status: "ai_active"'),
      "New conversations must start ai_active"
    );
  });

  it("exports resolveConversation", async () => {
    assert.ok(
      src.includes("export async function resolveConversation"),
      "Must export resolveConversation"
    );
  });
});
