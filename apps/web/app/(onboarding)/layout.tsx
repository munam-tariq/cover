/**
 * Onboarding Layout
 *
 * Minimal layout for the onboarding flow - no sidebar, centered content.
 * Requires authentication but doesn't need project context.
 */

import { OnboardingProvider } from "./components/onboarding-context";

// Force dynamic rendering (auth required)
export const dynamic = "force-dynamic";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {children}
      </div>
    </OnboardingProvider>
  );
}
