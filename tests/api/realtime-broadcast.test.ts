import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const realtimePath = new URL(
  "../../apps/api/src/services/realtime.ts",
  import.meta.url
);

test("realtime.ts broadcast function exists and is structured for HTTP API", async () => {
  const source = await readFile(realtimePath, "utf8");

  // Must use fetch-based HTTP broadcast, not WebSocket channel create/send/remove
  assert.ok(
    source.includes("realtime/v1/api/broadcast"),
    "broadcast should use the HTTP Broadcast API endpoint"
  );
});

test("realtime.ts conditionally adds ?private=true based on REALTIME_PRIVATE_ENABLED", async () => {
  const source = await readFile(realtimePath, "utf8");

  assert.ok(
    source.includes("REALTIME_PRIVATE_ENABLED"),
    "broadcast should check REALTIME_PRIVATE_ENABLED feature flag"
  );
  assert.ok(
    source.includes("private=true"),
    "broadcast should include ?private=true when flag is enabled"
  );
});

test("realtime.ts sends both apikey and Authorization headers", async () => {
  const source = await readFile(realtimePath, "utf8");

  assert.ok(
    source.includes("apikey"),
    "broadcast should include apikey header"
  );
  assert.ok(
    source.includes("Authorization"),
    "broadcast should include Authorization header"
  );
});

test("realtime.ts does not throw on broadcast failure (best-effort)", async () => {
  const source = await readFile(realtimePath, "utf8");

  // The broadcast function should catch errors, not re-throw
  assert.ok(
    source.includes("catch"),
    "broadcast should have error handling"
  );
  // Should not re-throw
  assert.ok(
    !source.includes("throw error") && !source.includes("throw err"),
    "broadcast should not re-throw errors"
  );
});

test("realtime.ts encodes channel name and event type in URL", async () => {
  const source = await readFile(realtimePath, "utf8");

  assert.ok(
    source.includes("encodeURIComponent"),
    "broadcast should URL-encode channel and event names"
  );
});

test("realtime.ts no longer uses supabaseAdmin.channel for broadcasting", async () => {
  const source = await readFile(realtimePath, "utf8");

  assert.ok(
    !source.includes("supabaseAdmin.channel"),
    "should not use WebSocket-based supabaseAdmin.channel() for broadcasting"
  );
  assert.ok(
    !source.includes("removeChannel"),
    "should not need removeChannel cleanup (HTTP is stateless)"
  );
});
