import type { ChannelConnectionConfig } from "../../types/channels";

const WHATSAPP_DEFAULTS: ChannelConnectionConfig = {
  aiAutoReply: true,
  resolutionStrategy: "latest_open",
  humanTakeoverPolicy: "pause_ai",
  resumePolicy: "on_new_inbound",
};

export function resolveConnectionConfig(
  raw: Record<string, unknown> | undefined
): ChannelConnectionConfig {
  if (!raw) return { ...WHATSAPP_DEFAULTS };
  return {
    aiAutoReply:
      typeof raw.aiAutoReply === "boolean"
        ? raw.aiAutoReply
        : WHATSAPP_DEFAULTS.aiAutoReply,
    resolutionStrategy:
      raw.resolutionStrategy === "latest_open" ||
      raw.resolutionStrategy === "ai_active_only"
        ? raw.resolutionStrategy
        : WHATSAPP_DEFAULTS.resolutionStrategy,
    humanTakeoverPolicy:
      raw.humanTakeoverPolicy === "pause_ai" ||
      raw.humanTakeoverPolicy === "stop_ai"
        ? raw.humanTakeoverPolicy
        : WHATSAPP_DEFAULTS.humanTakeoverPolicy,
    resumePolicy:
      raw.resumePolicy === "on_new_inbound" ||
      raw.resumePolicy === "manual"
        ? raw.resumePolicy
        : WHATSAPP_DEFAULTS.resumePolicy,
  };
}
