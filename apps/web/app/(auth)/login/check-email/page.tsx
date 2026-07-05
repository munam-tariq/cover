"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

import { resolvePostAuthRedirect } from "@/lib/auth/post-auth";
import { createClient } from "@/lib/supabase/client";

function CheckEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  const returnUrl = searchParams?.get("returnUrl");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

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
      // Preserve returnUrl the same way the login page does
      const callbackUrl = returnUrl
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
        : `${window.location.origin}/auth/callback`;

      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying || verifyCode.trim().length !== 6) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      // Redeem the display code shown by the other browser for the PKCE auth
      // code, then exchange it here - where the code verifier lives.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/auth/link-code/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCode: verifyCode.trim() }),
      });

      if (!response.ok) {
        setVerifyError(
          "Invalid or expired code. Check the code, or resend the email to start over."
        );
        return;
      }

      const { authCode } = await response.json();
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        authCode
      );

      if (error || !data.user) {
        setVerifyError(
          "Could not complete sign in. Please resend the email and try again."
        );
        return;
      }

      const next = returnUrl || "/dashboard";
      router.push(await resolvePostAuthRedirect(supabase, data.user, next));
    } catch (err) {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
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

        {/* Verification code entry - for links opened in a different browser */}
        <div className="border-t pt-6">
          {!showCodeEntry ? (
            <button
              onClick={() => setShowCodeEntry(true)}
              className="text-sm text-primary hover:underline"
            >
              Enter verification code
            </button>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Opened the link on another device or browser? Enter the code it
                shows you:
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="6-digit code"
                disabled={isVerifying}
                className="block w-full px-3 py-2.5 text-center text-lg tracking-[0.3em] tabular-nums border border-input rounded-md shadow-sm placeholder-muted-foreground placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-background"
                aria-label="Verification code"
              />
              {verifyError && (
                <p className="text-sm text-destructive">{verifyError}</p>
              )}
              <button
                type="submit"
                disabled={isVerifying || verifyCode.length !== 6}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isVerifying ? "Verifying..." : "Verify code"}
              </button>
            </form>
          )}
        </div>

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
