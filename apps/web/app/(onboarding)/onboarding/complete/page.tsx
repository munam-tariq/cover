"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, PlayCircle, LayoutDashboard, FileText, Building2 } from "lucide-react";
import { Button } from "@chatbot/ui";
import { StepCard, StepHeader, StepActions } from "../../components/step-card";
import { useOnboarding } from "../../components/onboarding-context";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";

interface CrawlStatus {
  jobId: string;
  status: string;
  totals?: {
    pages: number;
    imported: number;
    failed: number;
  };
}

/**
 * Complete Page (Step 5)
 *
 * Shows success message and next steps after onboarding is complete.
 */
export default function CompletePage() {
  const router = useRouter();
  const { state, reset } = useOnboarding();
  const [totals, setTotals] = useState<{ pages: number; imported: number } | null>(null);
  const [logoError, setLogoError] = useState(false);

  // Fetch final totals
  useEffect(() => {
    const fetchTotals = async () => {
      if (!state.jobId) return;

      try {
        const data = await apiClient<CrawlStatus>(`/api/onboarding/status/${state.jobId}`);
        if (data.totals) {
          setTotals({
            pages: data.totals.pages || 0,
            imported: data.totals.imported || data.totals.pages || 0,
          });
        }
      } catch {
        // Ignore errors - we'll show generic success
      }
    };

    fetchTotals();
  }, [state.jobId]);

  const handleTestAgent = () => {
    // Clear onboarding state
    reset();
    // Navigate to playground
    router.push("/playground");
  };

  const handleGoToDashboard = () => {
    // Clear onboarding state
    reset();
    // Navigate to dashboard
    router.push("/dashboard");
  };

  return (
    <StepCard>
      <StepHeader
        title="You're all set!"
        description={`Your AI agent "${state.agentName || "Assistant"}" is ready to capture leads.`}
        icon={<PartyPopper className="h-8 w-8 text-primary" />}
      />

      {/* Company info */}
      {state.domain && (
        <div className="flex items-center justify-center gap-3 mb-6 bg-muted/50 rounded-lg p-4">
          {state.logoUrl && !logoError ? (
            <Image
              src={state.logoUrl}
              alt={`${state.domain} logo`}
              width={48}
              height={48}
              className="rounded-lg"
              onError={() => setLogoError(true)}
              unoptimized
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="text-left">
            <p className="font-medium">{state.domain}</p>
            {totals && (
              <p className="text-sm text-muted-foreground">
                {totals.imported} pages imported
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {totals && totals.imported > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Knowledge imported:</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <FileText className="h-4 w-4" />
            <span>
              {totals.imported} page{totals.imported !== 1 ? "s" : ""} from your
              website
            </span>
          </div>
        </div>
      )}

      {/* What's next */}
      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-primary mb-2">What&apos;s next?</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- Test your agent in the playground</li>
          <li>- Add the chat widget to your website</li>
          <li>- Configure lead capture settings</li>
        </ul>
      </div>

      <StepActions className="flex-col gap-2">
        <Button
          onClick={handleTestAgent}
          className="w-full gap-2"
          size="lg"
        >
          <PlayCircle className="h-4 w-4" />
          Test Your Agent
        </Button>
        <Button
          variant="outline"
          onClick={handleGoToDashboard}
          className="w-full gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </StepActions>
    </StepCard>
  );
}
