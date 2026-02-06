/**
 * Team Management API Routes
 *
 * Handles team member/agent management for projects:
 * - GET /api/projects/:id/members - List team members
 * - POST /api/projects/:id/members/invite - Send invitation
 * - PUT /api/projects/:id/members/:memberId - Update member settings
 * - DELETE /api/projects/:id/members/:memberId - Remove member
 * - GET /api/invitations/pending?email=xxx - Check pending invitations (public)
 * - GET /api/invitations/:token - Get invitation details (public)
 * - POST /api/invitations/:token/accept - Accept invitation (auth required)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

const router = Router({ mergeParams: true });

// ============================================================================
// Validation Schemas
// ============================================================================

const InviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  role: z.enum(["agent", "admin"]).default("agent"),
  maxConcurrentChats: z.number().int().min(1).max(50).default(5),
});

const UpdateMemberSchema = z.object({
  role: z.enum(["agent", "admin"]).optional(),
  maxConcurrentChats: z.number().int().min(1).max(50).optional(),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Send invitation email
 */
async function sendInvitationEmail(params: {
  email: string;
  inviterName: string;
  projectName: string;
  role: string;
  invitationUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { email, inviterName, projectName, role, invitationUrl } = params;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "hello@supportbase.app";

  try {
    const { error } = await resend.emails.send({
      from: `SupportBase <${fromAddress}>`,
      to: email,
      subject: `You've been invited to join ${projectName} on SupportBase`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #111827;">
              You're invited! 🎉
            </h1>
            <p style="margin: 0 0 24px 0; color: #6b7280;">
              <strong>${inviterName}</strong> has invited you to join <strong>${projectName}</strong> as ${role === "admin" ? "an" : "a"} <strong>${role}</strong> on SupportBase.
            </p>

            <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ${role === "admin"
                  ? "As an admin, you'll have full access to manage the project, knowledge base, and team settings."
                  : "As an agent, you'll be able to handle customer conversations and provide support."}
              </p>
            </div>

            <a href="${invitationUrl}"
               style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
              Accept Invitation
            </a>

            <p style="margin: 24px 0 0 0; font-size: 14px; color: #9ca3af;">
              This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
          </div>

          <div style="margin-top: 24px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">
              © SupportBase - AI-powered customer support
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
You're invited to join ${projectName} on SupportBase!

${inviterName} has invited you to join as ${role === "admin" ? "an" : "a"} ${role}.

${role === "admin"
  ? "As an admin, you'll have full access to manage the project, knowledge base, and team settings."
  : "As an agent, you'll be able to handle customer conversations and provide support."}

Accept your invitation here:
${invitationUrl}

This invitation will expire in 7 days.

---
SupportBase - AI-powered customer support
      `.trim(),
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to send invitation email:", err);
    return { success: false, error: message };
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/projects/:id/members
 * List all team members for a project
 */
router.get("/:id/members", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id: projectId } = req.params;

    // Validate project ID
    if (!isValidUUID(projectId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid project ID format" },
      });
    }

    // Verify user owns the project or is a member
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const isOwner = project.user_id === userId;

    // Check if user is an active member if not owner
    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }
    }

    // Get all members
    const { data: members, error: membersError } = await supabaseAdmin
      .from("project_members")
      .select("*")
      .eq("project_id", projectId)
      .neq("status", "removed")
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch members" },
      });
    }

    // Get user details for active members
    const activeUserIds = (members || [])
      .filter((m) => m.user_id && m.status === "active")
      .map((m) => m.user_id);

    let userDetails: Record<string, { email: string; name: string | null }> = {};

    if (activeUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("auth.users")
        .select("id, email, raw_user_meta_data")
        .in("id", activeUserIds);

      if (users) {
        userDetails = users.reduce(
          (acc, user) => {
            acc[user.id] = {
              email: user.email,
              name: user.raw_user_meta_data?.name || null,
            };
            return acc;
          },
          {} as Record<string, { email: string; name: string | null }>
        );
      }
    }

    // Get availability status for active members
    const { data: availabilities } = await supabaseAdmin
      .from("agent_availability")
      .select("user_id, status, current_chat_count, last_seen_at")
      .eq("project_id", projectId)
      .in(
        "user_id",
        activeUserIds.filter(Boolean)
      );

    const availabilityMap = (availabilities || []).reduce(
      (acc, a) => {
        acc[a.user_id] = a;
        return acc;
      },
      {} as Record<string, { status: string; current_chat_count: number; last_seen_at: string }>
    );

    // Build response
    // Prefer stored name from project_members, fall back to user metadata name
    const membersResponse = (members || []).map((member) => ({
      id: member.id,
      email: member.email,
      name: member.name || (member.user_id ? userDetails[member.user_id]?.name : null),
      role: member.role,
      status: member.status,
      maxConcurrentChats: member.max_concurrent_chats,
      invitedAt: member.invited_at,
      acceptedAt: member.accepted_at,
      expiresAt: member.status === "pending" ? member.expires_at : null,
      availability: member.status === "active" && member.user_id && availabilityMap[member.user_id]
        ? {
            status: availabilityMap[member.user_id].status,
            currentChatCount: availabilityMap[member.user_id].current_chat_count,
            lastSeenAt: availabilityMap[member.user_id].last_seen_at,
          }
        : null,
    }));

    // Include owner as first member
    const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(project.user_id);

    res.json({
      members: [
        {
          id: project.user_id,
          email: ownerUser?.user?.email || "",
          name: ownerUser?.user?.user_metadata?.name || null,
          role: "owner",
          status: "active",
          isOwner: true,
        },
        ...membersResponse,
      ],
      pagination: {
        total: (members || []).length + 1, // +1 for owner
      },
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/members:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/projects/:id/members/invite
 * Invite a new team member
 */
router.post("/:id/members/invite", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id: projectId } = req.params;

    // Validate project ID
    if (!isValidUUID(projectId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid project ID format" },
      });
    }

    // Validate request body
    const validation = InviteMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    const { email, name, role, maxConcurrentChats } = validation.data;

    // Verify user owns the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, name")
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Check if user is trying to invite themselves
    const { data: invitingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (invitingUser?.user?.email?.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({
        error: { code: "SELF_INVITE", message: "You cannot invite yourself" },
      });
    }

    // Check for existing member with same email
    const { data: existingMember } = await supabaseAdmin
      .from("project_members")
      .select("id, status, expires_at")
      .eq("project_id", projectId)
      .eq("email", email.toLowerCase())
      .single();

    if (existingMember) {
      if (existingMember.status === "active") {
        return res.status(409).json({
          error: { code: "ALREADY_MEMBER", message: "This email is already a team member" },
        });
      }

      if (existingMember.status === "pending") {
        const isExpired = new Date(existingMember.expires_at) < new Date();
        if (!isExpired) {
          return res.status(409).json({
            error: { code: "PENDING_INVITATION", message: "An invitation is already pending for this email" },
          });
        }

        // Delete expired invitation to allow re-invite
        await supabaseAdmin.from("project_members").delete().eq("id", existingMember.id);
      }

      if (existingMember.status === "removed") {
        // Delete removed record to allow re-invite
        await supabaseAdmin.from("project_members").delete().eq("id", existingMember.id);
      }
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const { data: member, error: insertError } = await supabaseAdmin
      .from("project_members")
      .insert({
        project_id: projectId,
        email: email.toLowerCase(),
        name,
        role,
        status: "pending",
        invitation_token: invitationToken,
        invited_by: userId,
        expires_at: expiresAt.toISOString(),
        max_concurrent_chats: maxConcurrentChats,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      return res.status(500).json({
        error: { code: "CREATE_ERROR", message: "Failed to create invitation" },
      });
    }

    // Build invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invite/${invitationToken}`;

    // Get inviter name for email
    const inviterName = invitingUser?.user?.user_metadata?.name || invitingUser?.user?.email || "A team member";

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      email,
      inviterName,
      projectName: project.name,
      role,
      invitationUrl,
    });

    if (!emailResult.success) {
      console.warn(`Failed to send invitation email to ${email}: ${emailResult.error}`);
    }

    res.status(201).json({
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role,
        status: member.status,
        maxConcurrentChats: member.max_concurrent_chats,
        invitedAt: member.invited_at,
        expiresAt: member.expires_at,
      },
      emailSent: emailResult.success,
      // Only include URL in development if email failed
      ...(process.env.NODE_ENV === "development" && !emailResult.success && { invitationUrl }),
    });
  } catch (error) {
    console.error("Error in POST /projects/:id/members/invite:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * PUT /api/projects/:id/members/:memberId
 * Update member settings
 */
router.put("/:id/members/:memberId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id: projectId, memberId } = req.params;

    // Validate IDs
    if (!isValidUUID(projectId) || !isValidUUID(memberId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid ID format" },
      });
    }

    // Validate request body
    const validation = UpdateMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Get current member
    const { data: member, error: memberError } = await supabaseAdmin
      .from("project_members")
      .select("*")
      .eq("id", memberId)
      .eq("project_id", projectId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        error: { code: "MEMBER_NOT_FOUND", message: "Member not found" },
      });
    }

    const updates: Record<string, unknown> = {};
    const { role, maxConcurrentChats } = validation.data;

    if (role !== undefined) updates.role = role;
    if (maxConcurrentChats !== undefined) updates.max_concurrent_chats = maxConcurrentChats;

    // Update member
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from("project_members")
      .update(updates)
      .eq("id", memberId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating member:", updateError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to update member" },
      });
    }

    // Also update agent_availability if active
    if (maxConcurrentChats !== undefined && member.user_id && member.status === "active") {
      await supabaseAdmin
        .from("agent_availability")
        .update({ max_concurrent_chats: maxConcurrentChats })
        .eq("user_id", member.user_id)
        .eq("project_id", projectId);
    }

    res.json({
      member: {
        id: updatedMember.id,
        email: updatedMember.email,
        role: updatedMember.role,
        status: updatedMember.status,
        maxConcurrentChats: updatedMember.max_concurrent_chats,
        invitedAt: updatedMember.invited_at,
        acceptedAt: updatedMember.accepted_at,
      },
    });
  } catch (error) {
    console.error("Error in PUT /projects/:id/members/:memberId:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * DELETE /api/projects/:id/members/:memberId
 * Remove a member from the project
 */
router.delete("/:id/members/:memberId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id: projectId, memberId } = req.params;

    // Validate IDs
    if (!isValidUUID(projectId) || !isValidUUID(memberId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid ID format" },
      });
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Get member
    const { data: member, error: memberError } = await supabaseAdmin
      .from("project_members")
      .select("*")
      .eq("id", memberId)
      .eq("project_id", projectId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({
        error: { code: "MEMBER_NOT_FOUND", message: "Member not found" },
      });
    }

    // Soft delete - set status to removed
    const { error: updateError } = await supabaseAdmin
      .from("project_members")
      .update({ status: "removed", invitation_token: null })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error removing member:", updateError);
      return res.status(500).json({
        error: { code: "DELETE_ERROR", message: "Failed to remove member" },
      });
    }

    // Also set agent availability to offline if they were active
    if (member.user_id && member.status === "active") {
      await supabaseAdmin
        .from("agent_availability")
        .update({ status: "offline" })
        .eq("user_id", member.user_id)
        .eq("project_id", projectId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /projects/:id/members/:memberId:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * POST /api/invitations/:token/accept
 * Accept an invitation (requires authentication)
 */
router.post("/invitations/:token/accept", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({
        error: { code: "INVALID_TOKEN", message: "Invalid invitation token" },
      });
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("project_members")
      .select("*, projects(id, name)")
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({
        error: { code: "INVITATION_NOT_FOUND", message: "Invitation not found or already used" },
      });
    }

    // Check if invitation expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({
        error: { code: "INVITATION_EXPIRED", message: "This invitation has expired" },
      });
    }

    // Get user's email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!userData?.user?.email) {
      return res.status(400).json({
        error: { code: "EMAIL_REQUIRED", message: "User email not found" },
      });
    }

    // Verify email matches invitation
    if (userData.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        error: {
          code: "EMAIL_MISMATCH",
          message: "This invitation was sent to a different email address",
        },
      });
    }

    // Accept the invitation
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from("project_members")
      .update({
        user_id: userId,
        status: "active",
        invitation_token: null,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .select("*, projects(id, name)")
      .single();

    if (updateError) {
      console.error("Error accepting invitation:", updateError);
      return res.status(500).json({
        error: { code: "ACCEPT_ERROR", message: "Failed to accept invitation" },
      });
    }

    // Create agent availability record
    await supabaseAdmin.from("agent_availability").upsert(
      {
        user_id: userId,
        project_id: invitation.project_id,
        status: "offline",
        max_concurrent_chats: invitation.max_concurrent_chats,
        current_chat_count: 0,
      },
      {
        onConflict: "user_id,project_id",
      }
    );

    res.json({
      success: true,
      member: {
        id: updatedMember.id,
        email: updatedMember.email,
        role: updatedMember.role,
        status: updatedMember.status,
        maxConcurrentChats: updatedMember.max_concurrent_chats,
        acceptedAt: updatedMember.accepted_at,
      },
      project: {
        id: updatedMember.projects.id,
        name: updatedMember.projects.name,
      },
    });
  } catch (error) {
    console.error("Error in POST /invitations/:token/accept:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * GET /api/invitations/pending
 * Check if email has any pending invitations (public - no auth required)
 * Used by auth callback to determine if default project should be created
 */
router.get("/invitations/pending", async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        error: { code: "INVALID_EMAIL", message: "Valid email required" },
      });
    }

    const { data: invitations, error: queryError } = await supabaseAdmin
      .from("project_members")
      .select("id, project_id, role, expires_at, projects(name)")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (queryError) {
      console.error("Error checking pending invitations:", queryError);
      return res.status(500).json({
        error: { code: "QUERY_ERROR", message: "Failed to check invitations" },
      });
    }

    res.json({
      hasPendingInvitations: (invitations || []).length > 0,
      count: (invitations || []).length,
      // Don't expose tokens or sensitive data - only project names and roles
      invitations: (invitations || []).map((inv) => ({
        projectName: (inv.projects as { name: string } | null)?.name || "Unknown",
        role: inv.role,
        expiresAt: inv.expires_at,
      })),
    });
  } catch (error) {
    console.error("Error in GET /invitations/pending:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to check invitations" },
    });
  }
});

/**
 * GET /api/invitations/:token
 * Get invitation details (public - no auth required)
 */
router.get("/invitations/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({
        error: { code: "INVALID_TOKEN", message: "Invalid invitation token" },
      });
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("project_members")
      .select("email, role, expires_at, status, projects(name)")
      .eq("invitation_token", token)
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({
        error: { code: "INVITATION_NOT_FOUND", message: "Invitation not found" },
      });
    }

    if (invitation.status !== "pending") {
      return res.status(410).json({
        error: { code: "INVITATION_USED", message: "This invitation has already been used" },
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({
        error: { code: "INVITATION_EXPIRED", message: "This invitation has expired" },
      });
    }

    res.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        projectName: invitation.projects.name,
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("Error in GET /invitations/:token:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as teamRouter };
