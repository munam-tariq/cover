import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { generateDisplayCode } from "../../apps/api/src/services/auth-link-code.ts";

const servicePath = path.join(
  process.cwd(),
  "apps/api/src/services/auth-link-code.ts"
);

test("generateDisplayCode returns exactly 6 digits, zero-padded", () => {
  for (let i = 0; i < 1000; i++) {
    const code = generateDisplayCode();
    assert.match(code, /^\d{6}$/, `got "${code}"`);
  }
});

test("generateDisplayCode uses crypto randomness, not Math.random", async () => {
  const src = await readFile(servicePath, "utf8");
  assert.match(src, /randomInt/);
  assert.doesNotMatch(src, /Math\.random/);
});

test("stashAuthCode cleans up expired rows and retries on 23505 collision", async () => {
  const src = await readFile(servicePath, "utf8");
  const block = src.slice(src.indexOf("export async function stashAuthCode"));
  assert.match(block, /\.delete\(\)\s*\.lt\(["']expires_at["']/);
  assert.match(block, /23505/, "must retry only on unique-violation");
});

test("claimAuthCode is a single atomic delete-returning (single use)", async () => {
  const src = await readFile(servicePath, "utf8");
  const block = src.slice(src.indexOf("export async function claimAuthCode"));
  assert.match(block, /\.delete\(\)/);
  assert.match(block, /\.eq\(["']display_code["'],\s*displayCode\)/);
  assert.match(
    block,
    /\.gt\(["']expires_at["']/,
    "expiry must be enforced in the same statement"
  );
  assert.match(block, /\.select\(["']auth_code["']\)/);
});

test("claimAuthCode throws on DB error instead of returning null", async () => {
  const src = await readFile(servicePath, "utf8");
  const block = src.slice(src.indexOf("export async function claimAuthCode"));
  assert.match(block, /if\s*\(\s*error\s*\)\s*\{?\s*throw/);
});
