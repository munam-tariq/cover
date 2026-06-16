export function hasCompletedOnboarding(settings: unknown): boolean {
  if (!settings || typeof settings !== "object") {
    return false;
  }

  const onboarding = (settings as Record<string, unknown>).onboarding;
  if (!onboarding || typeof onboarding !== "object") {
    return false;
  }

  const completedAt = (onboarding as Record<string, unknown>).completed_at;
  return typeof completedAt === "string" && completedAt.trim().length > 0;
}
