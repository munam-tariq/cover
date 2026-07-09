import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getUIStrings,
  isRtlLocale,
  normalizeLocale,
} from "../../packages/shared/src/i18n/index.ts";

/**
 * Keeps the shared widget/public-page UI strings (en/ar) in sync — the same
 * discipline the web message catalogs get via tests/web/i18n-parity.test.ts.
 */
describe("shared i18n (en/ar parity)", () => {
  const en = getUIStrings("en");
  const ar = getUIStrings("ar");
  const META = new Set(["locale", "rtl"]);
  const keys = Object.keys(en).filter((k) => !META.has(k));

  it("en and ar expose the same keys", () => {
    assert.deepEqual(
      Object.keys(en).sort(),
      Object.keys(ar).sort(),
      "en/ar key sets differ"
    );
  });

  it("every ar string is translated (not byte-identical to en)", () => {
    const untranslated = keys.filter(
      (k) =>
        typeof (en as Record<string, unknown>)[k] === "string" &&
        (en as Record<string, unknown>)[k] === (ar as Record<string, unknown>)[k]
    );
    assert.deepEqual(untranslated, [], "ar values identical to en");
  });

  it("interpolation placeholders survive translation", () => {
    assert.match(ar.queuePosition, /\{n\}/);
    assert.match(ar.agentNamedHelping, /\{name\}/);
    assert.match(ar.fieldRequired, /\{field\}/);
  });

  it("resolves direction + locale correctly", () => {
    assert.equal(en.rtl, false);
    assert.equal(ar.rtl, true);
    assert.equal(isRtlLocale("ar-SA"), true);
    assert.equal(isRtlLocale("en-US"), false);
    assert.equal(normalizeLocale("ar-SA"), "ar");
    assert.equal(normalizeLocale("fr"), "en"); // unsupported → English
  });
});
