import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  selectReusableWidgetPreviewKey,
  type WidgetPreviewKeyCandidate,
} from "../../apps/api/src/services/widget-preview-key.ts";

const projectsPath = path.join(
  process.cwd(),
  "apps/api/src/routes/projects.ts"
);

function key(
  overrides: Partial<WidgetPreviewKeyCandidate>
): WidgetPreviewKeyCandidate {
  return {
    id: overrides.id ?? "key-id",
    key: overrides.key ?? "pk_12345678901234567890123456789012",
    platform: overrides.platform ?? "web",
    active: overrides.active ?? true,
    revokedAt: overrides.revokedAt ?? null,
  };
}

test("widget preview key selection reuses the first active web or all key", () => {
  const selected = selectReusableWidgetPreviewKey([
    key({ id: "mobile", key: "pk_mobile", platform: "mobile" }),
    key({ id: "web", key: "pk_web", platform: "web" }),
    key({ id: "all", key: "pk_all", platform: "all" }),
  ]);

  assert.equal(selected?.id, "web");
  assert.equal(selected?.key, "pk_web");
});

test("widget preview key selection ignores inactive and revoked keys", () => {
  const selected = selectReusableWidgetPreviewKey([
    key({ id: "inactive", key: "pk_inactive", platform: "web", active: false }),
    key({ id: "revoked", key: "pk_revoked", platform: "all", revokedAt: "2026-07-01T00:00:00.000Z" }),
    key({ id: "usable", key: "pk_usable", platform: "all" }),
  ]);

  assert.equal(selected?.id, "usable");
  assert.equal(selected?.key, "pk_usable");
});

test("projects route exposes a scoped dashboard widget preview key endpoint", async () => {
  const source = await readFile(projectsPath, "utf8");
  const start = source.indexOf('/:id/widget-preview-key"');
  const end = source.indexOf("/**\n * GET /api/projects/:id/client-keys", start);

  assert.notEqual(start, -1, "expected widget preview key route");
  assert.notEqual(end, -1, "expected preview key route before client-key lifecycle routes");

  const routeSource = source.slice(start, end);
  assert.match(routeSource, /listClientKeys\(id\)/);
  assert.match(routeSource, /selectReusableWidgetPreviewKey\(keys\)/);
  assert.match(routeSource, /createClientKey\(id,\s*"web",\s*"Dashboard preview"\)/);
  assert.match(routeSource, /PREVIEW_KEY_REQUIRED/);
  assert.match(routeSource, /res\.json\(\{\s*key:\s*existing\.key\s*\}\)/);
  assert.match(routeSource, /res\.status\(201\)\.json\(\{\s*key:\s*created\.key\s*\}\)/);
});
