import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectsPath = path.join(
  process.cwd(),
  "apps/api/src/routes/projects.ts"
);
const validationModuleUrl = new URL(
  "../../apps/api/src/lib/url-validation.ts",
  import.meta.url
);

test("shared URL validators allow channel schemes but restrict icon schemes", async () => {
  const mod = await import(validationModuleUrl.href);
  const isSafeChannelUrl = mod.isSafeChannelUrl as (url: unknown) => boolean;
  const isSafeIconUrl = mod.isSafeIconUrl as (url: unknown) => boolean;

  assert.equal(isSafeChannelUrl("https://wa.me/15550100042"), true);
  assert.equal(isSafeChannelUrl("http://example.com"), true);
  assert.equal(isSafeChannelUrl("mailto:hi@example.com"), true);
  assert.equal(isSafeChannelUrl("tel:+15550100042"), true);
  assert.equal(isSafeChannelUrl("javascript:alert(1)"), false);
  assert.equal(isSafeChannelUrl("data:text/html,<svg></svg>"), false);

  assert.equal(isSafeIconUrl("https://example.com/icon.png"), true);
  assert.equal(isSafeIconUrl("http://example.com/icon.png"), true);
  assert.equal(isSafeIconUrl("mailto:hi@example.com"), false);
  assert.equal(isSafeIconUrl("tel:+15550100042"), false);
  assert.equal(isSafeIconUrl("javascript:alert(1)"), false);
  assert.equal(isSafeIconUrl("data:image/svg+xml,<svg></svg>"), false);
});

test("projects PUT uses shared channel and icon URL validators", async () => {
  const source = await readFile(projectsPath, "utf8");
  const putBlock = source.slice(
    source.indexOf('router.put("/:id"'),
    source.indexOf("router.delete") > 0
      ? source.indexOf("router.delete")
      : source.length
  );
  assert.match(putBlock, /widget_appearance/);
  assert.match(putBlock, /channels/);
  assert.match(putBlock, /isSafeChannelUrl/);
  assert.match(putBlock, /isSafeIconUrl/);
  assert.match(putBlock, /INVALID_CHANNEL_URL|UNSAFE_URL|INVALID_URL/i);
});
