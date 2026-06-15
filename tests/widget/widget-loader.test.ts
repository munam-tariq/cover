import assert from "node:assert/strict";
import test from "node:test";

import { resolveWidgetAppUrl } from "../../apps/widget/src/utils/widget-loader.ts";

test("loads the widget app beside a localhost loader, even inside srcdoc", () => {
  assert.equal(
    resolveWidgetAppUrl({
      loaderSrc: "http://localhost:7001/dist/widget.js",
      version: "release-version",
      cacheBuster: 123,
    }),
    "http://localhost:7001/dist/widget-app.js?v=123"
  );
});

test("loads the deployed widget app for a production loader", () => {
  assert.equal(
    resolveWidgetAppUrl({
      loaderSrc: "https://cdn.frontface.app/widget.js",
      version: "release-version",
      productionBaseUrl: "https://cdn.frontface.app",
    }),
    "https://cdn.frontface.app/widget-app.js?v=release-version"
  );
});
