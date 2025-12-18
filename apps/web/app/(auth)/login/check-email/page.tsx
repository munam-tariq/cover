"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const supabase = createClient();

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      setResendCooldown(60); // 60 second cooldown
      setResendSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      // Silently fail - user can try again
    } finally {
      setIsResending(false);
    }
  };

  // If no email, redirect back to login
  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No email address provided.</p>
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 text-center">
        {/* Email Icon */}
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Message */}
        <div>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We sent a magic link to:
          </p>
          <p className="font-medium mt-1">{email}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Click the link to sign in.
          </p>
        </div>

        {/* Success Message */}
        {resendSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm p-3 rounded-md">
            Email sent successfully!
          </div>
        )}

        {/* Resend Section */}
        <div className="border-t pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Didn&apos;t receive it?
          </p>
          <button
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
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
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              "Resend email"
            )}
          </button>
        </div>

        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to login
        </Link>
      </div>
    </div>
  );
}

function CheckEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailFallback />}>
      <CheckEmailContent />
    </Suspense>
  );
}
