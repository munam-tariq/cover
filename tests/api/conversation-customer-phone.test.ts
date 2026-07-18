import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const conversationsPath = new URL(
  "../../apps/api/src/routes/conversations.ts",
  import.meta.url
);
const customersPath = new URL(
  "../../apps/api/src/routes/customers.ts",
  import.meta.url
);

describe("conversation customer phone API", () => {
  it("includes customers.phone in conversation list responses", async () => {
    const src = await readFile(conversationsPath, "utf-8");
    const listSection = src.slice(
      src.indexOf('router.get("/"'),
      src.indexOf('router.get("/:id"')
    );
    const responseSection = src.slice(
      src.indexOf("function formatInboxConversation"),
      src.indexOf("async function getMessageCursor")
    );

    assert.match(
      listSection,
      /customers!conversations_customer_id_fkey\(id,\s*email,\s*name,\s*phone,\s*is_flagged,/,
      "Conversation list query should select customers.phone through the qualified FK embed"
    );
    assert.match(
      responseSection,
      /customerEmail:\s*customer\??\.email\s*\?\?\s*conv\.customer_email/,
      "Conversation list response should expose customer email at the top level"
    );
    assert.match(
      responseSection,
      /customerName:\s*customer\??\.name\s*\?\?\s*conv\.customer_name/,
      "Conversation list response should expose customer name at the top level"
    );
    assert.match(
      responseSection,
      /customerPhone:\s*customer\??\.phone/,
      "Conversation list response should expose customers.phone as customerPhone"
    );
  });

  it("includes customers.phone in conversation detail responses", async () => {
    const src = await readFile(conversationsPath, "utf-8");
    const responseSection = src.slice(src.indexOf("res.json({"));

    assert.match(
      responseSection,
      /customerPhone:\s*conversation\.customers\??\.phone/,
      "Conversation detail response should expose customers.phone as customerPhone"
    );
  });

  it("serializes customers.phone in customer context responses", async () => {
    const src = await readFile(customersPath, "utf-8");
    const serializerSection = src.slice(
      src.indexOf("function serializeCustomer"),
      src.indexOf("// `updateCustomerRow`")
    );

    assert.match(
      serializerSection,
      /phone:\s*c\.phone/,
      "Customer context serializer should expose customers.phone"
    );
  });
});
