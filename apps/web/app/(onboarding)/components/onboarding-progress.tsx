"use client";

import { Check } from "lucide-react";
import { cn } from "@chatbot/ui";

interface Step {
  id: number;
  name: string;
}

interface OnboardingProgressProps {
  steps: Step[];
  currentStep: number;
}

export function OnboardingProgress({ steps, currentStep }: OnboardingProgressProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <li key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-all duration-200",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Connector line (except for last step) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 transition-colors duration-200",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const ONBOARDING_STEPS: Step[] = [
  { id: 1, name: "Welcome" },
  { id: 2, name: "Agent Name" },
  { id: 3, name: "Website" },
  { id: 4, name: "Setup" },
];
