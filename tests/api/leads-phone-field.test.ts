import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const leadCapturePath = new URL(
  "../../apps/api/src/routes/lead-capture.ts",
  import.meta.url
);

describe("leads phone field", () => {
  let src: string;

  it("loads source", async () => {
    src = await readFile(leadCapturePath, "utf-8");
    assert.ok(src.length > 0);
  });

  it("queries customers.phone for leads", () => {
    assert.ok(
      src.includes("customers") && src.includes("phone"),
      "Must join or query customers.phone for lead responses"
    );
  });

  it("includes phone in the lead response mapping", () => {
    const mapSection = src.slice(src.indexOf("leads:"));
    assert.ok(
      mapSection.includes("phone"),
      "Lead response mapping must include phone field"
    );
  });
});
