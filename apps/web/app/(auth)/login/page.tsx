"use client";

import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useState } from "react";

import { WindowMark } from "@/components/window-mark";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams?.get("error");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      // Preserve returnUrl so user is redirected back after login
      const returnUrl = searchParams?.get("returnUrl");
      const callbackUrl = returnUrl
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${window.location.origin}/auth/callback`;

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("rate limit")) {
          setError("Too many attempts. Please try again later.");
        } else {
          setError(authError.message);
        }
        return;
      }

      // Track the magic-link request (domain only — never the raw email).
      posthog.capture("magic_link_requested", {
        email_domain: email.split("@")[1],
      });

      // Redirect to check-email page, preserving returnUrl for the
      // verification-code path
      router.push(
        returnUrl
          ? `/login/check-email?email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent(returnUrl)}`
          : `/login/check-email?email=${encodeURIComponent(email)}`
      );
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mb-4">
            <WindowMark size={48} />
          </div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email to get started
          </p>
        </div>

        {/* Error from URL params (e.g., expired link) */}
        {errorParam && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {errorParam === "auth_failed"
              ? "Sign in failed. Please try again."
              : errorParam === "no_code"
                ? "Invalid link. Please request a new one."
                : "An error occurred. Please try again."}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              disabled={isLoading}
              className="block w-full px-3 py-2.5 border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-background"
              aria-label="Email address"
            />
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                Sending...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mb-4">
            <WindowMark size={48} />
          </div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
