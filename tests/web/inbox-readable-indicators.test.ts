import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("the detail view uses the shared localized channel chip", async () => {
  const [detail, chip] = await Promise.all([
    read("../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx"),
    read("../../apps/web/components/inbox/conversation-metadata-chip.tsx"),
  ]);

  assert.match(
    detail,
    /import\s*\{\s*ChannelChip\s*\}\s*from\s*"@\/components\/inbox\/conversation-metadata-chip"/
  );
  assert.doesNotMatch(detail, /const CHANNEL_ICONS/);
  assert.match(detail, /conversation\.source && \(\s*<ChannelChip/);
  assert.match(detail, /getChannelMeta\(conversation\.source\)\.labelKey/);
  assert.match(chip, /export function ConversationMetadataChip/);
  assert.match(chip, /export function ChannelChip/);
  assert.match(chip, /aria-hidden="true"/);
});

test("inbox rows use visible metadata labels and no status dot", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/page.tsx"
  );

  assert.match(
    page,
    /import\s*\{[\s\S]*?ChannelChip,[\s\S]*?ConversationMetadataChip[\s\S]*?\}\s*from\s*"@\/components\/inbox\/conversation-metadata-chip"/
  );
  assert.doesNotMatch(page, /const CHANNEL_ICONS/);
  assert.doesNotMatch(page, /status\.dotColor/);
  assert.match(page, /conversation\.source && \(\s*<ChannelChip/);
  assert.match(page, /getChannelMeta\(conversation\.source\)\.labelKey/);
  assert.match(page, /conversation\.hasVoiceActivity && \(/);
  assert.doesNotMatch(page, /conversation\.source !== "voice"/);
  assert.match(page, /label=\{t\("metadata\.voiceUsed"\)\}/);
  assert.match(page, /getChannelOptions\(\)\.map/);
});

test("both locales label every channel and voice activity", async () => {
  for (const locale of ["en", "ar"]) {
    const inbox = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    ).pages.inbox;

    for (const key of [
      "widget",
      "whatsapp",
      "public",
      "voice",
      "mobile",
      "playground",
      "api",
      "mcp",
      "chat",
    ]) {
      assert.equal(typeof inbox.sources[key], "string");
      assert.ok(inbox.sources[key].length > 0);
    }
    assert.equal(typeof inbox.metadata.voiceUsed, "string");
    assert.ok(inbox.metadata.voiceUsed.length > 0);
  }
});
