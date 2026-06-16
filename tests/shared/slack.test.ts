import assert from "node:assert/strict";
import test from "node:test";

import {
  escapeSlackMrkdwn,
  sendSlackWebhook,
  slackFields,
  slackSection,
} from "../../packages/shared/src/slack.ts";

test("failed Slack sends do not consume the throttle window", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts += 1;
    return new Response(attempts === 1 ? "failed" : "ok", {
      status: attempts === 1 ? 500 : 200,
    });
  };

  try {
    const options = {
      dedupeKey: `failed-send-${Date.now()}`,
      throttleMs: 60_000,
    };

    assert.equal(
      await sendSlackWebhook(
        "https://hooks.slack.test/example",
        { text: "one" },
        options
      ),
      false
    );
    assert.equal(
      await sendSlackWebhook(
        "https://hooks.slack.test/example",
        { text: "two" },
        options
      ),
      true
    );
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Slack mrkdwn escaping prevents user-controlled mentions and links", () => {
  assert.equal(
    escapeSlackMrkdwn("<!channel> & <https://example.com|click>"),
    "&lt;!channel&gt; &amp; &lt;https://example.com|click&gt;"
  );

  const fields = slackFields([{ label: "User", value: "<!channel>" }]) as {
    fields: Array<{ text: string }>;
  };
  assert.match(fields.fields[0].text, /&lt;!channel&gt;/);
});

test("Slack block builders enforce Block Kit text limits", () => {
  const section = slackSection("x".repeat(3_500)) as {
    text: { text: string };
  };
  const fields = slackFields([
    { label: "Label", value: "y".repeat(2_500) },
  ]) as {
    fields: Array<{ text: string }>;
  };

  assert.equal(section.text.text.length, 3_000);
  assert.equal(fields.fields[0].text.length, 2_000);
});
