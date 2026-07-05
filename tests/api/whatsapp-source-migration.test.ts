import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

test("conversations source CHECK constraint includes whatsapp", async () => {
  const files = await readdir(migrationsDir);
  const migration = files
    .filter((f) => f.includes("add_whatsapp_source"))
    .sort()
    .at(-1);

  assert.ok(migration, "expected a whatsapp source migration file");

  const source = await readFile(path.join(migrationsDir, migration), "utf8");

  assert.match(source, /conversations_source_check/);
  assert.match(source, /'whatsapp'/);
  assert.match(
    source,
    /'widget','playground','mcp','api','voice','public','mobile','whatsapp'/
  );
});

test("ChatSource type union includes whatsapp", async () => {
  const chatEngine = await readFile(
    path.join(process.cwd(), "apps/api/src/services/chat-engine.ts"),
    "utf8"
  );
  assert.match(chatEngine, /["']whatsapp["']/);
});

test("public widget source allowlists do not accept whatsapp", async () => {
  const conversations = await readFile(
    path.join(process.cwd(), "apps/api/src/routes/conversations.ts"),
    "utf8"
  );
  const createConversationSources = conversations.match(
    /source:\s*z\s*\.\s*enum\(\[([\s\S]*?)\]\)/
  );
  assert.ok(
    createConversationSources,
    "expected CreateConversationSchema source enum"
  );
  assert.doesNotMatch(createConversationSources[1], /["']whatsapp["']/);

  const chat = await readFile(
    path.join(process.cwd(), "apps/api/src/routes/chat.ts"),
    "utf8"
  );
  const ensureConversationStart = chat.indexOf('"/ensure-conversation"');
  assert.notEqual(ensureConversationStart, -1);
  const ensureConversationBlock = chat.slice(ensureConversationStart);
  const ensureConversationSources = ensureConversationBlock.match(
    /const validSources: ChatSource\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(
    ensureConversationSources,
    "expected ensure-conversation validSources array"
  );
  assert.doesNotMatch(ensureConversationSources[1], /["']whatsapp["']/);

  const leadCapture = await readFile(
    path.join(process.cwd(), "apps/api/src/routes/lead-capture.ts"),
    "utf8"
  );
  const leadSources = leadCapture.match(
    /const LEAD_SOURCES: ChatSource\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(leadSources, "expected lead capture source allowlist");
  assert.doesNotMatch(leadSources[1], /["']whatsapp["']/);
});

test("public chat message route rejects whatsapp before processChat", async () => {
  const chat = await readFile(
    path.join(process.cwd(), "apps/api/src/routes/chat.ts"),
    "utf8"
  );
  const routeStart = chat.indexOf('"/message"');
  const routeEnd = chat.indexOf("// Removed", routeStart);
  assert.notEqual(routeStart, -1);
  assert.notEqual(routeEnd, -1);

  const messageRoute = chat.slice(routeStart, routeEnd);
  const rejectIdx = messageRoute.indexOf('input.source === "whatsapp"');
  const processIdx = messageRoute.indexOf("processChat");
  assert.ok(rejectIdx !== -1, "expected explicit whatsapp rejection");
  assert.ok(processIdx !== -1, "expected processChat call");
  assert.ok(
    rejectIdx < processIdx,
    "whatsapp must be rejected before browser route calls processChat"
  );
});
