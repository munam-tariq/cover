import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const MESSAGES_DIR = join(import.meta.dirname, "../../apps/web/messages");

/** Flatten nested JSON to dot-paths; arrays contribute index-less paths + length. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return [
      `${prefix}[len=${value.length}]`,
      ...value.flatMap((item, i) => keyPaths(item, `${prefix}[${i}]`)),
    ];
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
}

test("en and ar have identical namespace files", () => {
  const en = readdirSync(join(MESSAGES_DIR, "en")).sort();
  const ar = readdirSync(join(MESSAGES_DIR, "ar")).sort();
  assert.deepEqual(ar, en);
});

test("every ar namespace has exactly the en key set", () => {
  for (const file of readdirSync(join(MESSAGES_DIR, "en"))) {
    const en = JSON.parse(readFileSync(join(MESSAGES_DIR, "en", file), "utf8"));
    const ar = JSON.parse(readFileSync(join(MESSAGES_DIR, "ar", file), "utf8"));
    assert.deepEqual(
      keyPaths(ar).sort(),
      keyPaths(en).sort(),
      `key mismatch in ${file}`
    );
  }
});

test("no ar value is left identical to en (untranslated copy)", () => {
  // Allowlist for strings that are legitimately the same in both languages.
  const allowSame = new Set([
    "FrontFace", "BETA", "WhatsApp", "Slack", "Messenger", "LinkedIn", "YouTube",
    "English", "العربية", "%s | FrontFace", "24/7",
    "10 – 30", "31 – 100", "www.yourcompany.com",
  ]);
  for (const file of readdirSync(join(MESSAGES_DIR, "en"))) {
    const en = JSON.parse(readFileSync(join(MESSAGES_DIR, "en", file), "utf8"));
    const ar = JSON.parse(readFileSync(join(MESSAGES_DIR, "ar", file), "utf8"));
    const flatten = (v: unknown, out: Map<string, string>, p = ""): Map<string, string> => {
      if (Array.isArray(v)) v.forEach((x, i) => flatten(x, out, `${p}[${i}]`));
      else if (v !== null && typeof v === "object")
        Object.entries(v as Record<string, unknown>).forEach(([k, x]) => flatten(x, out, p ? `${p}.${k}` : k));
      else if (typeof v === "string") out.set(p, v);
      return out;
    };
    const enFlat = flatten(en, new Map());
    const arFlat = flatten(ar, new Map());
    for (const [path, enVal] of enFlat) {
      if (enVal.length < 4 || allowSame.has(enVal)) continue;
      assert.notEqual(arFlat.get(path), enVal, `untranslated ar value at ${file}:${path}`);
    }
  }
});
