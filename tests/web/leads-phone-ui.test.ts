import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const leadsPagePath = new URL(
  "../../apps/web/app/[locale]/(dashboard)/leads/page.tsx",
  import.meta.url
);
const leadListItemPath = new URL(
  "../../apps/web/app/[locale]/(dashboard)/leads/components/lead-list-item.tsx",
  import.meta.url
);

describe("leads phone UI", () => {
  it("allows searching leads by customers.phone", async () => {
    const src = await readFile(leadsPagePath, "utf-8");
    const filterSection = src.slice(src.indexOf("const filteredLeads"));

    assert.match(
      filterSection,
      /lead\.phone\?\.\s*toLowerCase\(\)\.includes\(/,
      "Lead search should include the first-class customers.phone field"
    );
  });

  it("renders customers.phone in the lead list item", async () => {
    const src = await readFile(leadListItemPath, "utf-8");

    assert.ok(src.includes("Phone"), "Lead list item should import/render the phone icon");
    assert.match(
      src,
      /lead\.phone/,
      "Lead list item should render the first-class customers.phone field"
    );
  });
});
