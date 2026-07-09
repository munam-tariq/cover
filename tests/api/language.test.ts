import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLanguageDirective,
  detectBaseLanguage,
  detectDominantLanguage,
  isRtl,
  parseLanguageTag,
  projectLanguageDefault,
  resolveConversationLanguage,
  resolveGreetingLanguage,
  toResolvedLanguage,
} from "../../apps/api/src/services/language.ts";

describe("parseLanguageTag", () => {
  it("splits base and region, normalizing case", () => {
    assert.deepEqual(parseLanguageTag("ar-SA"), { base: "ar", region: "SA" });
    assert.deepEqual(parseLanguageTag("AR_sa"), { base: "ar", region: "SA" });
    assert.deepEqual(parseLanguageTag("en"), { base: "en", region: undefined });
  });

  it("defaults to English on empty input", () => {
    assert.equal(parseLanguageTag("").base, "en");
  });
});

describe("toResolvedLanguage", () => {
  it("attaches a Saudi dialect label for ar-SA", () => {
    const r = toResolvedLanguage("ar-SA");
    assert.equal(r.base, "ar");
    assert.equal(r.bcp47, "ar-SA");
    assert.match(r.dialectLabel ?? "", /Saudi/);
    assert.equal(r.rtl, true);
  });

  it("has no dialect label for bare Arabic or English", () => {
    assert.equal(toResolvedLanguage("ar").dialectLabel, undefined);
    assert.equal(toResolvedLanguage("en").rtl, false);
  });
});

describe("detectBaseLanguage", () => {
  it("detects Arabic script", () => {
    assert.equal(detectBaseLanguage("مرحبا كيف حالك"), "ar");
  });

  it("detects Latin/English", () => {
    assert.equal(detectBaseLanguage("hello there"), "en");
  });

  it("prefers Arabic when the text is mixed", () => {
    assert.equal(detectBaseLanguage("order رقم 123"), "ar");
  });

  it("returns null when undecidable", () => {
    assert.equal(detectBaseLanguage("12345 !!!"), null);
    assert.equal(detectBaseLanguage(""), null);
    assert.equal(detectBaseLanguage(null), null);
  });
});

describe("detectDominantLanguage", () => {
  it("returns the majority script for a mostly-Arabic sample", () => {
    const sample =
      "نحن نقدم خدمات الدعم الفني على مدار الساعة. Support 24/7.";
    assert.equal(detectDominantLanguage(sample), "ar");
  });

  it("returns English for a mostly-English sample with a few Arabic words", () => {
    const sample =
      "We offer round-the-clock technical support for all plans. مرحبا";
    assert.equal(detectDominantLanguage(sample), "en");
  });

  it("returns null when there aren't enough letters to decide", () => {
    assert.equal(detectDominantLanguage("123 ..."), null);
    assert.equal(detectDominantLanguage(""), null);
    assert.equal(detectDominantLanguage(null), null);
  });
});

describe("projectLanguageDefault", () => {
  it("reads settings.language.default", () => {
    assert.equal(projectLanguageDefault({ language: { default: "ar-SA" } }), "ar-SA");
  });

  it("falls back to the legacy widget_appearance.locale_default", () => {
    assert.equal(
      projectLanguageDefault({ widget_appearance: { locale_default: "ar" } }),
      "ar"
    );
  });

  it("returns null when neither is set", () => {
    assert.equal(projectLanguageDefault({}), null);
    assert.equal(projectLanguageDefault(null), null);
  });
});

describe("isRtl", () => {
  it("flags Arabic as RTL and English as LTR", () => {
    assert.equal(isRtl("ar"), true);
    assert.equal(isRtl("en"), false);
  });
});

describe("resolveGreetingLanguage", () => {
  it("uses the project default (Arabic wins over an unset browser)", () => {
    const r = resolveGreetingLanguage("ar-SA");
    assert.equal(r.bcp47, "ar-SA");
    assert.match(r.dialectLabel ?? "", /Saudi/);
  });

  it("falls back to English when no default is set", () => {
    assert.equal(resolveGreetingLanguage(null).base, "en");
  });
});

describe("resolveConversationLanguage", () => {
  it("pins to a stored language when present", () => {
    const r = resolveConversationLanguage({
      storedLang: "ar-SA",
      messageText: "hello in english now",
      projectDefault: "ar-SA",
    });
    assert.equal(r.bcp47, "ar-SA");
  });

  it("attaches the project region to a detected Arabic message", () => {
    const r = resolveConversationLanguage({
      storedLang: null,
      messageText: "كم سعر الاشتراك؟",
      projectDefault: "ar-SA",
    });
    assert.equal(r.bcp47, "ar-SA");
    assert.match(r.dialectLabel ?? "", /Saudi/);
  });

  it("mirrors an English visitor on an Arabic-default project (no region)", () => {
    const r = resolveConversationLanguage({
      storedLang: null,
      messageText: "what are your prices?",
      projectDefault: "ar-SA",
    });
    assert.equal(r.bcp47, "en");
    assert.equal(r.dialectLabel, undefined);
  });

  it("falls back to the project default when the message is undecidable", () => {
    const r = resolveConversationLanguage({
      storedLang: null,
      messageText: "123 ???",
      projectDefault: "ar-SA",
    });
    assert.equal(r.bcp47, "ar-SA");
  });
});

describe("buildLanguageDirective", () => {
  it("names the Saudi dialect and the sticky/switch rule for Arabic", () => {
    const d = buildLanguageDirective(toResolvedLanguage("ar-SA"));
    assert.match(d, /Arabic/);
    assert.match(d, /Saudi/);
    assert.match(d, /switch languages/i);
  });

  it("omits the dialect clause for English", () => {
    const d = buildLanguageDirective(toResolvedLanguage("en"));
    assert.match(d, /Reply in English/);
    assert.doesNotMatch(d, /dialect/);
  });
});
