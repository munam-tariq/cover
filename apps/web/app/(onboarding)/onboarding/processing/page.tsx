import { redirect } from "next/navigation";

// The onboarding flow is now a single state machine at /onboarding.
export default function ProcessingRedirect() {
  redirect("/onboarding");
}
