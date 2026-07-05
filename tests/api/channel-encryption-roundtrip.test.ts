import assert from "node:assert/strict";
import test from "node:test";

const encryptionPath = new URL(
  "../../apps/api/src/services/encryption.ts",
  import.meta.url
);
const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("encryptAuthConfig / decryptAuthConfig round-trips JSON objects", async () => {
  const previousKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

  const mod = await import(encryptionPath.href);
  const encrypt = mod.encryptAuthConfig as (config: Record<string, unknown>) => string;
  const decrypt = mod.decryptAuthConfig as (encrypted: string) => Record<string, unknown>;

  const creds = { accessToken: "tok_123", appSecret: "sec_456", verifyToken: "vt_789", wabaId: "waba_0" };
  try {
    const encrypted = encrypt(creds);

    assert.notEqual(encrypted, JSON.stringify(creds), "encrypted output must differ from plaintext");
    assert.match(encrypted, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/, "format must be iv:authTag:ciphertext");

    const decrypted = decrypt(encrypted);
    assert.deepStrictEqual(decrypted, creds, "decrypted output must match original");
  } finally {
    if (previousKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = previousKey;
    }
  }
});
