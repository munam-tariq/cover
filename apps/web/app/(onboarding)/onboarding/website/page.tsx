"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft, ArrowRight, Loader2, Building2 } from "lucide-react";
import { Button, Input } from "@chatbot/ui";
import { StepCard, StepHeader, StepActions } from "../../components/step-card";
import { OnboardingProgress, ONBOARDING_STEPS } from "../../components/onboarding-progress";
import { useOnboarding } from "../../components/onboarding-context";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";

// Brandfetch client ID from environment
const BRANDFETCH_CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID || "";

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

/**
 * Generate Brandfetch logo URL
 */
function getBrandfetchLogoUrl(domain: string): string {
  const baseUrl = `https://cdn.brandfetch.io/${domain}`;
  if (BRANDFETCH_CLIENT_ID) {
    return `${baseUrl}/icon/fallback/lettermark?c=${BRANDFETCH_CLIENT_ID}`;
  }
  return `${baseUrl}/icon/fallback/lettermark`;
}

/**
 * Website Page (Step 3)
 *
 * Collects the company website URL and shows logo preview.
 * Starts the website crawl when user continues.
 */
export default function WebsitePage() {
  const router = useRouter();
  const { state, setWebsiteUrl, setJobId, setLogoUrl, setDomain } = useOnboarding();
  const [url, setUrl] = useState(state.websiteUrl || "");
  const [previewDomain, setPreviewDomain] = useState<string | null>(null);
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have a project ID
  useEffect(() => {
    if (!state.projectId) {
      // No project created yet, redirect back to agent name
      router.push("/onboarding/agent-name");
    }
  }, [state.projectId, router]);

  // Update logo preview when URL changes
  useEffect(() => {
    if (url.length >= 3) {
      const domain = extractDomain(url);
      if (domain && domain.includes(".")) {
        setPreviewDomain(domain);
        setPreviewLogoUrl(getBrandfetchLogoUrl(domain));
        setLogoError(false);
      } else {
        setPreviewDomain(null);
        setPreviewLogoUrl(null);
      }
    } else {
      setPreviewDomain(null);
      setPreviewLogoUrl(null);
    }
  }, [url]);

  const handleBack = () => {
    router.push("/onboarding/agent-name");
  };

  const handleContinue = async () => {
    if (!url.trim()) {
      setError("Please enter your company website");
      return;
    }

    if (!state.projectId) {
      setError("No project found. Please go back and try again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<{ jobId: string; logoUrl: string; domain: string }>("/api/onboarding/crawl", {
        method: "POST",
        body: JSON.stringify({
          projectId: state.projectId,
          websiteUrl: url.trim(),
        }),
      });

      // Store in context
      setWebsiteUrl(url.trim());
      setJobId(data.jobId);
      setLogoUrl(data.logoUrl);
      setDomain(data.domain);

      // Navigate to processing page
      router.push("/onboarding/processing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!state.projectId) return;

    setIsLoading(true);
    try {
      await apiClient("/api/onboarding/skip", {
        method: "POST",
        body: JSON.stringify({ projectId: state.projectId }),
      });

      // Navigate to dashboard
      router.push("/dashboard");
    } catch {
      // If skip fails, still go to dashboard
      router.push("/dashboard");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && url.trim()) {
      handleContinue();
    }
  };

  return (
    <StepCard>
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={3} />

      <StepHeader
        title="Your company website"
        description="We'll import your product information to train your AI agent."
        icon={<Globe className="h-8 w-8 text-primary" />}
      />

      <div className="space-y-4">
        {/* Logo preview */}
        {previewDomain && previewLogoUrl && (
          <div className="flex items-center justify-center gap-3 bg-muted/50 rounded-lg p-4">
            {!logoError ? (
              <Image
                src={previewLogoUrl}
                alt={`${previewDomain} logo`}
                width={48}
                height={48}
                className="rounded-lg"
                onError={() => setLogoError(true)}
                unoptimized // External URL
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="text-left">
              <p className="font-medium text-sm">{previewDomain}</p>
              <p className="text-xs text-muted-foreground">Logo preview</p>
            </div>
          </div>
        )}

        <div>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., yourcompany.com"
            disabled={isLoading}
            className="h-11"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            We&apos;ll crawl your website to help your agent answer questions about
            your product, pricing, and services.
          </p>
        </div>
      </div>

      <StepActions>
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading || !url.trim()}
          className="flex-1 gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </StepActions>

      <div className="mt-4 text-center">
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now, I&apos;ll add content later
        </button>
      </div>
    </StepCard>
  );
}
