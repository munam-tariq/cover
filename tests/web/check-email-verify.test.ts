import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const loginPath = path.join(
  process.cwd(),
  "apps/web/app/(auth)/login/page.tsx"
);
const checkEmailPath = path.join(
  process.cwd(),
  "apps/web/app/(auth)/login/check-email/page.tsx"
);

test("login passes returnUrl through to check-email", async () => {
  const src = await readFile(loginPath, "utf8");
  const redirect = src.slice(src.indexOf("/login/check-email"));
  assert.match(redirect, /returnUrl/);
});

test("check-email claims the display code and exchanges locally", async () => {
  const src = await readFile(checkEmailPath, "utf8");
  assert.match(src, /\/api\/auth\/link-code\/claim/);
  assert.match(src, /exchangeCodeForSession/);
  assert.match(src, /resolvePostAuthRedirect/);
});

test("check-email verification input is 6-digit numeric", async () => {
  const src = await readFile(checkEmailPath, "utf8");
  assert.match(src, /maxLength=\{6\}/);
  assert.match(src, /inputMode="numeric"/);
});

test("check-email honors returnUrl after code entry and on resend", async () => {
  const src = await readFile(checkEmailPath, "utf8");
  assert.match(src, /returnUrl/);
  // Resend must preserve the next-destination the same way login does
  const resendBlock = src.slice(
    src.indexOf("const handleResend"),
    src.indexOf("const handleVerifyCode")
  );
  assert.match(resendBlock, /emailRedirectTo/);
  assert.match(resendBlock, /returnUrl/);
});
