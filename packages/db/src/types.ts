/**
 * Database types - Generated from Supabase schema
 * To regenerate: pnpm --filter @chatbot/db generate-types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agent_availability: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          status: "online" | "away" | "offline";
          max_concurrent_chats: number;
          current_chat_count: number;
          last_seen_at: string;
          last_assigned_at: string | null;
          status_changed_at: string;
          auto_offline_enabled: boolean;
          auto_offline_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          status?: "online" | "away" | "offline";
          max_concurrent_chats?: number;
          current_chat_count?: number;
          last_seen_at?: string;
          last_assigned_at?: string | null;
          status_changed_at?: string;
          auto_offline_enabled?: boolean;
          auto_offline_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          status?: "online" | "away" | "offline";
          max_concurrent_chats?: number;
          current_chat_count?: number;
          last_seen_at?: string;
          last_assigned_at?: string | null;
          status_changed_at?: string;
          auto_offline_enabled?: boolean;
          auto_offline_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_availability_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_availability_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      api_endpoints: {
        Row: {
          auth_config: Json | null;
          auth_type: string;
          created_at: string | null;
          description: string;
          headers: Json | null;
          id: string;
          method: string;
          name: string;
          project_id: string;
          request_body_template: Json | null;
          updated_at: string | null;
          url: string;
        };
        Insert: {
          auth_config?: Json | null;
          auth_type?: string;
          created_at?: string | null;
          description: string;
          headers?: Json | null;
          id?: string;
          method?: string;
          name: string;
          project_id: string;
          request_body_template?: Json | null;
          updated_at?: string | null;
          url: string;
        };
        Update: {
          auth_config?: Json | null;
          auth_type?: string;
          created_at?: string | null;
          description?: string;
          headers?: Json | null;
          id?: string;
          method?: string;
          name?: string;
          project_id?: string;
          request_body_template?: Json | null;
          updated_at?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_endpoints_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      api_keys: {
        Row: {
          created_at: string | null;
          id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          created_at: string | null;
          id: string;
          message_count: number | null;
          messages: Json[] | null;
          project_id: string;
          updated_at: string | null;
          visitor_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message_count?: number | null;
          messages?: Json[] | null;
          project_id: string;
          updated_at?: string | null;
          visitor_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message_count?: number | null;
          messages?: Json[] | null;
          project_id?: string;
          updated_at?: string | null;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          project_id: string;
          customer_id: string | null;
          visitor_id: string;
          customer_email: string | null;
          customer_name: string | null;
          customer_presence: "online" | "idle" | "offline" | "typing";
          customer_last_seen_at: string | null;
          auto_close_warning_sent_at: string | null;
          status: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
          assigned_agent_id: string | null;
          handoff_reason: "low_confidence" | "keyword" | "customer_request" | "button_click" | null;
          handoff_triggered_at: string | null;
          handoff_requested_at: string | null;
          ai_confidence_at_handoff: number | null;
          trigger_keyword: string | null;
          queue_entered_at: string | null;
          queue_position: number | null;
          claimed_at: string | null;
          first_response_at: string | null;
          resolved_at: string | null;
          satisfaction_rating: number | null;
          satisfaction_feedback: string | null;
          source: "widget" | "playground" | "mcp" | "api" | "voice";
          metadata: Json;
          awaiting_email: boolean;
          pending_question: string | null;
          email_asked: boolean;
          is_voice: boolean;
          voice_duration_seconds: number;
          message_count: number;
          created_at: string;
          updated_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          customer_id?: string | null;
          visitor_id: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_presence?: "online" | "idle" | "offline" | "typing";
          customer_last_seen_at?: string | null;
          auto_close_warning_sent_at?: string | null;
          status?: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
          assigned_agent_id?: string | null;
          handoff_reason?: "low_confidence" | "keyword" | "customer_request" | "button_click" | null;
          handoff_triggered_at?: string | null;
          handoff_requested_at?: string | null;
          ai_confidence_at_handoff?: number | null;
          trigger_keyword?: string | null;
          queue_entered_at?: string | null;
          queue_position?: number | null;
          claimed_at?: string | null;
          first_response_at?: string | null;
          resolved_at?: string | null;
          satisfaction_rating?: number | null;
          satisfaction_feedback?: string | null;
          source?: "widget" | "playground" | "mcp" | "api" | "voice";
          metadata?: Json;
          awaiting_email?: boolean;
          pending_question?: string | null;
          email_asked?: boolean;
          is_voice?: boolean;
          voice_duration_seconds?: number;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          customer_id?: string | null;
          visitor_id?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_presence?: "online" | "idle" | "offline" | "typing";
          customer_last_seen_at?: string | null;
          auto_close_warning_sent_at?: string | null;
          status?: "ai_active" | "waiting" | "agent_active" | "resolved" | "closed";
          assigned_agent_id?: string | null;
          handoff_reason?: "low_confidence" | "keyword" | "customer_request" | "button_click" | null;
          handoff_triggered_at?: string | null;
          handoff_requested_at?: string | null;
          ai_confidence_at_handoff?: number | null;
          trigger_keyword?: string | null;
          queue_entered_at?: string | null;
          queue_position?: number | null;
          claimed_at?: string | null;
          first_response_at?: string | null;
          resolved_at?: string | null;
          satisfaction_rating?: number | null;
          satisfaction_feedback?: string | null;
          source?: "widget" | "playground" | "mcp" | "api" | "voice";
          metadata?: Json;
          awaiting_email?: boolean;
          pending_question?: string | null;
          email_asked?: boolean;
          is_voice?: boolean;
          voice_duration_seconds?: number;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_assigned_agent_id_fkey";
            columns: ["assigned_agent_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          id: string;
          project_id: string;
          visitor_id: string;
          email: string | null;
          name: string | null;
          merged_visitor_ids: string[];
          first_seen_at: string;
          last_seen_at: string;
          total_conversations: number;
          last_browser: string | null;
          last_device: string | null;
          last_os: string | null;
          last_page_url: string | null;
          last_location: string | null;
          is_flagged: boolean;
          flag_reason: string | null;
          flagged_at: string | null;
          flagged_by: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          visitor_id: string;
          email?: string | null;
          name?: string | null;
          merged_visitor_ids?: string[];
          first_seen_at?: string;
          last_seen_at?: string;
          total_conversations?: number;
          last_browser?: string | null;
          last_device?: string | null;
          last_os?: string | null;
          last_page_url?: string | null;
          last_location?: string | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          flagged_at?: string | null;
          flagged_by?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          visitor_id?: string;
          email?: string | null;
          name?: string | null;
          merged_visitor_ids?: string[];
          first_seen_at?: string;
          last_seen_at?: string;
          total_conversations?: number;
          last_browser?: string | null;
          last_device?: string | null;
          last_os?: string | null;
          last_page_url?: string | null;
          last_location?: string | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          flagged_at?: string | null;
          flagged_by?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_flagged_by_fkey";
            columns: ["flagged_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      handoff_settings: {
        Row: {
          id: string;
          project_id: string;
          enabled: boolean;
          trigger_mode: "auto" | "manual" | "both";
          show_human_button: boolean;
          auto_triggers: Json;
          business_hours_enabled: boolean;
          timezone: string;
          business_hours: Json;
          default_max_concurrent_chats: number;
          inactivity_timeout_minutes: number;
          auto_close_after_warning_minutes: number;
          session_keep_alive_minutes: number;
          send_inactivity_warning: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          enabled?: boolean;
          trigger_mode?: "auto" | "manual" | "both";
          show_human_button?: boolean;
          auto_triggers?: Json;
          business_hours_enabled?: boolean;
          timezone?: string;
          business_hours?: Json;
          default_max_concurrent_chats?: number;
          inactivity_timeout_minutes?: number;
          auto_close_after_warning_minutes?: number;
          session_keep_alive_minutes?: number;
          send_inactivity_warning?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          enabled?: boolean;
          trigger_mode?: "auto" | "manual" | "both";
          show_human_button?: boolean;
          auto_triggers?: Json;
          business_hours_enabled?: boolean;
          timezone?: string;
          business_hours?: Json;
          default_max_concurrent_chats?: number;
          inactivity_timeout_minutes?: number;
          auto_close_after_warning_minutes?: number;
          session_keep_alive_minutes?: number;
          send_inactivity_warning?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handoff_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      knowledge_chunks: {
        Row: {
          content: string;
          created_at: string | null;
          embedding: string;
          id: string;
          metadata: Json | null;
          source_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          embedding: string;
          id?: string;
          metadata?: Json | null;
          source_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          embedding?: string;
          id?: string;
          metadata?: Json | null;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_sources";
            referencedColumns: ["id"];
          }
        ];
      };
      knowledge_sources: {
        Row: {
          chunk_count: number | null;
          content: string | null;
          created_at: string | null;
          error: string | null;
          file_path: string | null;
          id: string;
          name: string;
          project_id: string;
          status: string;
          type: string;
        };
        Insert: {
          chunk_count?: number | null;
          content?: string | null;
          created_at?: string | null;
          error?: string | null;
          file_path?: string | null;
          id?: string;
          name: string;
          project_id: string;
          status?: string;
          type: string;
        };
        Update: {
          chunk_count?: number | null;
          content?: string | null;
          created_at?: string | null;
          error?: string | null;
          file_path?: string | null;
          id?: string;
          name?: string;
          project_id?: string;
          status?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_type: "customer" | "ai" | "agent" | "system";
          sender_id: string | null;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_type: "customer" | "ai" | "agent" | "system";
          sender_id?: string | null;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_type?: "customer" | "ai" | "agent" | "system";
          sender_id?: string | null;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string | null;
          email: string;
          name: string | null;
          role: "agent" | "admin";
          status: "pending" | "active" | "removed";
          invitation_token: string | null;
          invited_by: string;
          invited_at: string;
          expires_at: string;
          accepted_at: string | null;
          max_concurrent_chats: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id?: string | null;
          email: string;
          name?: string | null;
          role?: "agent" | "admin";
          status?: "pending" | "active" | "removed";
          invitation_token?: string | null;
          invited_by: string;
          invited_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          max_concurrent_chats?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string | null;
          email?: string;
          name?: string | null;
          role?: "agent" | "admin";
          status?: "pending" | "active" | "removed";
          invitation_token?: string | null;
          invited_by?: string;
          invited_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          max_concurrent_chats?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          settings: Json | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name?: string;
          settings?: Json | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          settings?: Json | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      pulse_campaigns: {
        Row: {
          id: string;
          project_id: string;
          type: "nps" | "poll" | "sentiment" | "feedback";
          question: string;
          config: Json;
          targeting: Json;
          styling: Json;
          status: "draft" | "active" | "paused" | "completed";
          response_count: number;
          response_goal: number | null;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: "nps" | "poll" | "sentiment" | "feedback";
          question: string;
          config?: Json;
          targeting?: Json;
          styling?: Json;
          status?: "draft" | "active" | "paused" | "completed";
          response_count?: number;
          response_goal?: number | null;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: "nps" | "poll" | "sentiment" | "feedback";
          question?: string;
          config?: Json;
          targeting?: Json;
          styling?: Json;
          status?: "draft" | "active" | "paused" | "completed";
          response_count?: number;
          response_goal?: number | null;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pulse_campaigns_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      pulse_responses: {
        Row: {
          id: string;
          campaign_id: string;
          project_id: string;
          answer: Json;
          page_url: string | null;
          visitor_id: string | null;
          session_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          project_id: string;
          answer: Json;
          page_url?: string | null;
          visitor_id?: string | null;
          session_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          project_id?: string;
          answer?: Json;
          page_url?: string | null;
          visitor_id?: string | null;
          session_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pulse_responses_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "pulse_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pulse_responses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      pulse_summaries: {
        Row: {
          id: string;
          campaign_id: string;
          summary_text: string;
          themes: Json;
          response_count: number;
          generated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          summary_text: string;
          themes?: Json;
          response_count: number;
          generated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          summary_text?: string;
          themes?: Json;
          response_count?: number;
          generated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pulse_summaries_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "pulse_campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_by_api_key: {
        Args: { p_key_hash: string };
        Returns: {
          key_id: string;
          user_id: string;
        }[];
      };
      match_knowledge_chunks: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          p_project_id?: string;
          query_embedding: string;
        };
        Returns: {
          content: string;
          id: string;
          metadata: Json;
          similarity: number;
          source_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience type aliases
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type KnowledgeSource =
  Database["public"]["Tables"]["knowledge_sources"]["Row"];
export type KnowledgeSourceInsert =
  Database["public"]["Tables"]["knowledge_sources"]["Insert"];
export type KnowledgeSourceUpdate =
  Database["public"]["Tables"]["knowledge_sources"]["Update"];

export type KnowledgeChunk =
  Database["public"]["Tables"]["knowledge_chunks"]["Row"];
export type KnowledgeChunkInsert =
  Database["public"]["Tables"]["knowledge_chunks"]["Insert"];
export type KnowledgeChunkUpdate =
  Database["public"]["Tables"]["knowledge_chunks"]["Update"];

export type ApiEndpoint = Database["public"]["Tables"]["api_endpoints"]["Row"];
export type ApiEndpointInsert =
  Database["public"]["Tables"]["api_endpoints"]["Insert"];
export type ApiEndpointUpdate =
  Database["public"]["Tables"]["api_endpoints"]["Update"];

export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];
export type ChatSessionInsert =
  Database["public"]["Tables"]["chat_sessions"]["Insert"];
export type ChatSessionUpdate =
  Database["public"]["Tables"]["chat_sessions"]["Update"];

export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];
export type ApiKeyInsert = Database["public"]["Tables"]["api_keys"]["Insert"];
export type ApiKeyUpdate = Database["public"]["Tables"]["api_keys"]["Update"];

// Human Agent Handoff types
export type HandoffSettings =
  Database["public"]["Tables"]["handoff_settings"]["Row"];
export type HandoffSettingsInsert =
  Database["public"]["Tables"]["handoff_settings"]["Insert"];
export type HandoffSettingsUpdate =
  Database["public"]["Tables"]["handoff_settings"]["Update"];

export type AgentAvailability =
  Database["public"]["Tables"]["agent_availability"]["Row"];
export type AgentAvailabilityInsert =
  Database["public"]["Tables"]["agent_availability"]["Insert"];
export type AgentAvailabilityUpdate =
  Database["public"]["Tables"]["agent_availability"]["Update"];

export type Conversation =
  Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationUpdate =
  Database["public"]["Tables"]["conversations"]["Update"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"];

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export type ProjectMember =
  Database["public"]["Tables"]["project_members"]["Row"];
export type ProjectMemberInsert =
  Database["public"]["Tables"]["project_members"]["Insert"];
export type ProjectMemberUpdate =
  Database["public"]["Tables"]["project_members"]["Update"];

// Human Agent Handoff enums
export type AgentStatus = "online" | "away" | "offline";
export type ConversationStatus =
  | "ai_active"
  | "waiting"
  | "agent_active"
  | "resolved"
  | "closed";
export type CustomerPresence = "online" | "idle" | "offline" | "typing";
export type HandoffReason =
  | "low_confidence"
  | "keyword"
  | "customer_request"
  | "button_click";
export type TriggerMode = "auto" | "manual" | "both";
export type MessageSenderType = "customer" | "ai" | "agent" | "system";
export type ProjectMemberRole = "agent" | "admin";
export type ProjectMemberStatus = "pending" | "active" | "removed";
export type ConversationSource =
  | "widget"
  | "playground"
  | "mcp"
  | "api"
  | "voice";

// Auto triggers configuration type
export interface AutoTriggersConfig {
  low_confidence_enabled: boolean;
  low_confidence_threshold: number;
  keywords_enabled: boolean;
  keywords: string[];
}

// Business hours configuration type
export interface BusinessHoursDay {
  start: string;
  end: string;
  enabled: boolean;
}

export interface BusinessHoursConfig {
  monday: BusinessHoursDay;
  tuesday: BusinessHoursDay;
  wednesday: BusinessHoursDay;
  thursday: BusinessHoursDay;
  friday: BusinessHoursDay;
  saturday: BusinessHoursDay;
  sunday: BusinessHoursDay;
}

// Knowledge source types
export type KnowledgeSourceType = "text" | "file" | "pdf" | "url";
export type KnowledgeSourceStatus = "processing" | "ready" | "failed";

// API endpoint types
export type ApiEndpointMethod = "GET" | "POST";
export type ApiEndpointAuthType =
  | "none"
  | "api_key"
  | "bearer"
  | "custom_header";

// Function return types
export type MatchKnowledgeChunksResult =
  Database["public"]["Functions"]["match_knowledge_chunks"]["Returns"][number];

// Pulse types
export type PulseCampaign =
  Database["public"]["Tables"]["pulse_campaigns"]["Row"];
export type PulseCampaignInsert =
  Database["public"]["Tables"]["pulse_campaigns"]["Insert"];
export type PulseCampaignUpdate =
  Database["public"]["Tables"]["pulse_campaigns"]["Update"];

export type PulseResponse =
  Database["public"]["Tables"]["pulse_responses"]["Row"];
export type PulseResponseInsert =
  Database["public"]["Tables"]["pulse_responses"]["Insert"];
export type PulseResponseUpdate =
  Database["public"]["Tables"]["pulse_responses"]["Update"];

export type PulseSummary =
  Database["public"]["Tables"]["pulse_summaries"]["Row"];
export type PulseSummaryInsert =
  Database["public"]["Tables"]["pulse_summaries"]["Insert"];
export type PulseSummaryUpdate =
  Database["public"]["Tables"]["pulse_summaries"]["Update"];

export type PulseCampaignType = "nps" | "poll" | "sentiment" | "feedback";
export type PulseCampaignStatus = "draft" | "active" | "paused" | "completed";

// Pulse JSONB config shapes (typed versions of the Json columns)
export interface PulseNpsConfig {
  follow_up_question?: string;
}

export interface PulsePollConfig {
  options: string[];
  allow_other?: boolean;
}

export interface PulseSentimentConfig {
  emojis?: number;
  follow_up_question?: string;
}

export interface PulseFeedbackConfig {
  placeholder?: string;
  max_length?: number;
}

export type PulseConfig =
  | PulseNpsConfig
  | PulsePollConfig
  | PulseSentimentConfig
  | PulseFeedbackConfig;

export interface PulseTargeting {
  pages?: string[];
  delay_seconds?: number;
  scroll_depth?: number;
  audience?: "all" | "new" | "returning";
}

export type PulseShape =
  | "blob"
  | "petal"
  | "diamond"
  | "cloud"
  | "squircle"
  | "leaf"
  | "random";

export type PulsePosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right"
  | "smart";

export interface PulseStyling {
  accent_color?: string;
  theme?: "light" | "dark" | "auto";
  shape?: PulseShape;
  position?: PulsePosition;
}

// Pulse answer shapes per campaign type
export interface PulseNpsAnswer {
  score: number;
  follow_up?: string;
}

export interface PulsePollAnswer {
  option: string;
  other_text?: string;
}

export interface PulseSentimentAnswer {
  emoji: string;
  follow_up?: string;
}

export interface PulseFeedbackAnswer {
  text: string;
}

export type PulseAnswer =
  | PulseNpsAnswer
  | PulsePollAnswer
  | PulseSentimentAnswer
  | PulseFeedbackAnswer;

export interface PulseResponseMetadata {
  scroll_depth?: number;
  time_on_page?: number;
  referrer?: string;
}

export interface PulseSummaryTheme {
  label: string;
  count: number;
  sentiment?: string;
}
