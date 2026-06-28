import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicApiPath = new URL(
  "../../apps/web/app/c/[handle]/lib/public-api.ts",
  import.meta.url
);
const publicStoragePath = new URL(
  "../../apps/web/app/c/[handle]/lib/public-storage.ts",
  import.meta.url
);
const publicChatPath = new URL(
  "../../apps/web/app/c/[handle]/public-chat.tsx",
  import.meta.url
);
const publicHandoffPath = new URL(
  "../../apps/web/app/c/[handle]/use-public-handoff.ts",
  import.meta.url
);

test("public lead capture response keeps the session token contract", async () => {
  const source = await readFile(publicApiPath, "utf8");
  const start = source.indexOf("export interface LeadFormSubmitResponse");
  const end = source.indexOf("// ---------------------------------------------------------------------------", start);

  assert.notEqual(start, -1, "expected LeadFormSubmitResponse");
  assert.notEqual(end, -1, "expected interface section boundary");
  assert.match(source.slice(start, end), /sessionToken\?: string/);
});

test("public page stores the lead-created session token before adopting the session", async () => {
  const source = await readFile(publicChatPath, "utf8");
  const start = source.indexOf("const submitLead = useCallback");
  const end = source.indexOf("// ---- derived UI state", start);

  assert.notEqual(start, -1, "expected submitLead callback");
  assert.notEqual(end, -1, "expected submitLead section boundary");

  const submitLeadSource = source.slice(start, end);
  assert.match(
    submitLeadSource,
    /if \(result\.sessionId && result\.sessionToken\)[\s\S]*storeSessionToken\(result\.sessionId, result\.sessionToken\)/
  );
});

test("public API recognizes widget-session denial codes as stale sessions", async () => {
  const source = await readFile(publicApiPath, "utf8");
  assert.match(source, /SESSION_DENY_CODES\s*=\s*new Set/);
  for (const code of [
    "SESSION_INVALID",
    "SESSION_PROJECT_MISMATCH",
    "SESSION_VISITOR_MISMATCH",
    "SESSION_CONVERSATION_MISMATCH",
  ]) {
    assert.match(source, new RegExp(`"${code}"`));
  }
  assert.match(source, /export function isWidgetSessionDenied/);
});

test("public storage can clear a stale conversation token and active session together", async () => {
  const source = await readFile(publicStoragePath, "utf8");
  assert.match(source, /export function clearStoredSessionToken/);
  assert.match(source, /export function clearPublicConversationState/);
  assert.match(source, /SESSION_TOKEN_KEY_PREFIX/);
  assert.match(source, /SESSION_KEY_PREFIX/);
});

test("public chat clears stale session state instead of reusing the denied conversation", async () => {
  const source = await readFile(publicChatPath, "utf8");
  assert.match(source, /handleStaleSession/);
  assert.match(source, /clearPublicConversationState/);
  assert.match(source, /fetchMessagesResult/);
});

test("public handoff polling stops and notifies the page on stale session denial", async () => {
  const source = await readFile(publicHandoffPath, "utf8");
  assert.match(source, /onStaleSession/);
  assert.match(source, /getConversationStatusResult/);
  assert.match(source, /fetchMessagesResult/);
  assert.match(source, /staleSession/);
});

test("public handoff resume skips status polling until a session token exists", async () => {
  const source = await readFile(publicHandoffPath, "utf8");
  const start = source.indexOf("// ---- mount / resume");
  const end = source.indexOf("// ---- public API", start);

  assert.notEqual(start, -1, "expected mount/resume section");
  assert.notEqual(end, -1, "expected public API section boundary");

  const resumeSource = source.slice(start, end);
  assert.match(resumeSource, /const sessionToken = getStoredSessionToken\(sessionId\)/);
  assert.match(
    resumeSource,
    /if \(sessionToken\) \{[\s\S]*getConversationStatusResult\(\s*sessionId,\s*sessionToken\s*\)/
  );
});

test("public hosted page handoff uses token-gated polling instead of browser Supabase realtime", async () => {
  const source = await readFile(publicHandoffPath, "utf8");
  assert.doesNotMatch(source, /useConversationRealtime/);
  assert.match(source, /startPolling/);
  assert.match(source, /X-FrontFace-Session|getStoredSessionToken/);
});
