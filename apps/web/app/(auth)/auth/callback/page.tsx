"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth callback content - handles PKCE code exchange client-side
 *
 * The magic link flow:
 * 1. User requests magic link (signInWithOtp) - browser stores PKCE code verifier
 * 2. User clicks email link -> Supabase verifies -> redirects here with ?code=...
 * 3. This page exchanges the code for a session using the stored code verifier
 * 4. On success, creates default project for new users and redirects to home
 *
 * Note: createBrowserClient has detectSessionInUrl: true by default, which means
 * it may automatically exchange the code. We handle both cases gracefully.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/dashboard";

      // Check if user is coming from invitation flow - don't create default project for invited users
      // More precise detection - must be exactly /invite/{64-char-hex-token}
      const isInvitationFlow = /^\/invite\/[a-f0-9]{64}$/i.test(next);

      // Helper function to check if user has pending invitations via API
      const checkPendingInvitations = async (email: string): Promise<boolean> => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const response = await fetch(
            `${apiUrl}/api/invitations/pending?email=${encodeURIComponent(email)}`
          );

          if (!response.ok) {
            console.warn("Failed to check pending invitations:", response.status);
            return false;
          }

          const data = await response.json();
          return data.hasPendingInvitations === true;
        } catch (err) {
          console.warn("Error checking pending invitations:", err);
          return false;
        }
      };

      // Helper function to set up new user - creates default project if none exists
      // Skip for invited users since they're joining someone else's project
      const setupNewUser = async (userId: string, userEmail?: string) => {
        // Method 1: URL-based detection (existing, more precise now)
        if (isInvitationFlow) {
          console.log("Invitation flow detected via URL, skipping default project creation");
          return;
        }

        // Method 2: Check database for pending invitations
        // This catches the case where returnUrl was lost but user has a pending invite
        if (userEmail) {
          const hasPendingInvites = await checkPendingInvitations(userEmail);
          if (hasPendingInvites) {
            console.log("User has pending invitations, skipping default project creation");
            return;
          }
        }

        // Use .limit(1) instead of .single() to avoid errors when multiple projects exist
        const { data: existingProjects, error: fetchError } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        if (fetchError) {
          console.error("Failed to check for existing projects:", fetchError);
          return;
        }

        // Only create a project if the user has none
        if (!existingProjects || existingProjects.length === 0) {
          const { error: createError } = await supabase.from("projects").insert({
            user_id: userId,
            name: "My Chatbot",
            settings: {},
          });

          if (createError) {
            // Ignore duplicate key errors (race condition where project was just created)
            if (!createError.message?.includes("duplicate")) {
              console.error("Failed to create project for new user:", createError);
            }
          }
        }
      };

      // First, check if we already have a session
      // (createBrowserClient with detectSessionInUrl: true may have already handled the code)
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession?.user) {
        console.log("Session already exists, skipping code exchange");
        await setupNewUser(existingSession.user.id, existingSession.user.email);
        router.push(next);
        return;
      }

      // No existing session, try to exchange the code
      const code = searchParams.get("code");

      if (!code) {
        setError("No authorization code found. Please request a new magic link.");
        setIsProcessing(false);
        return;
      }

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);

          // Even if exchange fails, check if session was established through another mechanism
          const { data: { session: retrySession } } = await supabase.auth.getSession();

          if (retrySession?.user) {
            console.log("Session found after exchange error, proceeding...");
            await setupNewUser(retrySession.user.id, retrySession.user.email);
            router.push(next);
            return;
          }

          // No session at all - show error
          setError(exchangeError.message || "Failed to sign in. Please try again.");
          setIsProcessing(false);
          return;
        }

        if (data.user) {
          await setupNewUser(data.user.id, data.user.email);
        }

        router.push(next);
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);

        // Last resort: check for session one more time
        const { data: { session: lastCheckSession } } = await supabase.auth.getSession();

        if (lastCheckSession?.user) {
          console.log("Session found in catch block, proceeding...");
          await setupNewUser(lastCheckSession.user.id, lastCheckSession.user.email);
          router.push(next);
          return;
        }

        setError("An unexpected error occurred. Please try again.");
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm p-8 space-y-6 text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Sign In Failed</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-medium transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-primary-foreground animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Signing you in...</h1>
        <p className="text-muted-foreground text-sm">Please wait while we complete your sign in.</p>
      </div>
    </div>
  );
}

function CallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-primary-foreground animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Loading...</h1>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
