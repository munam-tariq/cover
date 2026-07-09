import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const callbackPath = path.join(
  process.cwd(),
  "apps/web/app/[locale]/(auth)/auth/callback/page.tsx"
);
const authMessagesPath = path.join(
  process.cwd(),
  "apps/web/messages/en/auth.json"
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
  assert.match(src, /t\(["']verificationTitle["']\)/);
  assert.match(src, /t\(["']verificationSub["']\)/);
  assert.match(src, /t\(["']verificationExpiry["']\)/);

  const messages = JSON.parse(await readFile(authMessagesPath, "utf8"));
  assert.match(messages.callback.verificationTitle, /Use verification code to continue/);
  assert.match(messages.callback.verificationSub, /where you first tried to sign in/);
  assert.match(messages.callback.verificationExpiry, /expires in 5 minutes/i);
});
