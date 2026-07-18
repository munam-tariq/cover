/**
 * Customer API Routes
 *
 * Handles customer identification and context:
 * - POST /api/customers/identify - Verify a signed identity token and sync the contact
 * - GET /api/conversations/:id/customer - Get customer context
 * - GET /api/projects/:id/customers - List customers for a project
 * - GET /api/customers/:id - Get customer details
 */

import { Router, Request, Response } from "express";
import { z } from "zod";

import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";
import { identifyRateLimiters } from "../middleware/rate-limit";
import {
  applyVerifiedIdentity,
  loadIdentityResult,
} from "../services/customer-identity";
import {
  recordIdentityJtiResult,
  reserveIdentityJti,
} from "../services/identity-jti";
import {
  IdentityTokenError,
  verifyIdentityToken,
} from "../services/identity-jwt";
import { getDecryptedIdentitySecret } from "../services/identity-secret";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const IdentifyCustomerSchema = z.object({
  visitorId: z.string().min(1).max(100),
  projectId: z.string().uuid("Invalid project ID"),
  token: z.string().min(1).max(4096),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/** The verified-identity embed (service-managed) from customer_identities. */
interface CustomerIdentityRow {
  external_id: string;
  verified_at: string;
  verified_email: string | null;
  verified_name: string | null;
  verified_phone: string | null;
  custom_attributes: Record<string, unknown> | null;
}

/**
 * Columns to embed the verified identity onto a customers select. The FK is
 * named explicitly (`!customer_identities_customer_id_fkey`) because
 * customer_identities has TWO foreign keys to customers — the customer_id PK
 * ref and the composite (customer_id, project_id) tenant FK — so a bare
 * `customer_identities(...)` embed is ambiguous (PostgREST PGRST201).
 */
const CUSTOMER_IDENTITY_EMBED =
  "customer_identities!customer_identities_customer_id_fkey(external_id, verified_at, verified_email, verified_name, verified_phone, custom_attributes)";

/** PostgREST may return a to-one embed as an object or a single-element array. */
function firstIdentity(
  embed: CustomerIdentityRow | CustomerIdentityRow[] | null | undefined
): CustomerIdentityRow | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

/**
 * Serialise a customer DB row into the API response shape, with an explicit
 * split between mutable `contact` fields (email/name/phone — agent- and
 * lead-capture-editable) and the service-managed `verifiedIdentity` snapshot
 * (from customer_identities, written only by the identify RPC). The verified
 * badge derives from `verified`, never from a mutable contact field.
 */
function serializeCustomer(c: {
  id: string;
  visitor_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  first_seen_at: string;
  last_seen_at: string;
  total_conversations?: number | null;
  is_flagged?: boolean | null;
  customer_identities?: CustomerIdentityRow | CustomerIdentityRow[] | null;
}) {
  const identity = firstIdentity(c.customer_identities);
  return {
    id: c.id,
    visitorId: c.visitor_id,
    email: c.email,
    name: c.name,
    phone: c.phone,
    firstSeenAt: c.first_seen_at,
    lastSeenAt: c.last_seen_at,
    conversationCount: c.total_conversations ?? 0,
    isFlagged: c.is_flagged ?? false,
    verified: identity != null,
    verifiedIdentity: identity
      ? {
          externalId: identity.external_id,
          verifiedAt: identity.verified_at,
          email: identity.verified_email,
          name: identity.verified_name,
          phone: identity.verified_phone,
          customAttributes: identity.custom_attributes ?? null,
        }
      : null,
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/customers/identify
 *
 * Verify a signed identity token and sync the contact. The token is an HS256
 * JWT minted by the TENANT'S OWN BACKEND with the project's verification
 * secret (Settings → Widget), so identity claims cannot be forged — this is
 * what makes reviving the once-disabled public endpoint safe. The JWT is the
 * authenticator; the widget gate (client key or allowed origin) is
 * defense-in-depth, and the rate limit bounds brute-force attempts.
 *
 * No widget-session token is required: identify legitimately runs before any
 * conversation exists, and identity lives on the customers row keyed by
 * visitor id, so identify-then-chat and chat-then-identify converge.
 */
router.post(
  "/identify",
  requirePublicWidgetAccess({
    action: "customer-identify",
    projectIdSource: "body",
  }),
  ...identifyRateLimiters,
  async (req: Request, res: Response) => {
    try {
      const validation = IdentifyCustomerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: validation.error.flatten().fieldErrors,
          },
        });
      }

      const { visitorId, projectId, token } = validation.data;

      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!project) {
        return res.status(404).json({
          error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        });
      }

      const secret = await getDecryptedIdentitySecret(projectId);
      if (!secret) {
        return res.status(409).json({
          error: {
            code: "IDENTITY_NOT_CONFIGURED",
            message:
              "Identity verification is not configured for this project. Generate a verification secret in Settings → Widget.",
          },
        });
      }

      try {
        const claims = verifyIdentityToken(token, secret);

        // Optional visitor binding: if the token names a visitor, it must match.
        if (
          claims.visitorIdClaim !== undefined &&
          claims.visitorIdClaim !== visitorId
        ) {
          return res.status(401).json({
            error: {
              code: "TOKEN_INVALID",
              message: "Identity token visitor_id does not match this visitor",
            },
          });
        }

        // Single-use replay protection: reserve the jti before applying.
        const reservation = await reserveIdentityJti({
          projectId,
          jti: claims.jti,
          visitorId,
          expiresAt: claims.expiresAt,
        });

        if (reservation.status === "replay") {
          // Idempotent: same jti + same visitor → return the original result.
          const result = await loadIdentityResult(reservation.customerId);
          return res.json(result);
        }

        const result = await applyVerifiedIdentity({
          projectId,
          visitorId,
          claims,
        });
        await recordIdentityJtiResult({
          projectId,
          jti: claims.jti,
          customerId: result.contact.customerId,
        });

        return res.json(result);
      } catch (err) {
        if (err instanceof IdentityTokenError) {
          const status = err.code === "TOKEN_CLAIMS_INVALID" ? 400 : 401;
          return res.status(status).json({
            error: { code: err.code, message: err.message },
          });
        }
        throw err;
      }
    } catch (error) {
      console.error("Error in POST /customers/identify:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/conversations/:id/customer
 * Get customer context for a conversation
 * Requires authentication (for agents/dashboard)
 */
router.get(
  "/conversations/:id/customer",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid conversation ID format",
          },
        });
      }

      // Get conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select(
          "id, project_id, customer_id, visitor_id, customer_email, customer_name"
        )
        .eq("id", id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Conversation not found" },
        });
      }

      // Verify access
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", conversation.project_id)
        .single();

      const isOwner = project?.user_id === userId;

      if (!isOwner) {
        const { data: membership } = await supabaseAdmin
          .from("project_members")
          .select("id")
          .eq("project_id", conversation.project_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          return res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
          });
        }
      }

      // Try to find customer
      let customer = null;

      if (conversation.customer_id) {
        const { data: customerData } = await supabaseAdmin
          .from("customers")
          .select(
            `id, visitor_id, email, name, phone, first_seen_at, last_seen_at, total_conversations, is_flagged, ${CUSTOMER_IDENTITY_EMBED}`
          )
          .eq("id", conversation.customer_id)
          .single();

        customer = customerData;
      } else if (conversation.visitor_id) {
        // Try to find by visitor ID
        const { data: customerData } = await supabaseAdmin
          .from("customers")
          .select(
            `id, visitor_id, email, name, phone, first_seen_at, last_seen_at, total_conversations, is_flagged, ${CUSTOMER_IDENTITY_EMBED}`
          )
          .eq("project_id", conversation.project_id)
          .eq("visitor_id", conversation.visitor_id)
          .single();

        customer = customerData;
      }

      // Total messages across this customer's conversations (the inbox "Messages"
      // stat). One aggregate read; a customer has few conversations so summing in
      // JS is fine and avoids needing a DB function.
      let totalMessageCount = 0;
      if (customer?.id) {
        const { data: convoCounts } = await supabaseAdmin
          .from("conversations")
          .select("message_count")
          .eq("customer_id", customer.id);
        totalMessageCount = (convoCounts || []).reduce(
          (sum: number, c: { message_count: number | null }) =>
            sum + (c.message_count || 0),
          0
        );
      }

      // Get previous conversations for this customer/visitor
      const prevConversationsQuery = supabaseAdmin
        .from("conversations")
        .select(
          "id, status, created_at, resolved_at, message_count, metadata, assigned_agent_id"
        )
        .eq("project_id", conversation.project_id)
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (customer) {
        prevConversationsQuery.eq("customer_id", customer.id);
      } else if (conversation.visitor_id) {
        prevConversationsQuery.eq("visitor_id", conversation.visitor_id);
      }

      const { data: previousConversations } = await prevConversationsQuery;
      const previousAgentIds = [
        ...new Set(
          (previousConversations ?? [])
            .map((previous) => previous.assigned_agent_id)
            .filter((agentId): agentId is string => Boolean(agentId))
        ),
      ];
      const previousAgentNames = new Map<string, string>();
      if (previousAgentIds.length > 0) {
        const { data: members, error: memberError } = await supabaseAdmin
          .from("project_members")
          .select("user_id, name")
          .eq("project_id", conversation.project_id)
          .in("user_id", previousAgentIds);
        if (memberError) throw memberError;
        for (const member of members ?? []) {
          previousAgentNames.set(member.user_id, member.name || "Agent");
        }
      }

      // Fetch project settings to get configured qualifying questions
      const { data: projectData } = await supabaseAdmin
        .from("projects")
        .select("settings")
        .eq("id", conversation.project_id)
        .single();

      const leadCaptureSettings = projectData?.settings?.lead_capture_v2;
      // Only surface the "here's what to ask" prompt while lead capture is actually enabled. The
      // historical leadData below is returned regardless, so a project that has since turned lead
      // capture off still shows what earlier conversations captured — it just stops prompting.
      const configuredQuestions = leadCaptureSettings?.enabled
        ? leadCaptureSettings.qualifying_questions?.filter(
            (q: { enabled: boolean; question: string }) =>
              q.enabled && q.question?.trim()
          ) || []
        : [];

      // Fetch lead capture data for this conversation/customer
      let leadData = null;
      const leadQuery = supabaseAdmin
        .from("qualified_leads")
        .select(
          "id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, first_message, form_submitted_at"
        )
        .eq("project_id", conversation.project_id);

      // Try to find by conversation_id first, then by customer_id, then by visitor_id
      if (conversation.id) {
        const { data: leadByConv } = await leadQuery
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (leadByConv) {
          leadData = leadByConv;
        }
      }

      if (!leadData && customer?.id) {
        const { data: leadByCustomer } = await supabaseAdmin
          .from("qualified_leads")
          .select(
            "id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, first_message, form_submitted_at"
          )
          .eq("project_id", conversation.project_id)
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (leadByCustomer) {
          leadData = leadByCustomer;
        }
      }

      if (!leadData && conversation.visitor_id) {
        const { data: leadByVisitor } = await supabaseAdmin
          .from("qualified_leads")
          .select(
            "id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, first_message, form_submitted_at"
          )
          .eq("project_id", conversation.project_id)
          .eq("visitor_id", conversation.visitor_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (leadByVisitor) {
          leadData = leadByVisitor;
        }
      }

      res.json({
        customer: customer
          ? { ...serializeCustomer(customer), totalMessageCount }
          : null,
        currentConversation: {
          visitorId: conversation.visitor_id,
          customerEmail: conversation.customer_email,
          customerName: conversation.customer_name,
        },
        previousConversations: (previousConversations || []).map((c) => ({
          id: c.id,
          status: c.status,
          createdAt: c.created_at,
          resolvedAt: c.resolved_at,
          messageCount: c.message_count,
          closeReason:
            (c.metadata as Record<string, unknown> | null)?.close_reason ??
            null,
          assignedAgent: c.assigned_agent_id
            ? {
                id: c.assigned_agent_id,
                name: previousAgentNames.get(c.assigned_agent_id) ?? "Agent",
              }
            : null,
        })),
        leadData: leadData
          ? {
              id: leadData.id,
              email: leadData.email,
              formData: leadData.form_data || {},
              qualifyingAnswers: leadData.qualifying_answers || [],
              lateQualifyingAnswers: leadData.late_qualifying_answers || [],
              qualificationStatus: leadData.qualification_status,
              qualificationReasoning: leadData.qualification_reasoning || null,
              firstMessage: leadData.first_message,
              formSubmittedAt: leadData.form_submitted_at,
            }
          : null,
        // Include configured qualifying questions so agents can see what to ask
        configuredQuestions: configuredQuestions.map(
          (q: { question: string }) => q.question
        ),
      });
    } catch (error) {
      console.error("Error in GET /conversations/:id/customer:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/projects/:id/customers
 * List customers for a project
 * Requires authentication
 */
router.get(
  "/projects/:id/customers",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req as AuthenticatedRequest;
      const { id: projectId } = req.params;

      if (!isValidUUID(projectId)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid project ID format" },
        });
      }

      // Verify access
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, user_id")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (!project) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const isOwner = project.user_id === userId;

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

      // Parse query params
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      // Build query
      let query = supabaseAdmin
        .from("customers")
        .select(`*, ${CUSTOMER_IDENTITY_EMBED}`, { count: "exact" })
        .eq("project_id", projectId)
        .not("visitor_id", "like", "merged:%") // Exclude merged (tombstoned) records
        .not("visitor_id", "like", "detached:%") // Exclude device-detached tombstones
        .order("last_seen_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const { data: customers, count, error } = await query;

      if (error) {
        console.error("Error fetching customers:", error);
        return res.status(500).json({
          error: { code: "FETCH_ERROR", message: "Failed to fetch customers" },
        });
      }

      res.json({
        customers: (customers || []).map(serializeCustomer),
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: offset + limit < (count || 0),
        },
      });
    } catch (error) {
      console.error("Error in GET /projects/:id/customers:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }
  }
);

/**
 * GET /api/customers/:id
 * Get customer details by ID
 * Requires authentication
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid customer ID format" },
      });
    }

    // Get customer
    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select(`*, ${CUSTOMER_IDENTITY_EMBED}`)
      .eq("id", id)
      .single();

    if (error || !customer) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Customer not found" },
      });
    }

    // Verify access to the project
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", customer.project_id)
      .single();

    const isOwner = project?.user_id === userId;

    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from("project_members")
        .select("id")
        .eq("project_id", customer.project_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }
    }

    // Get recent conversations
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select(
        "id, status, created_at, resolved_at, message_count, assigned_agent_id"
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    res.json({
      customer: serializeCustomer(customer),
      conversations: (conversations || []).map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.created_at,
        resolvedAt: c.resolved_at,
        messageCount: c.message_count,
        assignedAgentId: c.assigned_agent_id,
      })),
    });
  } catch (error) {
    console.error("Error in GET /customers/:id:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * PUT /api/customers/:id
 * Update customer details
 * Requires authentication
 */
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid customer ID format" },
      });
    }

    // Validate body
    const UpdateSchema = z.object({
      name: z.string().max(100).optional(),
      email: z.string().email().optional(),
      isFlagged: z.boolean().optional(),
    });

    const validation = UpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
      });
    }

    // Get customer
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (!customer) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Customer not found" },
      });
    }

    // Verify access
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("id", customer.project_id)
      .single();

    const isOwner = project?.user_id === userId;

    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from("project_members")
        .select("id")
        .eq("project_id", customer.project_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership) {
        return res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }
    }

    // Update customer
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validation.data.name !== undefined) updates.name = validation.data.name;
    if (validation.data.email !== undefined)
      updates.email = validation.data.email;
    if (validation.data.isFlagged !== undefined) {
      updates.is_flagged = validation.data.isFlagged;
      // Record who flagged (for the audit FK); clear it when unflagging.
      updates.flagged_by = validation.data.isFlagged ? userId : null;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select(`*, ${CUSTOMER_IDENTITY_EMBED}`)
      .single();

    if (updateError) {
      console.error("Error updating customer:", updateError);
      return res.status(500).json({
        error: { code: "UPDATE_ERROR", message: "Failed to update customer" },
      });
    }

    res.json({ customer: serializeCustomer(updated) });
  } catch (error) {
    console.error("Error in PUT /customers/:id:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as customersRouter };
