import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storagePath = new URL("../../apps/widget/src/utils/storage.ts", import.meta.url);
const handoffPath = new URL("../../apps/widget/src/utils/handoff.ts", import.meta.url);
const widgetPath = new URL("../../apps/widget/src/widget.ts", import.meta.url);
const chatWindowPath = new URL(
  "../../apps/widget/src/components/chat-window.ts",
  import.meta.url
);

test("clearProjectData removes the widget session token for the project", async () => {
  const source = await readFile(storagePath, "utf8");
  const start = source.indexOf("export function clearProjectData");
  const end = source.indexOf("// ─── Visit Count Tracking", start);

  assert.notEqual(start, -1, "expected clearProjectData to exist");
  assert.notEqual(end, -1, "expected clearProjectData section boundary");

  const clearProjectDataSource = source.slice(start, end);
  assert.match(clearProjectDataSource, /SESSION_TOKEN_PREFIX/);
});

test("widget storage has a stale-session clear helper that preserves lead state", async () => {
  const source = await readFile(storagePath, "utf8");
  assert.match(source, /export function clearSessionToken/);
  assert.match(source, /export function clearConversationSession/);

  const start = source.indexOf("export function clearConversationSession");
  const end = source.indexOf("// ─── Visit Count Tracking", start);
  assert.notEqual(start, -1, "expected clearConversationSession");
  assert.notEqual(end, -1, "expected clearConversationSession boundary");

  const clearSource = source.slice(start, end);
  assert.match(clearSource, /SESSION_PREFIX/);
  assert.match(clearSource, /SESSION_TOKEN_PREFIX/);
  assert.match(clearSource, /MESSAGES_PREFIX/);
  assert.doesNotMatch(clearSource, /LEAD_STATE_PREFIX/);
});

test("widget handoff API exposes stale-session-aware read helpers", async () => {
  const source = await readFile(handoffPath, "utf8");
  assert.match(source, /SESSION_DENY_CODES\s*=\s*new Set/);
  assert.match(source, /export function isWidgetSessionDenied/);
  assert.match(source, /export async function getConversationStatusResult/);
  assert.match(source, /export async function fetchNewMessagesResult/);
});

test("widget config fetch sends the publishable client key", async () => {
  const source = await readFile(widgetPath, "utf8");
  const start = source.indexOf("private async fetchConfig");
  const end = source.indexOf("/** Resolve theme", start);

  assert.notEqual(start, -1, "expected fetchConfig");
  assert.notEqual(end, -1, "expected fetchConfig boundary");
  const fetchConfigSource = source.slice(start, end);
  assert.match(fetchConfigSource, /widgetHeaders\(\{\s*clientKey:\s*this\.config\.clientKey/);
});

test("chat window clears stale stored session state on denied resume or polling", async () => {
  const source = await readFile(chatWindowPath, "utf8");
  assert.match(source, /clearStaleSession/);
  assert.match(source, /clearConversationSession/);
  assert.match(source, /getConversationStatusResult/);
  assert.match(source, /fetchNewMessagesResult/);
});

test("chat window branding renders a FrontFace backlink", async () => {
  const source = await readFile(chatWindowPath, "utf8");
  const brandingStart = source.indexOf("const branding =");
  const brandingEnd = source.indexOf("if (!customFooter && !branding)", brandingStart);
  assert.notEqual(brandingStart, -1, "expected branding footer source");
  assert.notEqual(brandingEnd, -1, "expected branding footer source boundary");
  const brandingSource = source.slice(brandingStart, brandingEnd);

  assert.match(source, /FRONTFACE_BACKLINK_URL\s*=\s*"https:\/\/frontface\.app"/);
  assert.match(brandingSource, /href="\$\{FRONTFACE_BACKLINK_URL\}"/);
  assert.match(brandingSource, /target="_blank"/);
  assert.match(brandingSource, /rel="noopener"/);
  assert.doesNotMatch(brandingSource, /rel="[^"]*noreferrer[^"]*"/);
  assert.doesNotMatch(source, /Chatbase/i);
});
