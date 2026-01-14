"use client";

import type { CardComponentProps } from "onborda";
import { useOnborda } from "onborda";
import { Button } from "@chatbot/ui";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { useTourContext } from "./tour-provider";

export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const tourContext = useTourContext();
  const { closeOnborda } = useOnborda();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleClose = () => {
    // Mark tour as completed in localStorage
    tourContext?.completeTour();
    closeOnborda();
  };

  const handleDone = () => {
    // Mark tour as completed and close
    tourContext?.completeTour();
    closeOnborda();
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-lg w-[340px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{step.icon}</span>
          <h3 className="font-semibold text-sm">{step.title}</h3>
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? "w-4 bg-primary"
                  : index < currentStep
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            size="sm"
            onClick={isLastStep ? handleDone : nextStep}
            className="h-8"
          >
            {isLastStep ? (
              "Done"
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Arrow pointer */}
      {arrow}
    </div>
  );
}
