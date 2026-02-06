"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { Button } from "@chatbot/ui";
import { StepCard, StepHeader, StepActions } from "../components/step-card";
import { OnboardingProgress, ONBOARDING_STEPS } from "../components/onboarding-progress";

/**
 * Welcome Page (Step 1)
 *
 * First page of the onboarding flow - welcomes the user and
 * explains what the setup process involves.
 */
export default function WelcomePage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/onboarding/agent-name");
  };

  return (
    <StepCard>
      <OnboardingProgress steps={ONBOARDING_STEPS} currentStep={1} />

      <StepHeader
        title="Welcome to Cover"
        description="Your AI SDR agent that works 24/7, knows your product, and captures every lead."
        icon={<Rocket className="h-8 w-8 text-primary" />}
      />

      <div className="space-y-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            In just 2 minutes, we&apos;ll help you:
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">1.</span>
              <span>Name your AI sales agent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">2.</span>
              <span>Import your product knowledge from your website</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">3.</span>
              <span>Get ready to capture leads 24/7</span>
            </li>
          </ul>
        </div>
      </div>

      <StepActions className="flex-col">
        <Button
          onClick={handleGetStarted}
          className="w-full h-11"
          size="lg"
        >
          Get Started
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Takes about 2 minutes to set up
        </p>
      </StepActions>
    </StepCard>
  );
}
