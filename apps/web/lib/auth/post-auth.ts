/**
 * Post-authentication routing shared by the magic-link callback page and the
 * cross-browser verification-code path on the check-email page.
 *
 * Decides where a freshly signed-in user should land:
 * - invited users -> their invite (or `next` as given)
 * - brand-new users -> /onboarding (and emits `signed_up`)
 * - users with incomplete onboarding -> /onboarding
 * - everyone else -> `next`
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import posthog from "posthog-js";

interface AuthUser {
  id: string;
  email?: string;
}

// Must be exactly /invite/{64-char-hex-token}
const INVITE_PATH_RE = /^\/invite\/[a-f0-9]{64}$/i;

async function checkPendingInvitations(email: string): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(
      `${apiUrl}/api/invitations/pending?email=${encodeURIComponent(email)}`
    );

    if (!response.ok) {
      console.warn("Failed to check pending invitations:", response.status);
      return false;
    }

    const data = await response.json();
    return data.hasPendingInvitations === true;
  } catch (err) {
    console.warn("Error checking pending invitations:", err);
    return false;
  }
}

export async function resolvePostAuthRedirect(
  supabase: SupabaseClient,
  user: AuthUser,
  next: string
): Promise<string> {
  // Link this browser session to the authenticated user for all analytics,
  // then record the sign-in. Brand-new users additionally emit `signed_up`.
  posthog.identify(user.id, user.email ? { email: user.email } : undefined);
  posthog.capture("logged_in");

  // Invited users are joining someone else's project - never send them to
  // onboarding.
  if (INVITE_PATH_RE.test(next)) {
    return next;
  }
  if (user.email && (await checkPendingInvitations(user.email))) {
    return next;
  }

  // Use .limit(1) instead of .single() to avoid errors when multiple projects
  // exist.
  const { data: existingProjects, error: fetchError } = await supabase
    .from("projects")
    .select("id, settings")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);

  if (fetchError) {
    console.error("Failed to check for existing projects:", fetchError);
    return next;
  }

  // New user with no projects -> onboarding
  if (!existingProjects || existingProjects.length === 0) {
    posthog.capture("signed_up");
    return "/onboarding";
  }

  const settings = existingProjects[0].settings as Record<
    string,
    unknown
  > | null;
  const onboarding = settings?.onboarding as Record<string, unknown> | null;

  if (onboarding && !onboarding.completed_at && !onboarding.skipped) {
    return "/onboarding";
  }

  return next;
}
