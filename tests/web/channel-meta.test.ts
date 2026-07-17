import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getChannelMeta,
  getChannelOptions,
} from "../../apps/web/lib/channels.ts";

describe("channel metadata", () => {
  it("returns localized metadata for configured sources", () => {
    assert.deepEqual(getChannelMeta("whatsapp"), {
      labelKey: "sources.whatsapp",
      icon: "MessageCircle",
      color: "#25D366",
    });
    assert.equal(getChannelMeta("widget").labelKey, "sources.widget");
    assert.equal(getChannelMeta("public").labelKey, "sources.public");
    assert.equal(getChannelMeta("voice").labelKey, "sources.voice");
    assert.equal(getChannelMeta("mobile").labelKey, "sources.mobile");
  });

  it("exposes only selectable current channels in display order", () => {
    assert.deepEqual(
      getChannelOptions().map(({ source, labelKey }) => ({ source, labelKey })),
      [
        { source: "widget", labelKey: "sources.widget" },
        { source: "whatsapp", labelKey: "sources.whatsapp" },
        { source: "public", labelKey: "sources.public" },
        { source: "mobile", labelKey: "sources.mobile" },
        { source: "playground", labelKey: "sources.playground" },
        { source: "api", labelKey: "sources.api" },
        { source: "mcp", labelKey: "sources.mcp" },
      ]
    );
  });

  it("uses the localized Chat fallback for unknown legacy sources", () => {
    assert.deepEqual(getChannelMeta("something_new"), {
      labelKey: "sources.chat",
      icon: "MessageSquare",
      color: "currentColor",
    });
  });
});
