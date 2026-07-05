import assert from "node:assert/strict";
import { describe, it } from "node:test";

const configUrl = new URL(
  "../../apps/api/src/services/channels/config.ts",
  import.meta.url
);

describe("resolveConnectionConfig", () => {
  it("returns WhatsApp defaults when config is undefined", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig(undefined);
    assert.deepEqual(result, {
      aiAutoReply: true,
      resolutionStrategy: "latest_open",
      humanTakeoverPolicy: "pause_ai",
      resumePolicy: "on_new_inbound",
    });
  });

  it("returns WhatsApp defaults when config is empty", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig({});
    assert.deepEqual(result, {
      aiAutoReply: true,
      resolutionStrategy: "latest_open",
      humanTakeoverPolicy: "pause_ai",
      resumePolicy: "on_new_inbound",
    });
  });

  it("respects explicit overrides", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig({
      aiAutoReply: false,
      resolutionStrategy: "ai_active_only",
      humanTakeoverPolicy: "stop_ai",
      resumePolicy: "manual",
    });
    assert.deepEqual(result, {
      aiAutoReply: false,
      resolutionStrategy: "ai_active_only",
      humanTakeoverPolicy: "stop_ai",
      resumePolicy: "manual",
    });
  });

  it("ignores invalid enum values and falls back to defaults", async () => {
    const mod = await import(configUrl.href);
    const result = mod.resolveConnectionConfig({
      aiAutoReply: "yes",
      resolutionStrategy: "invalid",
      humanTakeoverPolicy: 42,
      resumePolicy: null,
    });
    assert.deepEqual(result, {
      aiAutoReply: true,
      resolutionStrategy: "latest_open",
      humanTakeoverPolicy: "pause_ai",
      resumePolicy: "on_new_inbound",
    });
  });
});
