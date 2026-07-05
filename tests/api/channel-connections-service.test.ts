import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const typesPath = path.join(process.cwd(), "apps/api/src/types/channels.ts");
const servicePath = path.join(
  process.cwd(),
  "apps/api/src/services/channels/connections.ts"
);

test("channel types file exists and exports required types", async () => {
  const source = await readFile(typesPath, "utf8");
  assert.match(source, /ChannelProvider/);
  assert.match(source, /ChannelConnection/);
  assert.match(source, /WhatsAppCredentials/);
  assert.match(source, /['"]whatsapp['"]/);
});

test("connections service exports required functions", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /getConnectionByExternalId/);
  assert.match(source, /getActiveConnection/);
  assert.match(source, /upsertConnection/);
  assert.match(source, /setConnectionStatus/);
});

test("getConnectionsByExternalIds uses a single .in() query, not N+1 lookups", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /export async function getConnectionsByExternalIds/);
  const block = source.slice(
    source.indexOf("export async function getConnectionsByExternalIds"),
    source.indexOf("export async function getActiveConnection")
  );
  assert.match(block, /\.eq\(["']status["'],\s*["']active["']\)/);
  assert.match(block, /\.in\(["']external_id["'],\s*externalIds\)/);
});

test("getConnectionsByExternalIds throws on a query error instead of treating it as zero matches", async () => {
  const source = await readFile(servicePath, "utf8");
  const block = source.slice(
    source.indexOf("export async function getConnectionsByExternalIds"),
    source.indexOf("export async function getActiveConnection")
  );
  assert.match(
    block,
    /if\s*\(\s*error\s*\)\s*\{?\s*throw/,
    "A DB error must propagate so the caller can return 5xx (Meta retries), not be folded into an empty result that ACKs 200"
  );
  assert.doesNotMatch(
    block,
    /if\s*\(\s*error\s*\|\|\s*!data\s*\)\s*return\s*\[\]/,
    "Must not collapse 'query failed' and 'legitimately zero rows' into the same return value"
  );
});

test("connections service uses encryption.ts for credentials", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /encryptAuthConfig/);
  assert.match(source, /decryptAuthConfig/);
});

test("connections service uses supabaseAdmin (service role, not user client)", async () => {
  const source = await readFile(servicePath, "utf8");
  assert.match(source, /supabaseAdmin/);
  assert.doesNotMatch(
    source,
    /import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from/,
    "should import supabaseAdmin, not a bare supabase client"
  );
});

test("upsertConnection does not store credentials in plaintext", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;
  assert.match(
    upsertBlock,
    /encryptAuthConfig/,
    "upsertConnection must call encryptAuthConfig before storing"
  );
});

test("service returns encryptedCredentials (not credentials) so callers can't accidentally pass encrypted blobs", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;
  assert.match(source, /encryptedCredentials/, "return field must be named encryptedCredentials");
  assert.doesNotMatch(
    source,
    /credentials:\s*row\.credentials/,
    "must not map raw credentials field without the encrypted prefix"
  );
  assert.doesNotMatch(
    upsertBlock,
    /const\s*\{\s*credentials:/,
    "upsertConnection must strip encryptedCredentials from returned payloads, not a non-existent credentials field"
  );
});

test("upsertConnection filters by status=active with maybeSingle", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;
  assert.match(upsertBlock, /\.eq\(["']status["'],\s*["']active["']\)/);
  assert.match(upsertBlock, /\.maybeSingle\(\)/);
});

test("upsertConnection checks external-id ownership before reconnect update", async () => {
  const source = await readFile(servicePath, "utf8");
  const upsertBlock =
    source.slice(source.indexOf("upsertConnection"), source.indexOf("setConnectionStatus")) || source;

  assert.match(source, /resolveConnectionUpsertTarget/);
  assert.match(upsertBlock, /\.select\(["']id,\s*project_id["']\)/);
  assert.match(upsertBlock, /existingByExternalId/);
  assert.match(upsertBlock, /project_id/);
});
