"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button, Input, Textarea, Label } from "@chatbot/ui";
import { StepCard, StepHeader, StepActions } from "../../components/step-card";
import { OnboardingProgress, ONBOARDING_STEPS } from "../../components/onboarding-progress";
import { useOnboarding } from "../../components/onboarding-context";
import { apiClient } from "@/lib/api-client";

/**
 * Agent Name Page (Step 2)
 *
 * Collects the name and personality for the AI agent and creates the project.
 */
export default function AgentNamePage() {
  const router = useRouter();
  const { state, setAgentName, setSystemPrompt, setProjectId } = useOnboarding();
  const [name, setName] = useState(state.agentName || "");
  const [personality, setPersonality] = useState(state.systemPrompt || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.push("/onboarding");
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      setError("Please enter a name for your agent");
      return;
    }

    if (name.length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<{ projectId: string; name: string }>("/api/onboarding/start", {
        method: "POST",
        body: JSON.stringify({
          agentName: name.trim(),
          systemPrompt: personality.trim() || undefined,
        }),
      });

      // Store in context
      setAgentName(name.trim());
      setSystemPrompt(personality.trim());
      setProjectId(data.projectId);

      // Navigate to next step
      router.push("/onboarding/website");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && name.trim()) {
      handleContinue();
    }
  };

  return (
    <StepCard>
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={2} />

      <StepHeader
        title="Name your AI agent"
        description="This name will be shown to visitors chatting with your agent."
        icon={<Bot className="h-8 w-8 text-primary" />}
      />

      <div className="space-y-5">
        {/* Agent Name */}
        <div className="space-y-2">
          <Label htmlFor="agent-name">Agent Name</Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Sales Assistant, Support Bot, Product Expert"
            disabled={isLoading}
            className="h-11"
            autoFocus
          />
        </div>

        {/* Personality / System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="personality">Personality <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="personality"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="e.g., You are a friendly sales assistant for our company. Be helpful, professional, and guide visitors to learn about our products. If you don't know something, offer to connect them with our team."
            disabled={isLoading}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Describe how your agent should behave and respond to visitors.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> You can always refine these settings later in the agent studio.
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
          disabled={isLoading || !name.trim()}
          className="flex-1 gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </StepActions>
    </StepCard>
  );
}
