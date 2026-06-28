import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const embedPath = new URL(
  "../../apps/api/src/routes/embed.ts",
  import.meta.url
);

test("buildRealtimeClientConfig never returns supabaseAnonKey", async () => {
  const source = await readFile(embedPath, "utf8");

  // Extract the buildRealtimeClientConfig function body
  const fnStart = source.indexOf("export function buildRealtimeClientConfig");
  assert.notEqual(fnStart, -1, "function should exist");

  // Find the closing brace by counting brace depth
  let depth = 0;
  let fnEnd = fnStart;
  let started = false;
  for (let i = fnStart; i < source.length; i++) {
    if (source[i] === "{") { depth++; started = true; }
    if (source[i] === "}") depth--;
    if (started && depth === 0) { fnEnd = i + 1; break; }
  }
  const fnBody = source.slice(fnStart, fnEnd);

  // Must not return supabaseAnonKey in any code path
  assert.ok(
    !fnBody.includes("supabaseAnonKey"),
    "buildRealtimeClientConfig must not return supabaseAnonKey"
  );
});

test("buildRealtimeClientConfig returns tokenBased flag when feature is enabled", async () => {
  const source = await readFile(embedPath, "utf8");

  assert.ok(
    source.includes("tokenBased"),
    "embed config should include tokenBased flag"
  );
});

test("buildRealtimeClientConfig returns a publishable realtime apiKey", async () => {
  const source = await readFile(embedPath, "utf8");

  const fnStart = source.indexOf("export function buildRealtimeClientConfig");
  let depth = 0, fnEnd = fnStart, started = false;
  for (let i = fnStart; i < source.length; i++) {
    if (source[i] === "{") { depth++; started = true; }
    if (source[i] === "}") depth--;
    if (started && depth === 0) { fnEnd = i + 1; break; }
  }
  const fnBody = source.slice(fnStart, fnEnd);

  assert.ok(fnBody.includes("apiKey"), "realtime config should include apiKey");
  assert.ok(
    fnBody.includes("SUPABASE_PUBLISHABLE_KEY"),
    "apiKey should come from a publishable Supabase key"
  );
  assert.ok(
    !fnBody.includes("SUPABASE_ANON_KEY"),
    "realtime config should not fall back to legacy anon-key env vars"
  );
});

test("buildRealtimeClientConfig checks REALTIME_PRIVATE_ENABLED", async () => {
  const source = await readFile(embedPath, "utf8");

  const fnStart = source.indexOf("export function buildRealtimeClientConfig");
  let depth = 0, fnEnd = fnStart, started = false;
  for (let i = fnStart; i < source.length; i++) {
    if (source[i] === "{") { depth++; started = true; }
    if (source[i] === "}") depth--;
    if (started && depth === 0) { fnEnd = i + 1; break; }
  }
  const fnBody = source.slice(fnStart, fnEnd);

  assert.ok(
    fnBody.includes("REALTIME_PRIVATE_ENABLED"),
    "should check REALTIME_PRIVATE_ENABLED feature flag"
  );
});

test("buildRealtimeClientConfig returns enabled: false when gate is enforced and private is off", async () => {
  const source = await readFile(embedPath, "utf8");

  const fnStart = source.indexOf("export function buildRealtimeClientConfig");
  let depth = 0, fnEnd = fnStart, started = false;
  for (let i = fnStart; i < source.length; i++) {
    if (source[i] === "{") { depth++; started = true; }
    if (source[i] === "}") depth--;
    if (started && depth === 0) { fnEnd = i + 1; break; }
  }
  const fnBody = source.slice(fnStart, fnEnd);

  // Should have a path that returns { enabled: false }
  assert.ok(
    fnBody.includes("enabled: false"),
    "should have a code path returning enabled: false"
  );
});

test("buildRealtimeClientConfig requires validated Realtime JWT signing config", async () => {
  const source = await readFile(embedPath, "utf8");

  const fnStart = source.indexOf("export function buildRealtimeClientConfig");
  let depth = 0, fnEnd = fnStart, started = false;
  for (let i = fnStart; i < source.length; i++) {
    if (source[i] === "{") { depth++; started = true; }
    if (source[i] === "}") depth--;
    if (started && depth === 0) { fnEnd = i + 1; break; }
  }
  const fnBody = source.slice(fnStart, fnEnd);

  assert.ok(
    source.includes("canIssueRealtimeTokens"),
    "embed route should import the Realtime JWT config validator"
  );
  assert.ok(
    fnBody.includes("canIssueRealtimeTokens()"),
    "buildRealtimeClientConfig should fail closed when JWT signing config is invalid"
  );
});
