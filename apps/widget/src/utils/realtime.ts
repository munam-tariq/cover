/**
 * Widget Realtime Utility
 *
 * Manages Supabase Realtime connection for the widget.
 * Handles:
 * - Channel subscriptions
 * - Message events
 * - Status change events
 * - Queue position updates
 * - Reconnection logic
 * - Fallback to polling
 */

import { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";

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

// ============================================================================
// Configuration
// ============================================================================

// Supabase project URL - extract from API URL or use environment variable
function getSupabaseUrl(apiUrl: string): string {
  // If apiUrl contains supabase, extract the project ref
  // Otherwise, use a configured Supabase URL
  // For local dev, this would be different

  // Try to detect from environment or config
  if (typeof window !== "undefined") {
    // Check for global config
    const config = (window as Record<string, unknown>).__WIDGET_CONFIG__ as Record<string, string> | undefined;
    if (config?.supabaseUrl) {
      return config.supabaseUrl;
    }
  }

  // Default to extracting from API URL pattern
  // If API is https://api.example.com, Supabase might be at a known location
  // This is a fallback - ideally the config should provide the URL
  try {
    const url = new URL(apiUrl);
    // For production, Supabase URL should be configured
    // This is a development fallback
    if (url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1")) {
      return "http://127.0.0.1:54321"; // Local Supabase
    }
  } catch {
    // Ignore URL parse errors
  }

  // Fallback - caller should provide proper config
  console.warn("[Widget Realtime] Could not determine Supabase URL, real-time will not work");
  return "";
}

// Supabase anon key for realtime access
function getSupabaseAnonKey(): string {
  if (typeof window !== "undefined") {
    const config = (window as Record<string, unknown>).__WIDGET_CONFIG__ as Record<string, string> | undefined;
    if (config?.supabaseAnonKey) {
      return config.supabaseAnonKey;
    }
  }

  // For local development
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
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
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor(apiUrl: string) {
    this.supabaseUrl = getSupabaseUrl(apiUrl);
    this.supabaseAnonKey = getSupabaseAnonKey();
  }

  /**
   * Initialize the realtime client
   */
  private initClient(): void {
    if (this.client) return;

    if (!this.supabaseUrl) {
      console.error("[Widget Realtime] No Supabase URL configured");
      return;
    }

    try {
      this.client = new RealtimeClient(`${this.supabaseUrl}/realtime/v1`, {
        params: {
          apikey: this.supabaseAnonKey,
        },
      });

      this.client.connect();

      if (process.env.NODE_ENV === "development") {
        console.log("[Widget Realtime] Client initialized");
      }
    } catch (error) {
      console.error("[Widget Realtime] Failed to initialize client:", error);
      this.handlers.onError?.(error as Error);
    }
  }

  /**
   * Subscribe to a conversation channel
   */
  subscribe(conversationId: string, handlers: RealtimeEventHandlers): void {
    this.handlers = handlers;
    this.conversationId = conversationId;

    // Initialize client if needed
    this.initClient();

    if (!this.client) {
      console.warn("[Widget Realtime] Client not initialized, falling back to polling");
      return;
    }

    // Unsubscribe from previous channel if exists
    if (this.channel) {
      this.unsubscribe();
    }

    const channelName = `conversation:${conversationId}`;

    try {
      this.channel = this.client.channel(channelName, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
        },
      });

      // Listen for new messages
      this.channel.on("broadcast", { event: "message:new" }, (payload) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget Realtime] Received message:", payload);
        }

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

      // Listen for status changes
      this.channel.on("broadcast", { event: "conversation:status_changed" }, (payload) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget Realtime] Status changed:", payload);
        }

        const data = payload.payload?.data;
        if (data && this.handlers.onStatusChange) {
          this.handlers.onStatusChange({
            conversationId: data.conversationId,
            status: data.status,
            queuePosition: data.queuePosition,
          });
        }
      });

      // Listen for agent assignment
      this.channel.on("broadcast", { event: "conversation:assigned" }, (payload) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget Realtime] Agent assigned:", payload);
        }

        const data = payload.payload?.data;
        if (data?.agent && this.handlers.onAgentJoined) {
          this.handlers.onAgentJoined({
            id: data.agentId,
            name: data.agent.name || "Support Agent",
          });
        }
      });

      // Listen for queue position updates
      this.channel.on("broadcast", { event: "queue:position_updated" }, (payload) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget Realtime] Queue position updated:", payload);
        }

        const data = payload.payload?.data;
        if (data?.position !== undefined && this.handlers.onQueueUpdate) {
          this.handlers.onQueueUpdate({ position: data.position });
        }
      });

      // Listen for conversation resolved
      this.channel.on("broadcast", { event: "conversation:resolved" }, (payload) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Widget Realtime] Conversation resolved:", payload);
        }

        const data = payload.payload?.data;
        if (data && this.handlers.onStatusChange) {
          this.handlers.onStatusChange({
            conversationId: data.conversationId,
            status: data.resolution === "ai_active" ? "ai_active" : "resolved",
          });
        }
      });

      // Listen for typing indicators
      this.channel.on("broadcast", { event: "typing:start" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.participant && this.handlers.onTyping) {
          this.handlers.onTyping({
            participant: data.participant,
            isTyping: true,
          });
        }
      });

      this.channel.on("broadcast", { event: "typing:stop" }, (payload) => {
        const data = payload.payload?.data;
        if (data?.participant && this.handlers.onTyping) {
          this.handlers.onTyping({
            participant: data.participant,
            isTyping: false,
          });
        }
      });

      // Subscribe to the channel
      this.channel
        .subscribe((status) => {
          if (process.env.NODE_ENV === "development") {
            console.log("[Widget Realtime] Subscription status:", status);
          }

          if (status === "SUBSCRIBED") {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.handlers.onConnectionChange?.(true);
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

  /**
   * Unsubscribe from current channel
   */
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
  }

  /**
   * Handle disconnection with reconnect logic
   */
  private handleDisconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[Widget Realtime] Max reconnect attempts reached, falling back to polling");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    if (process.env.NODE_ENV === "development") {
      console.log(`[Widget Realtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      if (this.conversationId && this.handlers) {
        this.subscribe(this.conversationId, this.handlers);
      }
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.unsubscribe();

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}

// ============================================================================
// Factory function for easy usage
// ============================================================================

let realtimeManager: WidgetRealtimeManager | null = null;

/**
 * Get or create the realtime manager instance
 */
export function getRealtimeManager(apiUrl: string): WidgetRealtimeManager {
  if (!realtimeManager) {
    realtimeManager = new WidgetRealtimeManager(apiUrl);
  }
  return realtimeManager;
}

/**
 * Cleanup the realtime manager
 */
export function cleanupRealtime(): void {
  if (realtimeManager) {
    realtimeManager.disconnect();
    realtimeManager = null;
  }
}
