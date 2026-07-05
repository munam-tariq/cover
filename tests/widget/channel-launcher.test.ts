import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appearancePath = path.join(
  process.cwd(),
  "apps/widget/src/utils/widget-appearance.ts"
);
const appearanceModuleUrl = new URL(
  "../../apps/widget/src/utils/widget-appearance.ts",
  import.meta.url
);

test("widget-appearance exports ChannelButton type", async () => {
  const source = await readFile(appearancePath, "utf8");
  assert.match(source, /export\s+interface\s+ChannelButton/);
  assert.match(source, /type:\s*ChannelButtonType/);
  assert.match(source, /url:\s*string/);
});

test("WidgetDisplayConfig has optional channels field", async () => {
  const source = await readFile(appearancePath, "utf8");
  const configBlock = source.slice(
    source.indexOf("interface WidgetDisplayConfig"),
    source.indexOf("interface ResolvedWidgetAppearance")
  );
  assert.match(configBlock, /channels\?.*ChannelButton\[\]/);
});

test("ResolvedWidgetAppearance has channels field", async () => {
  const source = await readFile(appearancePath, "utf8");
  const resolvedBlock = source.slice(
    source.indexOf("interface ResolvedWidgetAppearance"),
    source.indexOf("interface WidgetStrings")
  );
  assert.match(resolvedBlock, /channels:\s*ChannelButton\[\]/);
});

test("parseDisplayConfig handles channels array", async () => {
  const source = await readFile(appearancePath, "utf8");
  assert.match(source, /value\.channels/);
});

test("resolveWidgetAppearanceDefaults defaults channels to empty array", async () => {
  const source = await readFile(appearancePath, "utf8");
  assert.match(source, /channels:\s*config\?\.channels\s*\?\?\s*\[\]/);
});

test("isAllowedUrl allows channel URL schemes and rejects unsafe schemes", async () => {
  const mod = await import(appearanceModuleUrl.href);
  const isAllowedUrl = mod.isAllowedUrl as (url: string) => boolean;

  assert.equal(isAllowedUrl("https://wa.me/15550100042"), true);
  assert.equal(isAllowedUrl("http://example.com"), true);
  assert.equal(isAllowedUrl("mailto:hi@example.com"), true);
  assert.equal(isAllowedUrl("tel:+15550100042"), true);
  assert.equal(isAllowedUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedUrl("data:text/html,<svg></svg>"), false);
});

test("isAllowedIconUrl only allows https/http (not mailto/tel)", async () => {
  const mod = await import(appearanceModuleUrl.href);
  const isAllowedIconUrl = mod.isAllowedIconUrl as (url: string) => boolean;

  assert.equal(isAllowedIconUrl("https://example.com/icon.png"), true);
  assert.equal(isAllowedIconUrl("http://example.com/icon.png"), true);
  assert.equal(isAllowedIconUrl("mailto:hi@example.com"), false);
  assert.equal(isAllowedIconUrl("tel:+15550100042"), false);
  assert.equal(isAllowedIconUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedIconUrl("data:image/svg+xml,<svg></svg>"), false);
});
