import { OnboardingFlow } from "../components/onboarding-flow";

/**
 * Onboarding — single full-screen state machine (welcome → train → live extract → success).
 */
export default function OnboardingPage() {
  return <OnboardingFlow />;
}
