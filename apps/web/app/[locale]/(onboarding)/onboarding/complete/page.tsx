import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

// The onboarding flow is now a single state machine at /onboarding.
export default async function CompleteRedirect() {
  redirect({ href: "/onboarding", locale: await getLocale() });
}
