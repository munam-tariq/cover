import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "Supabase credentials not configured. Database operations will fail."
  );
}

/**
 * Supabase admin client with service role key
 * Use this for server-side operations that bypass RLS
 */
export const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Create a Supabase client for a specific user
 * This respects RLS policies
 */
export function createUserClient(accessToken: string) {
  return createClient(
    supabaseUrl || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}
