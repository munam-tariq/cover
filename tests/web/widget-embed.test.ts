import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildWidgetEmbedCode,
  resolveWidgetPreviewScriptUrl,
  resolveWidgetScriptUrl,
} from "../../apps/web/lib/widget-embed.ts";

const DEPLOYED_WIDGET_URL =
  "https://hynaqwwofkpaafvlckdm.supabase.co/storage/v1/object/public/assets/widget.js";

test("buildWidgetEmbedCode returns the canonical settings-driven snippet", () => {
  assert.equal(
    buildWidgetEmbedCode({
      projectId: "project-123",
      apiUrl: "http://localhost:3001",
      scriptUrl: DEPLOYED_WIDGET_URL,
    }),
    `<script
  src="${DEPLOYED_WIDGET_URL}"
  data-project-id="project-123"
  data-api-url="http://localhost:3001"
  async>
</script>`
  );
});

test("resolveWidgetScriptUrl supports a legacy base URL or a complete script URL", () => {
  assert.equal(
    resolveWidgetScriptUrl("https://cdn.frontface.app"),
    "https://cdn.frontface.app/widget.js"
  );
  assert.equal(
    resolveWidgetScriptUrl("https://cdn.frontface.app/widget.js"),
    "https://cdn.frontface.app/widget.js"
  );
  assert.equal(resolveWidgetScriptUrl(undefined), DEPLOYED_WIDGET_URL);
});

test("resolveWidgetPreviewScriptUrl uses the local dev bundle unless explicitly configured", () => {
  assert.equal(
    resolveWidgetPreviewScriptUrl({
      nodeEnv: "development",
      deployedScriptUrl: DEPLOYED_WIDGET_URL,
    }),
    "http://localhost:7001/dist/widget.js"
  );
  assert.equal(
    resolveWidgetPreviewScriptUrl({
      nodeEnv: "production",
      deployedScriptUrl: DEPLOYED_WIDGET_URL,
    }),
    DEPLOYED_WIDGET_URL
  );
  assert.equal(
    resolveWidgetPreviewScriptUrl({
      nodeEnv: "development",
      configuredPreviewUrl: "http://localhost:9000/custom-widget.js",
      deployedScriptUrl: DEPLOYED_WIDGET_URL,
    }),
    "http://localhost:9000/custom-widget.js"
  );
});

test("all dashboard embed-code surfaces use the shared generator", () => {
  const files = [
    "apps/web/app/(dashboard)/embed/page.tsx",
    "apps/web/app/(dashboard)/projects/[projectId]/components/overview-tab.tsx",
    "apps/web/app/(dashboard)/projects/[projectId]/components/widget-tab.tsx",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /buildWidgetEmbedCode/);
    assert.doesNotMatch(source, /widget\.cover\.ai/);
  }
});
