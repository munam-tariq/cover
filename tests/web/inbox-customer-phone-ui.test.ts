import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const inboxDetailPath = new URL(
  "../../apps/web/app/(dashboard)/inbox/[id]/page.tsx",
  import.meta.url
);
const inboxListPath = new URL(
  "../../apps/web/app/(dashboard)/inbox/page.tsx",
  import.meta.url
);

describe("inbox customer phone UI", () => {
  it("uses customer phone as a fallback identity in the inbox list", async () => {
    const src = await readFile(inboxListPath, "utf-8");
    const itemSection = src.slice(
      src.indexOf("function ConversationListItem"),
      src.indexOf("function QueueListItem")
    );

    assert.match(src, /customerPhone:\s*string\s*\|\s*null/);
    assert.match(
      itemSection,
      /getConversationDisplayName\(conversation\)/,
      "Conversation list should use the shared identity helper"
    );
  });

  it("types customer phone data from conversation and customer context", async () => {
    const src = await readFile(inboxDetailPath, "utf-8");

    assert.match(src, /customerPhone:\s*string\s*\|\s*null/);
    assert.match(src, /phone:\s*string\s*\|\s*null/);
  });

  it("uses customer phone as a fallback identity in the inbox detail header", async () => {
    const src = await readFile(inboxDetailPath, "utf-8");
    const mainSection = src.slice(src.indexOf("export default function ConversationPage"));

    assert.match(
      mainSection,
      /getConversationDisplayName\(conversation\)/,
      "Conversation detail header should use the shared identity helper"
    );
  });

  it("renders customers.phone in the customer context panel", async () => {
    const src = await readFile(inboxDetailPath, "utf-8");
    const panelSection = src.slice(
      src.indexOf("function CustomerContextPanel"),
      src.indexOf("{/* Lead Data */}")
    );

    assert.ok(panelSection.includes("Phone"));
    assert.match(
      panelSection,
      /conversation\.customerPhone\s*\|\|\s*customer\?\.phone/,
      "Customer context panel should render the first-class customers.phone field"
    );
  });
});
