export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      agent_availability: {
        Row: {
          auto_offline_enabled: boolean;
          auto_offline_minutes: number;
          created_at: string;
          current_chat_count: number;
          id: string;
          last_assigned_at: string | null;
          last_seen_at: string;
          max_concurrent_chats: number;
          project_id: string;
          status: string;
          status_changed_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_offline_enabled?: boolean;
          auto_offline_minutes?: number;
          created_at?: string;
          current_chat_count?: number;
          id?: string;
          last_assigned_at?: string | null;
          last_seen_at?: string;
          max_concurrent_chats?: number;
          project_id: string;
          status?: string;
          status_changed_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_offline_enabled?: boolean;
          auto_offline_minutes?: number;
          created_at?: string;
          current_chat_count?: number;
          id?: string;
          last_assigned_at?: string | null;
          last_seen_at?: string;
          max_concurrent_chats?: number;
          project_id?: string;
          status?: string;
          status_changed_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_availability_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
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
          },
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
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      auth_link_codes: {
        Row: {
          auth_code: string;
          created_at: string;
          display_code: string;
          expires_at: string;
        };
        Insert: {
          auth_code: string;
          created_at?: string;
          display_code: string;
          expires_at: string;
        };
        Update: {
          auth_code?: string;
          created_at?: string;
          display_code?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      channel_connections: {
        Row: {
          config: Json;
          created_at: string;
          credentials: string;
          display_name: string | null;
          external_id: string;
          id: string;
          last_error: string | null;
          project_id: string;
          provider: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          credentials: string;
          display_name?: string | null;
          external_id: string;
          id?: string;
          last_error?: string | null;
          project_id: string;
          provider: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          credentials?: string;
          display_name?: string | null;
          external_id?: string;
          id?: string;
          last_error?: string | null;
          project_id?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_connections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_inbound_events: {
        Row: {
          conversation_id: string | null;
          created_at: string;
          error: string | null;
          external_message_id: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          project_id: string | null;
          provider: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          conversation_id?: string | null;
          created_at?: string;
          error?: string | null;
          external_message_id: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          project_id?: string | null;
          provider: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string;
          error?: string | null;
          external_message_id?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          project_id?: string | null;
          provider?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_inbound_events_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_inbound_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_sessions: {
        Row: {
          awaiting_email: boolean | null;
          created_at: string | null;
          email_asked: boolean | null;
          id: string;
          is_voice: boolean | null;
          last_message_at: string | null;
          message_count: number | null;
          messages: Json[] | null;
          pending_question: string | null;
          project_id: string;
          source: string | null;
          updated_at: string | null;
          visitor_id: string;
          voice_duration_seconds: number | null;
        };
        Insert: {
          awaiting_email?: boolean | null;
          created_at?: string | null;
          email_asked?: boolean | null;
          id?: string;
          is_voice?: boolean | null;
          last_message_at?: string | null;
          message_count?: number | null;
          messages?: Json[] | null;
          pending_question?: string | null;
          project_id: string;
          source?: string | null;
          updated_at?: string | null;
          visitor_id: string;
          voice_duration_seconds?: number | null;
        };
        Update: {
          awaiting_email?: boolean | null;
          created_at?: string | null;
          email_asked?: boolean | null;
          id?: string;
          is_voice?: boolean | null;
          last_message_at?: string | null;
          message_count?: number | null;
          messages?: Json[] | null;
          pending_question?: string | null;
          project_id?: string;
          source?: string | null;
          updated_at?: string | null;
          visitor_id?: string;
          voice_duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      consumed_identity_jti: {
        Row: {
          created_at: string;
          customer_id: string | null;
          expires_at: string;
          jti: string;
          project_id: string;
          visitor_id: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          expires_at: string;
          jti: string;
          project_id: string;
          visitor_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          expires_at?: string;
          jti?: string;
          project_id?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consumed_identity_jti_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_insights: {
        Row: {
          answer_gap_question: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          project_id: string;
          resolved: boolean | null;
          sentiment: string | null;
          topic: string | null;
        };
        Insert: {
          answer_gap_question?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          project_id: string;
          resolved?: boolean | null;
          sentiment?: string | null;
          topic?: string | null;
        };
        Update: {
          answer_gap_question?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          resolved?: boolean | null;
          sentiment?: string | null;
          topic?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_insights_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_insights_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          ai_confidence_at_handoff: number | null;
          assigned_agent_id: string | null;
          auto_close_warning_sent_at: string | null;
          awaiting_email: boolean | null;
          claimed_at: string | null;
          created_at: string;
          customer_email: string | null;
          customer_id: string | null;
          customer_last_seen_at: string | null;
          customer_name: string | null;
          customer_presence: string | null;
          customer_replied_since_warning: boolean;
          email_asked: boolean | null;
          first_response_at: string | null;
          handoff_reason: string | null;
          handoff_requested_at: string | null;
          handoff_triggered_at: string | null;
          id: string;
          is_voice: boolean | null;
          is_voice_call: boolean | null;
          last_conversation_message_at: string | null;
          last_conversation_preview: string | null;
          last_conversation_sender_type: string | null;
          last_customer_message_at: string | null;
          last_message_at: string;
          last_message_preview: string | null;
          last_message_sender_type: string | null;
          last_voice_activity_at: string | null;
          meaningful_activity_at: string;
          message_count: number;
          metadata: Json;
          needs_reply: boolean;
          pending_question: string | null;
          project_id: string;
          queue_entered_at: string | null;
          queue_position: number | null;
          resolved_at: string | null;
          satisfaction_feedback: string | null;
          satisfaction_rating: number | null;
          source: string;
          status: string;
          trigger_keyword: string | null;
          updated_at: string;
          visitor_id: string;
          voice_call_id: string | null;
          voice_cost: number | null;
          voice_duration_seconds: number | null;
          voice_ended_reason: string | null;
          voice_provider: string | null;
          voice_recording_url: string | null;
          voice_transcript: Json | null;
        };
        Insert: {
          ai_confidence_at_handoff?: number | null;
          assigned_agent_id?: string | null;
          auto_close_warning_sent_at?: string | null;
          awaiting_email?: boolean | null;
          claimed_at?: string | null;
          created_at?: string;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_last_seen_at?: string | null;
          customer_name?: string | null;
          customer_presence?: string | null;
          customer_replied_since_warning?: boolean;
          email_asked?: boolean | null;
          first_response_at?: string | null;
          handoff_reason?: string | null;
          handoff_requested_at?: string | null;
          handoff_triggered_at?: string | null;
          id?: string;
          is_voice?: boolean | null;
          is_voice_call?: boolean | null;
          last_conversation_message_at?: string | null;
          last_conversation_preview?: string | null;
          last_conversation_sender_type?: string | null;
          last_customer_message_at?: string | null;
          last_message_at?: string;
          last_message_preview?: string | null;
          last_message_sender_type?: string | null;
          last_voice_activity_at?: string | null;
          meaningful_activity_at?: string;
          message_count?: number;
          metadata?: Json;
          needs_reply?: boolean;
          pending_question?: string | null;
          project_id: string;
          queue_entered_at?: string | null;
          queue_position?: number | null;
          resolved_at?: string | null;
          satisfaction_feedback?: string | null;
          satisfaction_rating?: number | null;
          source?: string;
          status?: string;
          trigger_keyword?: string | null;
          updated_at?: string;
          visitor_id: string;
          voice_call_id?: string | null;
          voice_cost?: number | null;
          voice_duration_seconds?: number | null;
          voice_ended_reason?: string | null;
          voice_provider?: string | null;
          voice_recording_url?: string | null;
          voice_transcript?: Json | null;
        };
        Update: {
          ai_confidence_at_handoff?: number | null;
          assigned_agent_id?: string | null;
          auto_close_warning_sent_at?: string | null;
          awaiting_email?: boolean | null;
          claimed_at?: string | null;
          created_at?: string;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_last_seen_at?: string | null;
          customer_name?: string | null;
          customer_presence?: string | null;
          customer_replied_since_warning?: boolean;
          email_asked?: boolean | null;
          first_response_at?: string | null;
          handoff_reason?: string | null;
          handoff_requested_at?: string | null;
          handoff_triggered_at?: string | null;
          id?: string;
          is_voice?: boolean | null;
          is_voice_call?: boolean | null;
          last_conversation_message_at?: string | null;
          last_conversation_preview?: string | null;
          last_conversation_sender_type?: string | null;
          last_customer_message_at?: string | null;
          last_message_at?: string;
          last_message_preview?: string | null;
          last_message_sender_type?: string | null;
          last_voice_activity_at?: string | null;
          meaningful_activity_at?: string;
          message_count?: number;
          metadata?: Json;
          needs_reply?: boolean;
          pending_question?: string | null;
          project_id?: string;
          queue_entered_at?: string | null;
          queue_position?: number | null;
          resolved_at?: string | null;
          satisfaction_feedback?: string | null;
          satisfaction_rating?: number | null;
          source?: string;
          status?: string;
          trigger_keyword?: string | null;
          updated_at?: string;
          visitor_id?: string;
          voice_call_id?: string | null;
          voice_cost?: number | null;
          voice_duration_seconds?: number | null;
          voice_ended_reason?: string | null;
          voice_provider?: string | null;
          voice_recording_url?: string | null;
          voice_transcript?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_customer_project_fk";
            columns: ["customer_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "conversations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      crawl_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          domain: string;
          error: string | null;
          id: string;
          pages_failed: number | null;
          pages_found: number | null;
          pages_imported: number | null;
          pages_processed: number | null;
          project_id: string;
          self_test: Json | null;
          started_at: string | null;
          status: string;
          total_chunks: number | null;
          total_words: number | null;
          url: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          domain: string;
          error?: string | null;
          id?: string;
          pages_failed?: number | null;
          pages_found?: number | null;
          pages_imported?: number | null;
          pages_processed?: number | null;
          project_id: string;
          self_test?: Json | null;
          started_at?: string | null;
          status?: string;
          total_chunks?: number | null;
          total_words?: number | null;
          url: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          domain?: string;
          error?: string | null;
          id?: string;
          pages_failed?: number | null;
          pages_found?: number | null;
          pages_imported?: number | null;
          pages_processed?: number | null;
          project_id?: string;
          self_test?: Json | null;
          started_at?: string | null;
          status?: string;
          total_chunks?: number | null;
          total_words?: number | null;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_identities: {
        Row: {
          created_at: string;
          custom_attributes: Json | null;
          customer_id: string;
          external_id: string;
          project_id: string;
          updated_at: string;
          verified_at: string;
          verified_email: string | null;
          verified_name: string | null;
          verified_phone: string | null;
        };
        Insert: {
          created_at?: string;
          custom_attributes?: Json | null;
          customer_id: string;
          external_id: string;
          project_id: string;
          updated_at?: string;
          verified_at: string;
          verified_email?: string | null;
          verified_name?: string | null;
          verified_phone?: string | null;
        };
        Update: {
          created_at?: string;
          custom_attributes?: Json | null;
          customer_id?: string;
          external_id?: string;
          project_id?: string;
          updated_at?: string;
          verified_at?: string;
          verified_email?: string | null;
          verified_name?: string | null;
          verified_phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_identities_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: true;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_identities_customer_id_project_id_fkey";
            columns: ["customer_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "customer_identities_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          email_normalized: string | null;
          first_seen_at: string;
          flag_reason: string | null;
          flagged_at: string | null;
          flagged_by: string | null;
          id: string;
          internal_notes: string | null;
          is_flagged: boolean;
          last_browser: string | null;
          last_device: string | null;
          last_location: string | null;
          last_os: string | null;
          last_page_url: string | null;
          last_seen_at: string;
          lead_capture_state: Json | null;
          merged_into_customer_id: string | null;
          merged_visitor_ids: string[];
          name: string | null;
          phone: string | null;
          project_id: string;
          total_conversations: number;
          updated_at: string;
          visitor_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          email_normalized?: string | null;
          first_seen_at?: string;
          flag_reason?: string | null;
          flagged_at?: string | null;
          flagged_by?: string | null;
          id?: string;
          internal_notes?: string | null;
          is_flagged?: boolean;
          last_browser?: string | null;
          last_device?: string | null;
          last_location?: string | null;
          last_os?: string | null;
          last_page_url?: string | null;
          last_seen_at?: string;
          lead_capture_state?: Json | null;
          merged_into_customer_id?: string | null;
          merged_visitor_ids?: string[];
          name?: string | null;
          phone?: string | null;
          project_id: string;
          total_conversations?: number;
          updated_at?: string;
          visitor_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          email_normalized?: string | null;
          first_seen_at?: string;
          flag_reason?: string | null;
          flagged_at?: string | null;
          flagged_by?: string | null;
          id?: string;
          internal_notes?: string | null;
          is_flagged?: boolean;
          last_browser?: string | null;
          last_device?: string | null;
          last_location?: string | null;
          last_os?: string | null;
          last_page_url?: string | null;
          last_seen_at?: string;
          lead_capture_state?: Json | null;
          merged_into_customer_id?: string | null;
          merged_visitor_ids?: string[];
          name?: string | null;
          phone?: string | null;
          project_id?: string;
          total_conversations?: number;
          updated_at?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_merged_into_customer_id_fkey";
            columns: ["merged_into_customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      handoff_settings: {
        Row: {
          agent_joined_message: string | null;
          assignment_mode: string | null;
          auto_close_after_warning_minutes: number;
          auto_triggers: Json;
          business_hours: Json;
          business_hours_enabled: boolean;
          button_text: string;
          created_at: string;
          default_max_concurrent_chats: number;
          enabled: boolean;
          id: string;
          inactivity_timeout_minutes: number;
          max_queue_size: number | null;
          project_id: string;
          queue_message: string | null;
          send_inactivity_warning: boolean;
          session_keep_alive_minutes: number;
          show_human_button: boolean;
          timezone: string;
          trigger_mode: string;
          updated_at: string;
        };
        Insert: {
          agent_joined_message?: string | null;
          assignment_mode?: string | null;
          auto_close_after_warning_minutes?: number;
          auto_triggers?: Json;
          business_hours?: Json;
          business_hours_enabled?: boolean;
          button_text?: string;
          created_at?: string;
          default_max_concurrent_chats?: number;
          enabled?: boolean;
          id?: string;
          inactivity_timeout_minutes?: number;
          max_queue_size?: number | null;
          project_id: string;
          queue_message?: string | null;
          send_inactivity_warning?: boolean;
          session_keep_alive_minutes?: number;
          show_human_button?: boolean;
          timezone?: string;
          trigger_mode?: string;
          updated_at?: string;
        };
        Update: {
          agent_joined_message?: string | null;
          assignment_mode?: string | null;
          auto_close_after_warning_minutes?: number;
          auto_triggers?: Json;
          business_hours?: Json;
          business_hours_enabled?: boolean;
          button_text?: string;
          created_at?: string;
          default_max_concurrent_chats?: number;
          enabled?: boolean;
          id?: string;
          inactivity_timeout_minutes?: number;
          max_queue_size?: number | null;
          project_id?: string;
          queue_message?: string | null;
          send_inactivity_warning?: boolean;
          session_keep_alive_minutes?: number;
          show_human_button?: boolean;
          timezone?: string;
          trigger_mode?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handoff_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_chunks: {
        Row: {
          content: string;
          context: string | null;
          created_at: string | null;
          embedding: string;
          fts: unknown;
          id: string;
          metadata: Json | null;
          source_id: string;
        };
        Insert: {
          content: string;
          context?: string | null;
          created_at?: string | null;
          embedding: string;
          fts?: unknown;
          id?: string;
          metadata?: Json | null;
          source_id: string;
        };
        Update: {
          content?: string;
          context?: string | null;
          created_at?: string | null;
          embedding?: string;
          fts?: unknown;
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
          },
        ];
      };
      knowledge_sources: {
        Row: {
          chunk_count: number | null;
          content: string | null;
          crawl_job_id: string | null;
          created_at: string | null;
          error: string | null;
          file_path: string | null;
          id: string;
          name: string;
          project_id: string;
          scraped_at: string | null;
          source_url: string | null;
          status: string;
          type: string;
        };
        Insert: {
          chunk_count?: number | null;
          content?: string | null;
          crawl_job_id?: string | null;
          created_at?: string | null;
          error?: string | null;
          file_path?: string | null;
          id?: string;
          name: string;
          project_id: string;
          scraped_at?: string | null;
          source_url?: string | null;
          status?: string;
          type: string;
        };
        Update: {
          chunk_count?: number | null;
          content?: string | null;
          crawl_job_id?: string | null;
          created_at?: string | null;
          error?: string | null;
          file_path?: string | null;
          id?: string;
          name?: string;
          project_id?: string;
          scraped_at?: string | null;
          source_url?: string | null;
          status?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_crawl_job_id_fkey";
            columns: ["crawl_job_id"];
            isOneToOne: false;
            referencedRelation: "crawl_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_sources_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_captures: {
        Row: {
          created_at: string | null;
          id: string;
          notified_at: string | null;
          project_id: string;
          question: string;
          session_id: string | null;
          user_email: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notified_at?: string | null;
          project_id: string;
          question: string;
          session_id?: string | null;
          user_email?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notified_at?: string | null;
          project_id?: string;
          question?: string;
          session_id?: string | null;
          user_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_captures_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_captures_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      message_feedback: {
        Row: {
          answer_text: string | null;
          conversation_id: string;
          created_at: string;
          feedback_category: string | null;
          feedback_text: string | null;
          id: string;
          message_id: string | null;
          project_id: string;
          question_text: string | null;
          rating: string;
          visitor_id: string;
        };
        Insert: {
          answer_text?: string | null;
          conversation_id: string;
          created_at?: string;
          feedback_category?: string | null;
          feedback_text?: string | null;
          id?: string;
          message_id?: string | null;
          project_id: string;
          question_text?: string | null;
          rating: string;
          visitor_id: string;
        };
        Update: {
          answer_text?: string | null;
          conversation_id?: string;
          created_at?: string;
          feedback_category?: string | null;
          feedback_text?: string | null;
          id?: string;
          message_id?: string | null;
          project_id?: string;
          question_text?: string | null;
          rating?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_message_feedback_message";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_feedback_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_feedback_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          sender_id: string | null;
          sender_type: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          sender_id?: string | null;
          sender_type: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          sender_id?: string | null;
          sender_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      project_client_keys: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          key: string;
          last_used_at: string | null;
          name: string | null;
          platform: string;
          project_id: string;
          revoked_at: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          key: string;
          last_used_at?: string | null;
          name?: string | null;
          platform?: string;
          project_id: string;
          revoked_at?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          key?: string;
          last_used_at?: string | null;
          name?: string | null;
          platform?: string;
          project_id?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_client_keys_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_identity_secrets: {
        Row: {
          created_at: string;
          id: string;
          project_id: string;
          rotated_at: string | null;
          secret_encrypted: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          project_id: string;
          rotated_at?: string | null;
          secret_encrypted: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          project_id?: string;
          rotated_at?: string | null;
          secret_encrypted?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_identity_secrets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invitation_token: string | null;
          invited_at: string;
          invited_by: string;
          max_concurrent_chats: number;
          name: string | null;
          project_id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invitation_token?: string | null;
          invited_at?: string;
          invited_by: string;
          max_concurrent_chats?: number;
          name?: string | null;
          project_id: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invitation_token?: string | null;
          invited_at?: string;
          invited_by?: string;
          max_concurrent_chats?: number;
          name?: string | null;
          project_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          allowed_domains: string[] | null;
          company_name: string | null;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          name: string;
          plan: string;
          public_slug: string | null;
          settings: Json | null;
          updated_at: string | null;
          use_new_conversations: boolean | null;
          user_id: string;
          voice_enabled: boolean | null;
          voice_greeting: string | null;
          voice_id: string | null;
        };
        Insert: {
          allowed_domains?: string[] | null;
          company_name?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          plan?: string;
          public_slug?: string | null;
          settings?: Json | null;
          updated_at?: string | null;
          use_new_conversations?: boolean | null;
          user_id: string;
          voice_enabled?: boolean | null;
          voice_greeting?: string | null;
          voice_id?: string | null;
        };
        Update: {
          allowed_domains?: string[] | null;
          company_name?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          plan?: string;
          public_slug?: string | null;
          settings?: Json | null;
          updated_at?: string | null;
          use_new_conversations?: boolean | null;
          user_id?: string;
          voice_enabled?: boolean | null;
          voice_greeting?: string | null;
          voice_id?: string | null;
        };
        Relationships: [];
      };
      pulse_campaigns: {
        Row: {
          config: Json;
          created_at: string;
          ends_at: string | null;
          id: string;
          project_id: string;
          question: string;
          response_count: number;
          response_goal: number | null;
          starts_at: string | null;
          status: string;
          styling: Json;
          targeting: Json;
          type: string;
          updated_at: string;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          project_id: string;
          question: string;
          response_count?: number;
          response_goal?: number | null;
          starts_at?: string | null;
          status?: string;
          styling?: Json;
          targeting?: Json;
          type: string;
          updated_at?: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          project_id?: string;
          question?: string;
          response_count?: number;
          response_goal?: number | null;
          starts_at?: string | null;
          status?: string;
          styling?: Json;
          targeting?: Json;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pulse_campaigns_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      pulse_responses: {
        Row: {
          answer: Json;
          campaign_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          page_url: string | null;
          project_id: string;
          session_id: string | null;
          visitor_id: string | null;
        };
        Insert: {
          answer: Json;
          campaign_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          page_url?: string | null;
          project_id: string;
          session_id?: string | null;
          visitor_id?: string | null;
        };
        Update: {
          answer?: Json;
          campaign_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          page_url?: string | null;
          project_id?: string;
          session_id?: string | null;
          visitor_id?: string | null;
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
          },
        ];
      };
      pulse_summaries: {
        Row: {
          campaign_id: string;
          generated_at: string;
          id: string;
          response_count: number;
          summary_text: string;
          themes: Json;
        };
        Insert: {
          campaign_id: string;
          generated_at?: string;
          id?: string;
          response_count: number;
          summary_text: string;
          themes?: Json;
        };
        Update: {
          campaign_id?: string;
          generated_at?: string;
          id?: string;
          response_count?: number;
          summary_text?: string;
          themes?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "pulse_summaries_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "pulse_campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      qualified_leads: {
        Row: {
          conversation_id: string | null;
          created_at: string;
          customer_id: string | null;
          email: string;
          first_message: string | null;
          form_data: Json;
          form_submitted_at: string;
          id: string;
          late_qualifying_answers: Json | null;
          project_id: string;
          qualification_completed_at: string | null;
          qualification_reasoning: string | null;
          qualification_status: string;
          qualifying_answers: Json;
          updated_at: string;
          visitor_id: string;
        };
        Insert: {
          conversation_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          email: string;
          first_message?: string | null;
          form_data?: Json;
          form_submitted_at?: string;
          id?: string;
          late_qualifying_answers?: Json | null;
          project_id: string;
          qualification_completed_at?: string | null;
          qualification_reasoning?: string | null;
          qualification_status?: string;
          qualifying_answers?: Json;
          updated_at?: string;
          visitor_id: string;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          email?: string;
          first_message?: string | null;
          form_data?: Json;
          form_submitted_at?: string;
          id?: string;
          late_qualifying_answers?: Json | null;
          project_id?: string;
          qualification_completed_at?: string | null;
          qualification_reasoning?: string | null;
          qualification_status?: string;
          qualifying_answers?: Json;
          updated_at?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qualified_leads_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qualified_leads_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qualified_leads_customer_project_fk";
            columns: ["customer_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "qualified_leads_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      append_customer_message: {
        Args: {
          p_content: string;
          p_conversation_id: string;
          p_metadata?: Json;
          p_sender_id?: string;
        };
        Returns: {
          message_created_at: string;
          message_id: string;
          reopened: boolean;
        }[];
      };
      append_late_answer: {
        Args: { late_answer: Json; lead_id: string };
        Returns: undefined;
      };
      check_domain_allowed: {
        Args: { project_allowed_domains: string[]; request_domain: string };
        Returns: boolean;
      };
      claim_and_warn_inactive: {
        Args: { p_limit?: number; p_texts?: Json };
        Returns: {
          conversation_id: string;
          message_id: string;
          project_id: string;
          source: string;
          warning_text: string;
        }[];
      };
      claim_conversation: {
        Args: {
          p_ai_confidence?: number;
          p_conversation_id: string;
          p_customer_email?: string;
          p_customer_name?: string;
          p_handoff_reason?: string;
          p_project_id: string;
          p_trigger_keyword?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      close_inactive_conversations: {
        Args: { p_limit?: number; p_texts?: Json };
        Returns: {
          close_text: string;
          conversation_id: string;
          message_id: string;
          project_id: string;
          source: string;
        }[];
      };
      decrement_chat_count: {
        Args: { p_project_id: string; p_user_id: string };
        Returns: number;
      };
      extract_topic_uuid: {
        Args: { prefix: string; topic: string };
        Returns: string;
      };
      fts_search_chunks: {
        Args: {
          match_count?: number;
          p_project_id?: string;
          query_text: string;
        };
        Returns: {
          content: string;
          context: string;
          fts_score: number;
          id: string;
          metadata: Json;
          source_id: string;
          source_name: string;
        }[];
      };
      get_available_agents: {
        Args: { p_project_id: string };
        Returns: {
          current_chat_count: number;
          last_assigned_at: string;
          max_concurrent_chats: number;
          user_id: string;
        }[];
      };
      get_inbox_conversation_page: {
        Args: {
          p_activity_period?: string;
          p_assigned_agent?: string;
          p_flagged_only?: boolean;
          p_handoff_reason?: string;
          p_limit?: number;
          p_needs_reply?: boolean;
          p_page?: number;
          p_project_id: string;
          p_scope?: string;
          p_sort?: string;
          p_source?: string;
          p_status?: string;
          p_viewer_id: string;
          p_voice_used?: boolean;
        };
        Returns: Json;
      };
      get_insight_classification_batch: {
        Args: {
          p_cutoff: string;
          p_limit: number;
          p_message_limit: number;
          p_project_ids: string[];
        };
        Returns: {
          conversation_id: string;
          messages: Json;
          project_id: string;
          resolved_at: string;
        }[];
      };
      get_project_role: {
        Args: { p_project_id: string; p_user_id: string };
        Returns: string;
      };
      get_queue_position: {
        Args: { p_conversation_id: string };
        Returns: number;
      };
      get_recent_insight_topics: {
        Args: { p_limit?: number; p_project_ids: string[] };
        Returns: {
          project_id: string;
          topic: string;
        }[];
      };
      get_user_by_api_key: {
        Args: { p_key_hash: string };
        Returns: {
          key_id: string;
          user_id: string;
        }[];
      };
      get_voice_metrics: {
        Args: {
          p_conversation_id?: string;
          p_end?: string;
          p_project_id: string;
          p_source?: string;
          p_start?: string;
        };
        Returns: {
          voice_call_count: number;
          voice_talk_seconds: number;
        }[];
      };
      has_project_access: {
        Args: { p_project_id: string; p_user_id: string };
        Returns: boolean;
      };
      hybrid_search_chunks: {
        Args: {
          match_count?: number;
          p_project_id?: string;
          query_embedding: string;
          query_text: string;
          vector_weight?: number;
        };
        Returns: {
          combined_score: number;
          content: string;
          context: string;
          fts_score: number;
          id: string;
          metadata: Json;
          source_id: string;
          source_name: string;
          vector_score: number;
        }[];
      };
      increment_chat_count: {
        Args: { p_project_id: string; p_user_id: string };
        Returns: number;
      };
      insert_conversation_insights: { Args: { p_rows: Json }; Returns: number };
      is_project_agent: {
        Args: { p_project_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_project_owner: {
        Args: { p_project_id: string; p_user_id: string };
        Returns: boolean;
      };
      mark_late_answer_promoted: {
        Args: { answer_index: number; lead_id: string };
        Returns: undefined;
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
      merge_customer_identity: {
        Args: {
          p_custom_attributes: Json;
          p_custom_attributes_set: boolean;
          p_email: string;
          p_email_set: boolean;
          p_external_id: string;
          p_name: string;
          p_name_set: boolean;
          p_phone: string;
          p_phone_set: boolean;
          p_project_id: string;
          p_visitor_id: string;
        };
        Returns: Json;
      };
      pick_localized_text: {
        Args: { p_fallback: string; p_language: string; p_texts: Json };
        Returns: string;
      };
      recrawl_replace_chunks: {
        Args: {
          p_chunk_count: number;
          p_chunks: Json;
          p_content: string;
          p_source_id: string;
          p_source_url: string;
        };
        Returns: undefined;
      };
      reopen_conversation: {
        Args: { p_conversation_id: string };
        Returns: boolean;
      };
      touch_voice_activity: {
        Args: { p_conversation_id: string };
        Returns: undefined;
      };
      transition_agent_conversation: {
        Args: {
          p_conversation_id: string;
          p_next_status: string;
          p_project_id: string;
        };
        Returns: string;
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

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

export type ProjectClientKey =
  Database["public"]["Tables"]["project_client_keys"]["Row"];
export type ProjectClientKeyInsert =
  Database["public"]["Tables"]["project_client_keys"]["Insert"];
export type ProjectClientKeyUpdate =
  Database["public"]["Tables"]["project_client_keys"]["Update"];

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

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationUpdate =
  Database["public"]["Tables"]["conversations"]["Update"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"];

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert =
  Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerUpdate =
  Database["public"]["Tables"]["customers"]["Update"];

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
export type HandoffReason = "low_confidence" | "keyword" | "button_click";
export type TriggerMode = "auto" | "manual" | "both";
export type MessageSenderType = "customer" | "ai" | "agent" | "system";
export type ProjectMemberRole = "agent" | "admin";
export type ProjectMemberStatus = "pending" | "active" | "removed";
export type ConversationSource =
  | "widget"
  | "playground"
  | "mcp"
  | "api"
  | "voice"
  | "public"
  | "mobile"
  | "whatsapp";

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
