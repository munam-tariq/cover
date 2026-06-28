import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const realtimePath = new URL(
  "../../apps/widget/src/utils/realtime.ts",
  import.meta.url
);
const widgetConfigPath = new URL(
  "../../apps/widget/src/utils/widget-config.ts",
  import.meta.url
);
const chatWindowPath = new URL(
  "../../apps/widget/src/components/chat-window.ts",
  import.meta.url
);

test("widget realtime config requires a public apiKey separate from the session JWT", async () => {
  const source = await readFile(widgetConfigPath, "utf8");

  assert.match(source, /apiKey:\s*string/);
  assert.match(source, /isString\(value\.apiKey\)/);
  assert.match(source, /apiKey:\s*value\.apiKey/);
});

test("widget realtime client uses apiKey for apikey and token only for setAuth", async () => {
  const source = await readFile(realtimePath, "utf8");

  assert.match(source, /private apiKey:\s*string/);
  assert.match(source, /constructor\(\s*apiUrl:\s*string,\s*supabaseUrl:\s*string,\s*apiKey:\s*string/);
  assert.match(source, /params:\s*\{\s*apikey:\s*this\.apiKey\s*\}/);
  assert.doesNotMatch(source, /params:\s*\{\s*apikey:\s*token\s*\}/);
  assert.match(source, /\.setAuth\(token\)/);
});

test("chat window passes the realtime apiKey from embed config into the manager", async () => {
  const source = await readFile(chatWindowPath, "utf8");

  assert.match(source, /rtConfig\?\.apiKey/);
  assert.match(source, /getRealtimeManager\(\s*this\.options\.apiUrl,\s*rtConfig\?\.supabaseUrl \|\| "",\s*rtConfig\?\.apiKey \|\| ""/);
});
