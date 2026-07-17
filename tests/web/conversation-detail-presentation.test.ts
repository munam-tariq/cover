import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("detail shows terminal time, complete voice totals, and CSAT", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx"
  );

  assert.match(page, /voiceCallCount:\s*number/);
  assert.match(page, /voiceTalkSeconds:\s*number/);
  assert.match(page, /satisfactionRating:\s*number \| null/);
  assert.match(page, /conversation\.resolvedAt/);
  assert.match(page, /t\("closedAt"/);
  assert.match(page, /t\("voiceCalls"/);
  assert.match(page, /t\("totalTalkTime"/);
  assert.match(page, /t\("customerSatisfaction"/);
  assert.match(page, /conversation\.satisfactionFeedback/);
});

test("handoff reasons and previous statuses use shared localized metadata", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx"
  );
  const status = await read("../../apps/web/lib/conversation-status.ts");
  const customers = await read("../../apps/api/src/routes/customers.ts");

  assert.match(status, /getHandoffReasonLabelKey/);
  assert.match(page, /getHandoffReasonLabelKey\(conversation\.handoffReason\)/);
  assert.match(page, /closeReason\?:\s*string \| null/);
  assert.match(
    page,
    /assignedAgent\?:\s*\{ id: string; name: string \} \| null/
  );
  assert.match(
    page,
    /getConversationStatusMeta\(\s*conv\.status as ConversationStatus,\s*\{/
  );
  assert.match(customers, /assigned_agent_id/);
  assert.match(customers, /closeReason:/);
  assert.match(customers, /assignedAgent:/);
});

test("both dashboard locales include the new detail labels", async () => {
  for (const locale of ["en", "ar"]) {
    const messages = JSON.parse(
      await read(`../../apps/web/messages/${locale}/dashboard.json`)
    );
    const detail = messages.pages.inbox.detail;
    for (const key of [
      "closedAt",
      "voiceCalls",
      "totalTalkTime",
      "customerSatisfaction",
      "ratingOutOfFive",
      "handoffReasons",
    ]) {
      assert.ok(detail[key], `${locale} is missing inbox.detail.${key}`);
    }
  }
});

test("live transcript updates keep both displayed message totals in sync", async () => {
  const page = await read(
    "../../apps/web/app/[locale]/(dashboard)/inbox/[id]/page.tsx"
  );

  assert.match(page, /const updateMessages = useCallback/);
  assert.match(page, /const adjustMessageCounts = useCallback/);
  assert.match(page, /totalMessageCount:\s*Math\.max\(/);
  assert.match(page, /adjustMessageCounts\(uniqueNew\.length\)/);
  assert.match(page, /adjustMessageCounts\(1\)/);
  assert.match(page, /adjustMessageCounts\(-1\)/);
});
