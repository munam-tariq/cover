import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const helperPath = path.join(process.cwd(), "apps/web/lib/auth/post-auth.ts");

test("helper exports resolvePostAuthRedirect", async () => {
  const src = await readFile(helperPath, "utf8");
  assert.match(src, /export async function resolvePostAuthRedirect/);
});

test("helper preserves the exact post-auth decision logic", async () => {
  const src = await readFile(helperPath, "utf8");
  // Invite-flow detection: exactly /invite/{64-hex}
  assert.match(src, /\/\^\\\/invite\\\/\[a-f0-9\]\{64\}\$\/i/);
  // Pending-invitation check against the public API
  assert.match(src, /\/api\/invitations\/pending\?email=/);
  // Projects lookup excludes soft-deleted rows and limits to 1
  assert.match(src, /\.is\(["']deleted_at["'],\s*null\)/);
  assert.match(src, /\.limit\(1\)/);
  // New users: signed_up + onboarding
  assert.match(src, /posthog\.capture\(["']signed_up["']\)/);
  assert.match(src, /["']\/onboarding["']/);
  // Session analytics identity
  assert.match(src, /posthog\.identify\(/);
  assert.match(src, /posthog\.capture\(["']logged_in["']\)/);
});
