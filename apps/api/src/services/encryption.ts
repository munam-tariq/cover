import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }

  // Validate key length (32 bytes = 64 hex chars)
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }

  return Buffer.from(key, "hex");
}

/**
 * Encrypt a string value using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedText - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const [ivHex, authTagHex, ciphertext] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt an object (auth config) to a JSON string, then encrypt it
 * @param config - Object to encrypt
 * @returns Encrypted string
 */
export function encryptAuthConfig(config: Record<string, unknown>): string {
  return encrypt(JSON.stringify(config));
}

/**
 * Decrypt an encrypted auth config back to an object
 * @param encryptedConfig - Encrypted config string
 * @returns Decrypted config object
 */
export function decryptAuthConfig(
  encryptedConfig: string
): Record<string, unknown> {
  const decrypted = decrypt(encryptedConfig);
  return JSON.parse(decrypted);
}

/**
 * Generate a new encryption key (for setup purposes)
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
