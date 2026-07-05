import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const callbackPath = path.join(
  process.cwd(),
  "apps/web/app/(auth)/auth/callback/page.tsx"
);

test("callback uses the shared post-auth helper (logic no longer inlined)", async () => {
  const src = await readFile(callbackPath, "utf8");
  assert.match(src, /resolvePostAuthRedirect/);
  assert.match(src, /from ["']@\/lib\/auth\/post-auth["']/);
  assert.doesNotMatch(
    src,
    /posthog\.capture\(["']signed_up["']\)/,
    "signed_up now lives in the shared helper only"
  );
});

test("verifier failures trigger the relay instead of the error screen", async () => {
  const src = await readFile(callbackPath, "utf8");
  assert.match(src, /verifier/i);
  assert.match(src, /\/api\/auth\/link-code/);
  assert.doesNotMatch(src, /\/api\/auth\/link-code\/claim/);
});

test("relay screen shows the display code and where to enter it", async () => {
  const src = await readFile(callbackPath, "utf8");
  assert.match(src, /Use verification code to continue/);
  assert.match(src, /where you first tried to sign in/);
  assert.match(src, /expires in 5 minutes/i);
});
