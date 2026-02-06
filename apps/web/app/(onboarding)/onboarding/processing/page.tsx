"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, Building2, AlertCircle } from "lucide-react";
import { Button } from "@chatbot/ui";
import { StepCard, StepHeader } from "../../components/step-card";
import { OnboardingProgress, ONBOARDING_STEPS } from "../../components/onboarding-progress";
import { useOnboarding } from "../../components/onboarding-context";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";

interface CrawlStatus {
  jobId: string;
  status: string;
  domain?: string;
  error?: { code: string; message: string };
  crawlProgress?: {
    pagesFound: number;
    pagesProcessed: number;
    maxPages: number;
  };
  structureProgress?: {
    total: number;
    completed: number;
  };
  pages?: Array<{
    id: string;
    title: string;
    url: string;
    wordCount: number;
  }>;
  totals?: {
    pages: number;
    words: number;
    estimatedChunks: number;
  };
}

type ProcessingStep = "crawling" | "structuring" | "ready" | "importing" | "completed" | "failed";

function getStepStatus(
  step: ProcessingStep,
  currentStatus: string
): "pending" | "active" | "completed" | "error" {
  const order: ProcessingStep[] = ["crawling", "structuring", "ready", "importing", "completed"];
  const currentIndex = order.indexOf(currentStatus as ProcessingStep);
  const stepIndex = order.indexOf(step);

  if (currentStatus === "failed") return "error";
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

/**
 * Processing Page (Step 4)
 *
 * Shows the progress of website crawling and content processing.
 * Polls the API for job status updates.
 */
export default function ProcessingPage() {
  const router = useRouter();
  const { state } = useOnboarding();
  const [status, setStatus] = useState<CrawlStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Check if we have necessary data
  useEffect(() => {
    if (!state.projectId || !state.jobId) {
      router.push("/onboarding/website");
    }
  }, [state.projectId, state.jobId, router]);

  // Poll for status updates
  const fetchStatus = useCallback(async () => {
    if (!state.jobId) return;

    try {
      const data = await apiClient<CrawlStatus>(`/api/onboarding/status/${state.jobId}`);
      setStatus(data);

      // If job is ready and we haven't started completing, do so
      if (data.status === "ready" && !isCompleting) {
        completeOnboarding();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [state.jobId, isCompleting]);

  // Set up polling
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      // Don't poll if completed, failed, or completing
      if (
        status?.status === "completed" ||
        status?.status === "failed" ||
        isCompleting
      ) {
        return;
      }
      fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchStatus, status?.status, isCompleting]);

  // Complete onboarding by importing pages
  const completeOnboarding = async () => {
    if (!state.projectId || !state.jobId || isCompleting) return;

    setIsCompleting(true);

    try {
      await apiClient("/api/onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          projectId: state.projectId,
          jobId: state.jobId,
        }),
      });

      // Continue polling for import progress
      setIsCompleting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCompleting(false);
    }
  };

  // Navigate to completion page when done
  useEffect(() => {
    if (status?.status === "completed") {
      router.push("/onboarding/complete");
    }
  }, [status?.status, router]);

  const handleRetry = () => {
    router.push("/onboarding/website");
  };

  const handleSkip = async () => {
    if (!state.projectId) return;

    try {
      await apiClient("/api/onboarding/skip", {
        method: "POST",
        body: JSON.stringify({ projectId: state.projectId }),
      });

      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const currentStatus = status?.status || "pending";
  const isFailed = currentStatus === "failed";

  return (
    <StepCard className="max-w-lg">
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={4} />

      {/* Logo and domain */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {state.logoUrl && !logoError ? (
          <Image
            src={state.logoUrl}
            alt={`${state.domain} logo`}
            width={56}
            height={56}
            className="rounded-xl"
            onError={() => setLogoError(true)}
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        )}
        {state.domain && (
          <div className="text-left">
            <p className="font-medium">{state.domain}</p>
            <p className="text-sm text-muted-foreground">
              {isFailed ? "Setup failed" : "Setting up..."}
            </p>
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div className="space-y-3">
        <ProcessingStepItem
          label="Scanning website"
          description={
            status?.crawlProgress
              ? `Found ${status.crawlProgress.pagesFound} pages`
              : "Finding pages..."
          }
          status={getStepStatus("crawling", currentStatus)}
        />
        <ProcessingStepItem
          label="Processing content"
          description={
            status?.structureProgress
              ? `${status.structureProgress.completed}/${status.structureProgress.total} pages`
              : "Extracting information..."
          }
          status={getStepStatus("structuring", currentStatus)}
        />
        <ProcessingStepItem
          label="Creating knowledge base"
          description={
            status?.totals
              ? `${status.totals.pages} pages, ${status.totals.estimatedChunks} chunks`
              : "Building AI knowledge..."
          }
          status={getStepStatus(
            currentStatus === "importing" ? "importing" : "ready",
            currentStatus
          )}
        />
      </div>

      {/* Error state */}
      {(isFailed || error) && (
        <div className="mt-6 p-4 bg-destructive/10 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {status?.error?.message || error || "Something went wrong"}
              </p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Try Again
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip Setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time estimate */}
      {!isFailed && !error && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          This usually takes 1-2 minutes
        </p>
      )}
    </StepCard>
  );
}

interface ProcessingStepItemProps {
  label: string;
  description: string;
  status: "pending" | "active" | "completed" | "error";
}

function ProcessingStepItem({ label, description, status }: ProcessingStepItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="shrink-0">
        {status === "completed" ? (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : status === "active" ? (
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        ) : status === "error" ? (
          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <Circle className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            status === "pending" ? "text-muted-foreground" : ""
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}
