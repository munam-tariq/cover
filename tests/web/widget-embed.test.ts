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

test("buildWidgetEmbedCode adds data-client-key only when a client key is provided", () => {
  assert.equal(
    buildWidgetEmbedCode({
      projectId: "project-123",
      apiUrl: "http://localhost:3001",
      scriptUrl: DEPLOYED_WIDGET_URL,
      clientKey: "pk_test_abc",
    }),
    `<script
  src="${DEPLOYED_WIDGET_URL}"
  data-project-id="project-123"
  data-api-url="http://localhost:3001"
  data-client-key="pk_test_abc"
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
    "apps/web/app/[locale]/(dashboard)/embed/page.tsx",
    "apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/overview-tab.tsx",
    "apps/web/app/[locale]/(dashboard)/projects/[projectId]/components/widget-tab.tsx",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /buildWidgetEmbedCode/);
    assert.doesNotMatch(source, /widget\.cover\.ai/);
  }
});

test("dashboard widget preview iframe does not combine scripts with same-origin sandboxing", () => {
  const source = readFileSync("apps/web/app/[locale]/(dashboard)/embed/page.tsx", "utf8");
  const iframeStart = source.indexOf("<iframe");
  const iframeEnd = source.indexOf("/>", iframeStart);

  assert.notEqual(iframeStart, -1, "expected preview iframe");
  assert.notEqual(iframeEnd, -1, "expected iframe boundary");
  const iframeSource = source.slice(iframeStart, iframeEnd);

  assert.match(iframeSource, /sandbox="allow-scripts"/);
  assert.doesNotMatch(iframeSource, /allow-same-origin/);
});

test("dashboard widget preview passes a scoped client key without adding it to public embed code", () => {
  const source = readFileSync("apps/web/app/[locale]/(dashboard)/embed/page.tsx", "utf8");

  assert.match(source, /previewClientKey/);
  assert.match(source, /\/api\/projects\/\$\{projectId\}\/widget-preview-key/);

  const publicEmbedStart = source.indexOf("const embedCode = currentProject");
  const publicEmbedEnd = source.indexOf("const handleCopy", publicEmbedStart);
  assert.notEqual(publicEmbedStart, -1, "expected public embed code block");
  assert.notEqual(publicEmbedEnd, -1, "expected public embed code block boundary");
  const publicEmbedSource = source.slice(publicEmbedStart, publicEmbedEnd);
  assert.doesNotMatch(publicEmbedSource, /clientKey:/);

  const previewStart = source.indexOf("const previewHtml = currentProject");
  const previewEnd = source.indexOf("</html>`", previewStart);
  assert.notEqual(previewStart, -1, "expected preview html block");
  assert.notEqual(previewEnd, -1, "expected preview html block boundary");
  const previewSource = source.slice(previewStart, previewEnd);
  assert.match(previewSource, /clientKey:\s*previewClientKey/);

  assert.match(source, /previewKeyWarning/);
  assert.match(source, /t\(["']previewKeyOwnerWarning["']\)/);

  const dashboardMessages = JSON.parse(
    readFileSync("apps/web/messages/en/dashboard.json", "utf8")
  );
  assert.match(
    dashboardMessages.pages.embed.previewKeyOwnerWarning,
    /A project owner must create the widget preview key\./
  );

  const iframeStart = source.indexOf("<iframe");
  const iframeEnd = source.indexOf("/>", iframeStart);
  assert.notEqual(iframeStart, -1, "expected preview iframe");
  assert.notEqual(iframeEnd, -1, "expected preview iframe boundary");
  const iframeSource = source.slice(iframeStart, iframeEnd);
  assert.match(iframeSource, /key=\{`\$\{previewKey\}-\$\{previewClientKey \?\? "no-key"\}`\}/);
});
