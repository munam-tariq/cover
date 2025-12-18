// Client exports
export {
  createClient,
  createAdminClient,
  type SupabaseClient,
  type SupabaseAdminClient,
} from "./client";

// Type exports
export type {
  Database,
  Json,
  Project,
  ProjectInsert,
  ProjectUpdate,
  KnowledgeSource,
  KnowledgeSourceInsert,
  KnowledgeSourceUpdate,
  KnowledgeChunk,
  KnowledgeChunkInsert,
  KnowledgeChunkUpdate,
  ApiEndpoint,
  ApiEndpointInsert,
  ApiEndpointUpdate,
  ChatSession,
  ChatSessionInsert,
  ChatSessionUpdate,
  ApiKey,
  ApiKeyInsert,
  ApiKeyUpdate,
  KnowledgeSourceType,
  KnowledgeSourceStatus,
  ApiEndpointMethod,
  ApiEndpointAuthType,
  MatchKnowledgeChunksResult,
} from "./types";

// Query exports
export * from "./queries/projects";
export * from "./queries/knowledge";
export * from "./queries/endpoints";
export * from "./queries/chat";
