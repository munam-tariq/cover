import assert from "node:assert/strict";
import { test } from "node:test";

import {
  defaultLocaleRewritePath,
  isEnglishOnlyPath,
  stripArabicPrefixForEnglishOnly,
} from "../../apps/web/i18n/english-only-routes.ts";

test("detects English-only public routes", () => {
  assert.equal(isEnglishOnlyPath("/blog"), true);
  assert.equal(isEnglishOnlyPath("/blog/cut-support-tickets-without-hiring"), true);
  assert.equal(isEnglishOnlyPath("/vs"), true);
  assert.equal(isEnglishOnlyPath("/vs/chatbase"), true);
  assert.equal(isEnglishOnlyPath("/use-cases"), true);
  assert.equal(isEnglishOnlyPath("/use-cases/saas"), true);
  assert.equal(isEnglishOnlyPath("/features"), false);
  assert.equal(isEnglishOnlyPath("/ar/blog"), false);
});

test("strips /ar only for English-only Arabic URLs", () => {
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/blog"), "/blog");
  assert.equal(
    stripArabicPrefixForEnglishOnly("/ar/blog/cut-support-tickets-without-hiring"),
    "/blog/cut-support-tickets-without-hiring"
  );
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/vs/chatbase"), "/vs/chatbase");
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/use-cases/saas"), "/use-cases/saas");
  assert.equal(stripArabicPrefixForEnglishOnly("/ar/features"), null);
  assert.equal(stripArabicPrefixForEnglishOnly("/blog"), null);
});

test("builds internal default-locale rewrite paths", () => {
  assert.equal(defaultLocaleRewritePath("/blog"), "/en/blog");
  assert.equal(defaultLocaleRewritePath("/blog/post"), "/en/blog/post");
  assert.equal(defaultLocaleRewritePath("/vs/chatbase"), "/en/vs/chatbase");
});
