/**
 * Customer API Routes
 *
 * Handles customer identification and context:
 * - POST /api/customers/identify - Link email to visitor
 * - GET /api/conversations/:id/customer - Get customer context
 * - GET /api/projects/:id/customers - List customers for a project
 * - GET /api/customers/:id - Get customer details
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

// Request body for the DISABLED POST /identify endpoint (see the handler near
// the bottom of this file for why it is commented out). Kept for easy revival.
/*
const IdentifyCustomerSchema = z.object({
  visitorId: z.string().min(1).max(100),
  projectId: z.string().uuid("Invalid project ID"),
  email: z.string().email("Invalid email address"),
  name: z.string().max(100).optional(),
});
*/

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Serialise a customer DB row into the API response shape. Centralised so every
 * endpoint returns the same fields and stays aligned with the actual schema
 * (e.g. `total_conversations`, not the non-existent `conversation_count`).
 */
function serializeCustomer(c: {
  id: string;
  visitor_id: string;
  email: string | null;
  name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  total_conversations?: number | null;
}) {
  return {
    id: c.id,
    visitorId: c.visitor_id,
    email: c.email,
    name: c.name,
    firstSeenAt: c.first_seen_at,
    lastSeenAt: c.last_seen_at,
    conversationCount: c.total_conversations ?? 0,
  };
}

// `updateCustomerRow` is used only by the DISABLED POST /identify handler below.
// It updates a customer row and returns it, throwing on any database error so
// the error is surfaced (rather than ignored, yielding an undefined row that
// crashes downstream). Preserved (commented) for when /identify is revived.
/*
async function updateCustomerRow(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Customer update failed (${id}): ${error.message}`);
  }

  return data;
}
*/

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/customers/identify — CURRENTLY DISABLED (handler commented out below).
 *
 * Purpose: link a known email/name to an anonymous visitor id, creating or
 * merging the customer record. Intended for a host app / mobile SDK that already
 * knows who its logged-in user is.
 *
 * Why it is disabled:
 *  - No first-party caller exists. The web widget never calls it (it captures
 *    emails through the lead-capture flow), and the mobile SDK that documents it
 *    (mobile-sdk/) is spec-only and has not been built yet.
 *  - It is a PUBLIC, UNAUTHENTICATED WRITE. It is mounted under `widgetCors` with
 *    no auth middleware, so anyone who knows a projectId — which ships inside the
 *    public widget snippet and is therefore trivially discoverable — could
 *    create, merge, or relabel customer rows for that project. That is a spam /
 *    data-poisoning vector with zero upside while there are no callers.
 *
 * A bare public endpoint like this is the wrong shape for identity. When it is
 * revived for a real SDK it should instead:
 *  - authenticate with the publishable client key (X-FrontFace-Key / pk_…) like
 *    the other mobile endpoints, and/or require a signed, short-lived token so
 *    identity claims cannot be forged for arbitrary projects, and
 *  - be rate-limited per project/visitor.
 *
 * The handler below is preserved (with the corrected merge + error handling that
 * fixed the original 500s) so it can be re-enabled quickly once the above is in
 * place. NOTE: re-enabling also requires uncommenting `IdentifyCustomerSchema`
 * and `updateCustomerRow` above.
 */
/*
router.post("/identify", async (req: Request, res: Response) => {
  try {
    // Validate request body
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

    const { visitorId, projectId, email, name } = validation.data;

    // Verify project exists
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

    // Check if a customer with this email already exists for this project
    const { data: existingByEmail } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("project_id", projectId)
      .eq("email", email)
      .single();

    // Check if a customer with this visitor ID exists
    const { data: existingByVisitor } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("project_id", projectId)
      .eq("visitor_id", visitorId)
      .single();

    const now = new Date().toISOString();
    let customer;

    if (existingByEmail && existingByVisitor) {
      // Both exist - if they're different, merge the visitor record into the
      // email record (the email is the stronger, longer-lived identity).
      if (existingByEmail.id !== existingByVisitor.id) {
        // 1. Re-point the visitor's conversations and leads to the email customer.
        await supabaseAdmin
          .from("conversations")
          .update({ customer_id: existingByEmail.id })
          .eq("customer_id", existingByVisitor.id);

        await supabaseAdmin
          .from("qualified_leads")
          .update({ customer_id: existingByEmail.id })
          .eq("customer_id", existingByVisitor.id);

        // 2. Tombstone the old visitor record. This frees the
        //    (project_id, visitor_id) unique slot and excludes it from listings.
        //    Must happen BEFORE the email record adopts visitorId below.
        await updateCustomerRow(existingByVisitor.id, {
          visitor_id: `merged:${existingByVisitor.id}`,
          updated_at: now,
        });

        // 3. Adopt the latest visitor id on the email record and remember the
        //    visitor ids it has absorbed.
        const mergedVisitorIds = Array.from(
          new Set([
            ...(existingByEmail.merged_visitor_ids || []),
            existingByEmail.visitor_id,
          ])
        ).filter((v: string) => v && v !== visitorId);

        customer = await updateCustomerRow(existingByEmail.id, {
          visitor_id: visitorId,
          name: name || existingByEmail.name,
          merged_visitor_ids: mergedVisitorIds,
          last_seen_at: now,
          updated_at: now,
        });
      } else {
        // Same customer - just update
        customer = await updateCustomerRow(existingByEmail.id, {
          name: name || existingByEmail.name,
          last_seen_at: now,
          updated_at: now,
        });
      }
    } else if (existingByEmail) {
      // Customer with email exists - update with new visitor ID
      customer = await updateCustomerRow(existingByEmail.id, {
        visitor_id: visitorId,
        name: name || existingByEmail.name,
        last_seen_at: now,
        updated_at: now,
      });
    } else if (existingByVisitor) {
      // Customer with visitor ID exists - link email
      customer = await updateCustomerRow(existingByVisitor.id, {
        email,
        name: name || existingByVisitor.name,
        last_seen_at: now,
        updated_at: now,
      });
    } else {
      // New customer
      const { data: created, error: createError } = await supabaseAdmin
        .from("customers")
        .insert({
          project_id: projectId,
          visitor_id: visitorId,
          email,
          name,
          first_seen_at: now,
          last_seen_at: now,
        })
        .select("*")
        .single();

      if (createError) {
        console.error("Error creating customer:", createError);
        return res.status(500).json({
          error: { code: "CREATE_ERROR", message: "Failed to create customer" },
        });
      }

      customer = created;
    }

    if (!customer) {
      console.error("identify: customer upsert returned no row", {
        projectId,
        visitorId,
      });
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    }

    // Update any conversations with this visitor ID to link to the customer
    await supabaseAdmin
      .from("conversations")
      .update({
        customer_id: customer.id,
        customer_email: email,
        customer_name: name,
      })
      .eq("project_id", projectId)
      .eq("visitor_id", visitorId);

    res.json({ customer: serializeCustomer(customer) });
  } catch (error) {
    console.error("Error in POST /customers/identify:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});
*/

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
          error: { code: "INVALID_ID", message: "Invalid conversation ID format" },
        });
      }

      // Get conversation
      const { data: conversation, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*")
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
          .select("*")
          .eq("id", conversation.customer_id)
          .single();

        customer = customerData;
      } else if (conversation.visitor_id) {
        // Try to find by visitor ID
        const { data: customerData } = await supabaseAdmin
          .from("customers")
          .select("*")
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
        .select("id, status, created_at, resolved_at, message_count")
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

      // Fetch project settings to get configured qualifying questions
      const { data: projectData } = await supabaseAdmin
        .from("projects")
        .select("settings")
        .eq("id", conversation.project_id)
        .single();

      const leadCaptureSettings = projectData?.settings?.lead_capture_v2;
      const configuredQuestions = leadCaptureSettings?.qualifying_questions?.filter(
        (q: { enabled: boolean; question: string }) => q.enabled && q.question?.trim()
      ) || [];

      // Fetch lead capture data for this conversation/customer
      let leadData = null;
      const leadQuery = supabaseAdmin
        .from("qualified_leads")
        .select("id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, first_message, form_submitted_at")
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
          .select("id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, first_message, form_submitted_at")
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
          .select("id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, first_message, form_submitted_at")
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
              captureSource: null,
              firstMessage: leadData.first_message,
              formSubmittedAt: leadData.form_submitted_at,
            }
          : null,
        // Include configured qualifying questions so agents can see what to ask
        configuredQuestions: configuredQuestions.map((q: { question: string }) => q.question),
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
        .select("*", { count: "exact" })
        .eq("project_id", projectId)
        .not("visitor_id", "like", "merged:%") // Exclude merged (tombstoned) records
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
          hasMore: (offset + limit) < (count || 0),
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
      .select("*")
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
      .select("id, status, created_at, resolved_at, message_count, assigned_agent_id")
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
    if (validation.data.email !== undefined) updates.email = validation.data.email;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select("*")
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
