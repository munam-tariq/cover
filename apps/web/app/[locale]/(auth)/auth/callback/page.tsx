"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth callback content - handles PKCE code exchange client-side
 *
 * The magic link flow:
 * 1. User requests magic link (signInWithOtp) - browser stores PKCE code verifier
 * 2. User clicks email link -> Supabase verifies -> redirects here with ?code=...
 * 3. This page exchanges the code for a session using the stored code verifier
 * 4. On success, resolvePostAuthRedirect decides where the user lands
 *
 * Cross-browser case: if the link was opened in a browser that never initiated
 * the sign-in (e.g. Gmail's in-app browser), there is no code verifier and the
 * exchange cannot succeed here. Instead of a dead-end error, we stash the auth
 * code with the API in exchange for a 6-digit display code the user types back
 * in the original browser (which holds the verifier) on /login/check-email.
 *
 * Note: createBrowserClient has detectSessionInUrl: true by default, which means
 * it may automatically exchange the code. We handle both cases gracefully.
 */
function AuthCallbackContent() {
  const t = useTranslations("auth.callback");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [displayCode, setDisplayCode] = useState<string | null>(null);

  useEffect(() => {
    console.count("[debug] auth/callback effect ran");
    const handleCallback = async () => {
      const supabase = createClient();
      const next = searchParams?.get("next") ?? "/dashboard";

      const finishSignIn = async (user: { id: string; email?: string }) => {
        router.push(await resolvePostAuthRedirect(supabase, user, next));
      };

      // Trade the unusable auth code for a display code the user can type in
      // the browser where they started sign-in. Returns null on any failure so
      // the caller can fall back to the normal error screen.
      const stashForRelay = async (code: string): Promise<string | null> => {
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const response = await fetch(`${apiUrl}/api/auth/link-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authCode: code }),
          });
          if (!response.ok) return null;
          const data = await response.json();
          return typeof data.displayCode === "string" ? data.displayCode : null;
        } catch {
          return null;
        }
      };

      // First, check if we already have a session
      // (createBrowserClient with detectSessionInUrl: true may have already handled the code)
      console.count("[debug] getSession call #1 (existing check)");
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user) {
        await finishSignIn(existingSession.user);
        return;
      }

      // No existing session, try to exchange the code
      const code = searchParams?.get("code");

      if (!code) {
        setError(t("noCode"));
        return;
      }

      try {
        console.count("[debug] exchangeCodeForSession call");
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);

          // Even if exchange fails, check if session was established through another mechanism
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();

          if (retrySession?.user) {
            await finishSignIn(retrySession.user);
            return;
          }

          // Missing or mismatched verifier = this browser didn't start the
          // sign-in. Offer the cross-browser verification code instead.
          if (exchangeError.message.toLowerCase().includes("verifier")) {
            const relayCode = await stashForRelay(code);
            if (relayCode) {
              setDisplayCode(relayCode);
              return;
            }
          }

          setError(exchangeError.message || t("exchangeFailed"));
          return;
        }

        if (data.user) {
          await finishSignIn(data.user);
          return;
        }
        router.push(next);
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);

        // Last resort: check for session one more time
        const {
          data: { session: lastCheckSession },
        } = await supabase.auth.getSession();

        if (lastCheckSession?.user) {
          await finishSignIn(lastCheckSession.user);
          return;
        }

        setError(t("unexpectedError"));
      }
    };

    handleCallback();
  }, [searchParams, router, t]);

  if (displayCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm p-8 space-y-6 text-center">
          <h1 className="text-xl font-semibold">
            {t("verificationTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("verificationSub")}
          </p>
          <div className="text-4xl font-semibold tracking-[0.3em] tabular-nums py-4">
            {displayCode}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("verificationExpiry")}
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-semibold">{t("signInFailedTitle")}</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-medium transition-colors"
          >
            {t("backToLogin")}
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
        <h1 className="text-xl font-semibold">{t("signingIn")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("pleaseWait")}
        </p>
      </div>
    </div>
  );
}

function CallbackFallback() {
  const t = useTranslations("auth.callback");
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
        <h1 className="text-xl font-semibold">{t("loading")}</h1>
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
