/**
 * Authentication for MCP server
 * TODO: Implement with Supabase in auth-system feature
 */

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

export async function authenticate(): Promise<AuthResult> {
  const apiKey = process.env.CHATBOT_API_KEY;

  if (!apiKey) {
    return {
      authenticated: false,
      error: "CHATBOT_API_KEY environment variable not set",
    };
  }

  // TODO: Validate API key against Supabase
  // For now, return a placeholder
  return {
    authenticated: true,
    userId: "placeholder-user-id",
  };
}
