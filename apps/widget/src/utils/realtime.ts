/**
 * Widget Realtime Utility
 *
 * Manages Supabase Realtime connection for the widget using private channels.
 * Widget visitors authenticate via short-lived JWTs obtained from the API's
 * /realtime-token endpoint, protected by X-FrontFace-Session.
 *
 * Handles:
 * - Token-based private channel subscriptions
 * - Token refresh before expiry
 * - Message, status, typing, queue events
 * - Reconnection logic
 * - Fallback to polling on any failure
 */

import { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import { widgetHeaders } from "./request";
import "./widget-config";

// ============================================================================
// Types
// ============================================================================

export interface RealtimeMessage {
  id: string;
  senderType: "customer" | "agent" | "ai" | "system";
  senderId?: string;
  senderName?: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface RealtimeStatusChange {
  conversationId: string;
  status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
  queuePosition?: number;
  assignedAgent?: {
    id: string;
    name: string;
  };
}

export interface RealtimeQueueUpdate {
  position: number;
}

export interface RealtimeEventHandlers {
  onMessage?: (message: RealtimeMessage) => void;
  onStatusChange?: (status: RealtimeStatusChange) => void;
  onQueueUpdate?: (update: RealtimeQueueUpdate) => void;
  onAgentJoined?: (agent: { id: string; name: string }) => void;
  onTyping?: (data: { participant: { type: string; name?: string }; isTyping: boolean }) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

interface RealtimeTokenResponse {
  token: string;
  expiresAt: number;
}

// ============================================================================
// Realtime Client Manager
// ============================================================================

export class WidgetRealtimeManager {
  private client: RealtimeClient | null = null;
  private channel: RealtimeChannel | null = null;
  private conversationId: string | null = null;
  private handlers: RealtimeEventHandlers = {};
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private tokenRefreshTimeout: number | null = null;
  private currentToken: string | null = null;
  private apiUrl: string;
  private supabaseUrl: string;
  private apiKey: string;
  private sessionToken: string | null = null;

  constructor(apiUrl: string, supabaseUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.supabaseUrl = supabaseUrl;
    this.apiKey = apiKey;
  }

  matchesConfig(apiUrl: string, supabaseUrl: string, apiKey: string): boolean {
    return (
      this.apiUrl === apiUrl &&
      this.supabaseUrl === supabaseUrl &&
      this.apiKey === apiKey
    );
  }

  setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  private async fetchRealtimeToken(
    conversationId: string
  ): Promise<RealtimeTokenResponse | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/widget/conversations/${conversationId}/realtime-token`,
        {
          method: "POST",
          headers: widgetHeaders({ sessionToken: this.sessionToken }),
        }
      );

      if (!response.ok) {
        console.warn(
          `[Widget Realtime] Token fetch failed: ${response.status}`
        );
        return null;
      }

      return (await response.json()) as RealtimeTokenResponse;
    } catch (error) {
      console.warn("[Widget Realtime] Token fetch error:", error);
      return null;
    }
  }

  private initClient(token: string): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    if (!this.supabaseUrl || !this.apiKey) {
      console.error("[Widget Realtime] Missing Supabase Realtime config");
      return;
    }

    try {
      this.client = new RealtimeClient(`${this.supabaseUrl}/realtime/v1`, {
        params: { apikey: this.apiKey },
      });

      this.client.setAuth(token);
      this.client.connect();
    } catch (error) {
      console.error("[Widget Realtime] Failed to initialize client:", error);
      this.handlers.onError?.(error as Error);
    }
  }

  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    const refreshAt = (expiresAt - 60) * 1000 - Date.now();
    if (refreshAt <= 0) return;

    this.tokenRefreshTimeout = window.setTimeout(async () => {
      if (!this.conversationId) return;

      const result = await this.fetchRealtimeToken(this.conversationId);
      if (!result) {
        console.warn("[Widget Realtime] Token refresh failed, falling back to polling");
        this.connected = false;
        this.handlers.onConnectionChange?.(false);
        return;
      }

      this.currentToken = result.token;
      this.client?.setAuth(result.token);
      this.scheduleTokenRefresh(result.expiresAt);
    }, refreshAt);
  }

  async subscribe(
    conversationId: string,
    handlers: RealtimeEventHandlers
  ): Promise<void> {
    this.handlers = handlers;
    this.conversationId = conversationId;

    const tokenResult = await this.fetchRealtimeToken(conversationId);
    if (!tokenResult) {
      console.warn("[Widget Realtime] No token, falling back to polling");
      this.handlers.onConnectionChange?.(false);
      return;
    }

    this.currentToken = tokenResult.token;
    this.initClient(tokenResult.token);

    if (!this.client) {
      this.handlers.onConnectionChange?.(false);
      return;
    }

    if (this.channel) {
      this.unsubscribe();
    }

    const channelName = `conversation:${conversationId}`;

    try {
      this.channel = this.client.channel(channelName, {
        config: {
          broadcast: { self: false },
          private: true,
        },
      });

      this.channel.on("broadcast", { event: "message:new" }, (payload) => {
        const message = payload.payload?.data?.message;
        if (message && this.handlers.onMessage) {
          this.handlers.onMessage({
            id: message.id,
            senderType: message.senderType,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
            metadata: message.metadata,
          });
        }
      });

      this.channel.on("broadcast", { event: "conversation:status_changed" }, (payload) => {
        const data = payload.payload?.data;
        if (data && this.handlers.onStatusChange) {
          this.handlers.onStatusChange({
            conversationId: data.conversationId,
            status: data.status,
            queuePosition: data.queuePosition,
          });
        }
      });

      this.channel.on("broadcast", { event: "conversation:assigned" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.agent && this.handlers.onAgentJoined) {
          this.handlers.onAgentJoined({
            id: data.agentId,
            name: data.agent.name || "Support Agent",
          });
        }
      });

      this.channel.on("broadcast", { event: "queue:position_updated" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.position !== undefined && this.handlers.onQueueUpdate) {
          this.handlers.onQueueUpdate({ position: data.position });
        }
      });

      this.channel.on("broadcast", { event: "conversation:resolved" }, (payload) => {
        const data = payload.payload?.data;
        if (data && this.handlers.onStatusChange) {
          this.handlers.onStatusChange({
            conversationId: data.conversationId,
            status: data.resolution === "ai_active" ? "ai_active" : "resolved",
          });
        }
      });

      this.channel.on("broadcast", { event: "typing:start" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.participant && this.handlers.onTyping) {
          this.handlers.onTyping({ participant: data.participant, isTyping: true });
        }
      });

      this.channel.on("broadcast", { event: "typing:stop" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.participant && this.handlers.onTyping) {
          this.handlers.onTyping({ participant: data.participant, isTyping: false });
        }
      });

      this.channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.handlers.onConnectionChange?.(true);
          this.scheduleTokenRefresh(tokenResult.expiresAt);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          this.connected = false;
          this.handlers.onConnectionChange?.(false);
          this.handleDisconnect();
        }
      });
    } catch (error) {
      console.error("[Widget Realtime] Failed to subscribe:", error);
      this.handlers.onError?.(error as Error);
    }
  }

  unsubscribe(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.client?.removeChannel(this.channel);
      this.channel = null;
    }

    this.connected = false;
    this.conversationId = null;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[Widget Realtime] Max reconnect attempts reached, falling back to polling");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = window.setTimeout(() => {
      if (this.conversationId && this.handlers) {
        this.subscribe(this.conversationId, this.handlers);
      }
    }, delay);
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.unsubscribe();

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}

// ============================================================================
// Factory function
// ============================================================================

let realtimeManager: WidgetRealtimeManager | null = null;

export function getRealtimeManager(
  apiUrl: string,
  supabaseUrl: string,
  apiKey: string
): WidgetRealtimeManager {
  if (!realtimeManager || !realtimeManager.matchesConfig(apiUrl, supabaseUrl, apiKey)) {
    realtimeManager?.disconnect();
    realtimeManager = new WidgetRealtimeManager(apiUrl, supabaseUrl, apiKey);
  }
  return realtimeManager;
}

export function cleanupRealtime(): void {
  if (realtimeManager) {
    realtimeManager.disconnect();
    realtimeManager = null;
  }
}
