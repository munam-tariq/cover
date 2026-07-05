import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "apps/api/src/routes/auth-link-code.ts"
);
const indexPath = path.join(process.cwd(), "apps/api/src/index.ts");

test("route file exports authLinkCodeRouter with stash and claim endpoints", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /export const authLinkCodeRouter = Router\(\)/);
  assert.match(src, /authLinkCodeRouter\.post\(\s*["']\/["']/);
  assert.match(src, /authLinkCodeRouter\.post\(\s*["']\/claim["']/);
});

test("stash validates authCode as UUID via zod", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /authCode:\s*z\.string\(\)\.uuid\(\)/);
});

test("claim validates displayCode as exactly 6 digits", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /displayCode:\s*z\.string\(\)\.regex\(\/\^\\d\{6\}\$\/\)/);
});

test("both endpoints are rate limited with distinct counter keys", async () => {
  const src = await readFile(routePath, "utf8");
  // The generic rateLimit() factory keys on `api:<ip>` by default, so two
  // limiters with different windows would share one counter without keyFn.
  const stashBlock = src.slice(0, src.indexOf('"/claim"'));
  const claimBlock = src.slice(src.indexOf('"/claim"'));
  assert.match(stashBlock, /windowMs:\s*60 \* 60 \* 1000/);
  assert.match(stashBlock, /maxRequests:\s*10/);
  assert.match(stashBlock, /link-code-stash/);
  assert.match(claimBlock, /windowMs:\s*60 \* 1000/);
  assert.match(claimBlock, /maxRequests:\s*5/);
  assert.match(claimBlock, /link-code-claim/);
});

test("claim returns generic invalid_or_expired (no oracle)", async () => {
  const src = await readFile(routePath, "utf8");
  const claimBlock = src.slice(src.indexOf('"/claim"'));
  assert.match(claimBlock, /invalid_or_expired/);
  assert.doesNotMatch(claimBlock, /expired code|wrong code|not found/i);
});

test("router is mounted in index.ts with dashboardCors", async () => {
  const src = await readFile(indexPath, "utf8");
  assert.match(
    src,
    /import \{ authLinkCodeRouter \} from ["']\.\/routes\/auth-link-code["']/
  );
  assert.match(
    src,
    /app\.use\(["']\/api\/auth\/link-code["'],\s*dashboardCors,\s*authLinkCodeRouter\)/
  );
});
