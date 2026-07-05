import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const embedPath = path.join(process.cwd(), "apps/api/src/routes/embed.ts");

test("buildWidgetAppearanceConfig reads channels from widget_appearance", async () => {
  const source = await readFile(embedPath, "utf8");
  const fnBlock = source.slice(
    source.indexOf("function buildWidgetAppearanceConfig"),
    source.indexOf("function buildRealtimeClientConfig")
  );
  assert.match(fnBlock, /channels/);
  assert.match(fnBlock, /wa\.channels/);
});
