import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const apiPackagePath = new URL("../../apps/api/package.json", import.meta.url);
const apiIndexPath = new URL("../../apps/api/src/index.ts", import.meta.url);
const apiTsupConfigPath = new URL(
  "../../apps/api/tsup.config.ts",
  import.meta.url
);
const errorReporterPath = new URL(
  "../../apps/api/src/middleware/error-reporter.ts",
  import.meta.url
);

test("API preloads Sentry before the application in development and production", async () => {
  const packageJson = JSON.parse(await readFile(apiPackagePath, "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.match(packageJson.scripts.dev, /--import\s+\.\/src\/instrument\.ts/);
  assert.match(
    packageJson.scripts.start,
    /--import\s+\.\/dist\/instrument\.mjs/
  );
  assert.match(packageJson.scripts.build, /^tsup$/);
});

test("API production bundles TypeScript workspace dependencies", async () => {
  const source = await readFile(apiTsupConfigPath, "utf8");

  assert.match(source, /entry:\s*\[[^\]]*["']src\/instrument\.ts["']/s);
  assert.match(source, /noExternal:\s*\[[^\]]*["']@chatbot\/shared["']/s);
});

test("API entrypoint does not rely on a static import for Sentry preload ordering", async () => {
  const source = await readFile(apiIndexPath, "utf8");
  assert.doesNotMatch(source, /import\s+["']\.\/instrument["']/);
});

test("error reporting does not install a custom uncaughtException listener", async () => {
  const source = await readFile(errorReporterPath, "utf8");
  assert.doesNotMatch(source, /process\.on\(["']uncaughtException["']/);
  assert.doesNotMatch(source, /registerGlobalErrorHandlers/);
});
