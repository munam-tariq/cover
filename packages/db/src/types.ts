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
