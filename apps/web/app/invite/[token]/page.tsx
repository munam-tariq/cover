"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent } from "@chatbot/ui";
import {
  AlertCircle,
  Check,
  Loader2,
  Users,
  Shield,
  MessageSquare,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface InvitationDetails {
  email: string;
  role: string;
  projectName: string;
  expiresAt: string;
}

// ============================================================================
// Component
// ============================================================================

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createClient();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUser({ email: session.user.email });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUser({ email: session.user.email });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          if (data.error?.code === "INVITATION_NOT_FOUND") {
            setError("This invitation link is invalid or has already been used.");
          } else if (data.error?.code === "INVITATION_EXPIRED") {
            setError("This invitation has expired. Please ask for a new invitation.");
          } else if (data.error?.code === "INVITATION_USED") {
            setError("This invitation has already been accepted.");
          } else {
            setError(data.error?.message || "Failed to load invitation");
          }
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error("Failed to fetch invitation:", err);
        setError("Failed to load invitation details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  // Accept invitation
  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(`/invite/${token}`);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push(`/login?returnUrl=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/invitations/${token}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "EMAIL_MISMATCH") {
          setError(`This invitation was sent to ${invitation?.email}. Please sign in with that email address.`);
        } else {
          setError(data.error?.message || "Failed to accept invitation");
        }
        return;
      }

      setSuccess(true);

      // Save the project ID to localStorage so dashboard auto-selects it
      if (data.project?.id) {
        localStorage.setItem("cover_selected_project_id", data.project.id);
      }

      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      setError("Failed to accept invitation. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Invalid Invitation</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Welcome to the Team!</h1>
            <p className="text-muted-foreground mb-6">
              You've successfully joined <strong>{invitation?.projectName}</strong>.
              Redirecting to your dashboard...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invitation view
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">You're Invited!</h1>
            <p className="text-muted-foreground">
              Join <strong>{invitation?.projectName}</strong> on FrontFace
            </p>
          </div>

          {/* Role Info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              {invitation?.role === "admin" ? (
                <Shield className="h-5 w-5 text-primary" />
              ) : (
                <MessageSquare className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium capitalize">{invitation?.role}</p>
                <p className="text-sm text-muted-foreground">
                  {invitation?.role === "admin"
                    ? "Full access to manage the project, team, and settings"
                    : "Handle customer conversations and provide support"}
                </p>
              </div>
            </div>
          </div>

          {/* Invitation details */}
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invited email:</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">
                {invitation?.expiresAt
                  ? new Date(invitation.expiresAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Auth status & action */}
          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Signed in as <strong>{user.email}</strong>
              </p>
              {user.email.toLowerCase() !== invitation?.email.toLowerCase() && (
                <div className="p-3 rounded-md bg-yellow-500/10 text-yellow-700 text-sm">
                  <p>
                    This invitation is for <strong>{invitation?.email}</strong>.
                    Please sign in with that email to accept.
                  </p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting || user.email.toLowerCase() !== invitation?.email.toLowerCase()}
              >
                {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {accepting ? "Accepting..." : "Accept Invitation"}
              </Button>
              {user.email.toLowerCase() !== invitation?.email.toLowerCase() && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                  }}
                >
                  Sign out and use different account
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Sign in with <strong>{invitation?.email}</strong> to accept this invitation.
              </p>
              <Button className="w-full" onClick={handleAccept}>
                Sign in to Accept
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
