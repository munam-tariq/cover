"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowLeft, ArrowRight, Loader2, ChevronDown } from "lucide-react";
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
  const { state, setAgentName, setCompanyName, setSystemPrompt, setProjectId } = useOnboarding();
  const [name, setName] = useState(state.agentName || "");
  const [company, setCompany] = useState(state.companyName || "");
  const [personality, setPersonality] = useState(state.systemPrompt || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const systemPromptPresets = [
    {
      name: "Customer Support",
      prompt: "You are a helpful customer support agent. Answer support questions, help troubleshoot issues, and guide customers through common problems. Be friendly, patient, and thorough in your responses. If you don't know the answer, offer to connect the customer with a human agent."
    },
    {
      name: "Sales",
      prompt: "You are a knowledgeable sales assistant. Help potential customers understand our products and services, answer questions about pricing and features, and guide them toward solutions that fit their needs. Be persuasive but honest, and focus on understanding customer requirements before making recommendations."
    },
    {
      name: "Shopping Assistant",
      prompt: "You are a friendly shopping assistant. Help customers find products, compare options, check availability, and answer questions about orders and shipping. Provide personalized recommendations based on customer preferences and help them make informed purchasing decisions."
    }
  ];

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

    if (!company.trim()) {
      setError("Please enter your company name");
      return;
    }

    if (company.length > 100) {
      setError("Company name must be 100 characters or less");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient<{ projectId: string; name: string }>("/api/onboarding/start", {
        method: "POST",
        body: JSON.stringify({
          agentName: name.trim(),
          companyName: company.trim(),
          systemPrompt: personality.trim() || undefined,
        }),
      });

      // Store in context
      setAgentName(name.trim());
      setCompanyName(company.trim());
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

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setError(null);
            }}
            placeholder="e.g., Acme Corp, TechStartup Inc"
            disabled={isLoading}
            className="h-11"
            maxLength={100}
          />
        </div>

        {/* Personality / System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="personality">Personality <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="relative">
            <Textarea
              id="personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="e.g., You are a friendly sales assistant for our company. Be helpful, professional, and guide visitors to learn about our products. If you don't know something, offer to connect them with our team."
              disabled={isLoading}
              rows={4}
              className="resize-none pb-10"
            />
            <div className="absolute bottom-2 right-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
                >
                  Presets
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showPresets && (
                  <div className="absolute bottom-full right-0 mb-1 w-48 bg-background border border-input rounded-md shadow-lg z-10">
                    {systemPromptPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPersonality(preset.prompt);
                          setShowPresets(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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
          disabled={isLoading || !name.trim() || !company.trim()}
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
