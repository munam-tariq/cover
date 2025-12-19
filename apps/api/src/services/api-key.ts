/**
 * API Key Service
 *
 * Handles generation, hashing, and verification of account-level API keys
 * for MCP authentication.
 *
 * Key format: ck_<32 random alphanumeric chars>
 * Example: ck_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 */

import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

// API key configuration
const KEY_PREFIX = "ck_";
const KEY_LENGTH = 32; // 32 random chars after prefix
const SALT_LENGTH = 16;
const HASH_LENGTH = 64;

// Characters for random key generation (alphanumeric)
const KEY_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate a cryptographically secure random API key
 * @returns Object containing the full key, display prefix, and hash
 */
export async function generateApiKey(): Promise<{
  key: string;
  prefix: string;
  hash: string;
}> {
  // Generate random key
  const randomBytes = crypto.randomBytes(KEY_LENGTH);
  let randomPart = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    randomPart += KEY_CHARS[randomBytes[i] % KEY_CHARS.length];
  }

  const fullKey = `${KEY_PREFIX}${randomPart}`;

  // Create display prefix (first 8 chars of random part)
  const prefix = `${KEY_PREFIX}${randomPart.substring(0, 8)}...`;

  // Hash the key
  const hash = await hashApiKey(fullKey);

  return {
    key: fullKey,
    prefix,
    hash,
  };
}

/**
 * Hash an API key using scrypt
 * @param key - The full API key to hash
 * @returns The hashed key in format: salt:hash (hex encoded)
 */
export async function hashApiKey(key: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = (await scrypt(key, salt, HASH_LENGTH)) as Buffer;

  // Return salt:hash format
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/**
 * Verify an API key against a stored hash
 * @param key - The API key to verify
 * @param storedHash - The stored hash in format: salt:hash
 * @returns True if the key matches
 */
export async function verifyApiKey(
  key: string,
  storedHash: string
): Promise<boolean> {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) {
      return false;
    }

    const [saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const storedDerivedKey = Buffer.from(hashHex, "hex");

    // Derive key from input
    const derivedKey = (await scrypt(key, salt, HASH_LENGTH)) as Buffer;

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(derivedKey, storedDerivedKey);
  } catch {
    return false;
  }
}

/**
 * Mask an API key for display
 * @param prefix - The stored key prefix (e.g., "ck_abc12345...")
 * @returns Masked display string
 */
export function maskApiKey(prefix: string): string {
  return prefix;
}

/**
 * Validate API key format
 * @param key - The key to validate
 * @returns True if the key has valid format
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== "string") {
    return false;
  }

  // Must start with prefix
  if (!key.startsWith(KEY_PREFIX)) {
    return false;
  }

  // Must be correct length: prefix (3) + random part (32) = 35
  if (key.length !== KEY_PREFIX.length + KEY_LENGTH) {
    return false;
  }

  // Random part must be alphanumeric
  const randomPart = key.substring(KEY_PREFIX.length);
  return /^[a-z0-9]+$/.test(randomPart);
}
