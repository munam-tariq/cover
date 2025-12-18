import { createClient as createSupabaseClient, SupabaseClient as BaseSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Create a Supabase client for browser usage
 * Uses the anon key which respects RLS policies
 */
export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Create a Supabase admin client with service role key
 * Bypasses RLS - only use this on the server side!
 */
export function createAdminClient(
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Typed Supabase client with full Database schema
export type SupabaseClient = BaseSupabaseClient<Database>;
export type SupabaseAdminClient = BaseSupabaseClient<Database>;
