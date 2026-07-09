import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDisplayConfig,
  resolveWidgetAppearanceDefaults,
  pickLocale,
  mergeConfigWithDataAttributes,
  getWidgetStrings,
} from "../../apps/widget/src/utils/widget-appearance.ts";

// ─── parseDisplayConfig (appearance fields) ───────────────────────────────────
test("parseDisplayConfig: returns undefined for non-records", () => {
  assert.equal(parseDisplayConfig(null), undefined);
  assert.equal(parseDisplayConfig("nope"), undefined);
});

test("parseDisplayConfig: parses the base display fields", () => {
  const out = parseDisplayConfig({
    primaryColor: "#123456",
    position: "bottom-left",
    title: "Help",
    greeting: "Hi",
  });
  assert.equal(out?.primaryColor, "#123456");
  assert.equal(out?.position, "bottom-left");
  assert.equal(out?.title, "Help");
});

test("parseDisplayConfig: parses appearance fields with valid values", () => {
  const out = parseDisplayConfig({
    theme: "dark",
    avatarUrl: "https://cdn/a.png",
    launcherIconUrl: "https://cdn/l.png",
    bubbleColor: "#ff0000",
    usePrimaryForHeader: false,
    hideBranding: true,
    placeholder: "Ask me…",
    starters: ["How do I start?", "Pricing?"],
    notice: { enabled: true, text: "We are migrating" },
    footer: { text: "Privacy", url: "https://x/privacy" },
    feedbackEnabled: true,
    copyEnabled: false,
    localeDefault: "fr",
  });
  assert.equal(out?.theme, "dark");
  assert.equal(out?.avatarUrl, "https://cdn/a.png");
  assert.equal(out?.launcherIconUrl, "https://cdn/l.png");
  assert.equal(out?.bubbleColor, "#ff0000");
  assert.equal(out?.usePrimaryForHeader, false);
  assert.equal(out?.hideBranding, true);
  assert.equal(out?.placeholder, "Ask me…");
  assert.deepEqual(out?.starters, ["How do I start?", "Pricing?"]);
  assert.deepEqual(out?.notice, { enabled: true, text: "We are migrating" });
  assert.deepEqual(out?.footer, { text: "Privacy", url: "https://x/privacy" });
  assert.equal(out?.feedbackEnabled, true);
  assert.equal(out?.copyEnabled, false);
  assert.equal(out?.localeDefault, "fr");
});

test("parseDisplayConfig: ignores invalid appearance values", () => {
  const out = parseDisplayConfig({
    theme: "rainbow",
    starters: ["ok", 5],
    notice: { enabled: "yes", text: 1 },
    footer: { url: "https://x" },
    hideBranding: "true",
  });
  assert.equal(out?.theme, undefined);
  assert.equal(out?.starters, undefined);
  assert.equal(out?.notice, undefined);
  assert.equal(out?.footer, undefined); // footer requires a string `text`
  assert.equal(out?.hideBranding, undefined);
});

// ─── resolveWidgetAppearanceDefaults ──────────────────────────────────────────
test("resolveWidgetAppearanceDefaults: fills defaults when nothing is provided", () => {
  const r = resolveWidgetAppearanceDefaults(undefined);
  assert.equal(r.theme, "light");
  assert.equal(r.position, "bottom-right");
  assert.equal(r.placeholder, "Type a message...");
  assert.equal(r.usePrimaryForHeader, true);
  assert.equal(r.hideBranding, false);
  assert.equal(r.feedbackEnabled, false);
  assert.equal(r.copyEnabled, true);
  assert.deepEqual(r.starters, []);
  assert.deepEqual(r.notice, { enabled: false, text: "" });
  assert.equal(r.footer, null);
  assert.equal(r.localeDefault, "en");
  assert.equal(r.avatarUrl, null);
  assert.equal(r.bubbleColor, null);
});

test("resolveWidgetAppearanceDefaults: provided values win", () => {
  const r = resolveWidgetAppearanceDefaults({
    theme: "dark",
    position: "bottom-left",
    placeholder: "Ask",
    hideBranding: true,
    starters: ["a"],
    footer: { text: "P", url: "u" },
    bubbleColor: "#abc",
  });
  assert.equal(r.theme, "dark");
  assert.equal(r.position, "bottom-left");
  assert.equal(r.placeholder, "Ask");
  assert.equal(r.hideBranding, true);
  assert.deepEqual(r.starters, ["a"]);
  assert.deepEqual(r.footer, { text: "P", url: "u" });
  assert.equal(r.bubbleColor, "#abc");
});

// ─── pickLocale ───────────────────────────────────────────────────────────────
test("pickLocale: matches a navigator language by primary subtag", () => {
  assert.equal(pickLocale(["fr-FR", "en-US"], ["en", "fr", "de"], "en"), "fr");
});

test("pickLocale: respects navigator-language order", () => {
  assert.equal(pickLocale(["es", "fr"], ["fr", "es"], "en"), "es");
});

test("pickLocale: falls back when nothing matches or list is empty", () => {
  assert.equal(pickLocale(["de-DE"], ["en", "fr"], "en"), "en");
  assert.equal(pickLocale([], ["en"], "en"), "en");
});

// ─── widget strings ──────────────────────────────────────────────────────────
test("getWidgetStrings: localizes widget controls from browser language", () => {
  const strings = getWidgetStrings(["es-MX"], "en");

  assert.equal(strings.defaultPlaceholder, "Escribe un mensaje...");
  assert.equal(strings.sendMessage, "Enviar mensaje");
  assert.equal(strings.copyMessage, "Copiar mensaje");
  assert.equal(strings.dismissNotice, "Cerrar aviso");
  assert.equal(strings.poweredBy, "Con tecnología de FrontFace");
});

test("getWidgetStrings: uses localeDefault when browser language is unsupported", () => {
  const strings = getWidgetStrings(["pt-BR"], "es");

  assert.equal(strings.locale, "es");
  assert.equal(strings.copied, "Copiado");
});

test("getWidgetStrings: falls back to English for an unsupported localeDefault", () => {
  const strings = getWidgetStrings([], "xx");

  assert.equal(strings.locale, "en");
  assert.equal(strings.defaultPlaceholder, "Type a message...");
});

test("getWidgetStrings: an explicit ar-SA project default wins over the browser", () => {
  const strings = getWidgetStrings(["en-US"], "ar-SA");

  assert.equal(strings.locale, "ar");
  assert.equal(strings.rtl, true);
  assert.equal(strings.defaultPlaceholder, "اكتب رسالة...");
  assert.equal(strings.talkToHuman, "التحدث مع موظف");
});

test("getWidgetStrings: English default still lets the browser language win", () => {
  const strings = getWidgetStrings(["ar-SA"], "en");

  assert.equal(strings.locale, "ar");
  assert.equal(strings.rtl, true);
});

// ─── mergeConfigWithDataAttributes ────────────────────────────────────────────
test("mergeConfigWithDataAttributes: data attributes override config", () => {
  const out = mergeConfigWithDataAttributes(
    { primaryColor: "#000", title: "A", position: "bottom-right" },
    { primaryColor: "#fff", position: "bottom-left" }
  );
  assert.equal(out.primaryColor, "#fff");
  assert.equal(out.position, "bottom-left");
  assert.equal(out.title, "A");
});

test("mergeConfigWithDataAttributes: undefined data attributes are ignored", () => {
  const out = mergeConfigWithDataAttributes(
    { title: "A" },
    { primaryColor: undefined, title: undefined }
  );
  assert.deepEqual(out, { title: "A" });
});
