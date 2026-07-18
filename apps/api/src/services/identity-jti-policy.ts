export interface ExistingIdentityJti {
  visitorId: string;
  customerId: string | null;
}

export type ExistingIdentityJtiDecision =
  | { status: "resume" }
  | { status: "replay"; customerId: string }
  | { status: "reject" };

export function decideExistingIdentityJti(
  existing: ExistingIdentityJti | null,
  visitorId: string
): ExistingIdentityJtiDecision {
  if (!existing || existing.visitorId !== visitorId) {
    return { status: "reject" };
  }
  if (existing.customerId) {
    return { status: "replay", customerId: existing.customerId };
  }
  return { status: "resume" };
}

export function createIntervalGate(
  intervalMs: number
): (now?: number) => boolean {
  let nextRunAt = 0;

  return (now = Date.now()) => {
    if (now < nextRunAt) return false;
    nextRunAt = now + intervalMs;
    return true;
  };
}
