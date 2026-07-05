export type ChannelProvider = 'whatsapp';

export type ChannelConnectionStatus = 'active' | 'disabled' | 'error';

export interface ChannelConnection {
  id: string;
  projectId: string;
  provider: ChannelProvider;
  externalId: string;
  displayName: string | null;
  status: ChannelConnectionStatus;
  lastError: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppCredentials {
  accessToken: string;
  appSecret: string;
  wabaId?: string;
}

export interface UpsertConnectionData {
  externalId: string;
  displayName?: string;
  credentials: object;
  config?: Record<string, unknown>;
}

export type ResolutionStrategy = "latest_open" | "ai_active_only";

export interface ChannelConnectionConfig {
  aiAutoReply: boolean;
  resolutionStrategy: ResolutionStrategy;
  humanTakeoverPolicy: "pause_ai" | "stop_ai";
  resumePolicy: "on_new_inbound" | "manual";
}
