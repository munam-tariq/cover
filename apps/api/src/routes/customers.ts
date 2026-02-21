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

const IdentifyCustomerSchema = z.object({
  visitorId: z.string().min(1).max(100),
  projectId: z.string().uuid("Invalid project ID"),
  email: z.string().email("Invalid email address"),
  name: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/customers/identify
 * Link an email to a visitor ID, creating or updating a customer record
 * This is called from the widget when a customer provides their email
 */
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

    const { visitorId, projectId, email, name, metadata } = validation.data;

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
      // Both exist - if they're different, we need to merge
      if (existingByEmail.id !== existingByVisitor.id) {
        // Merge visitor's conversations to the email customer
        await supabaseAdmin
          .from("conversations")
          .update({ customer_id: existingByEmail.id })
          .eq("customer_id", existingByVisitor.id);

        // Update the visitor record to point to this email
        await supabaseAdmin
          .from("customers")
          .update({
            merged_into_id: existingByEmail.id,
            updated_at: now,
          })
          .eq("id", existingByVisitor.id);

        // Update the email customer with latest visitor ID
        const { data: updated } = await supabaseAdmin
          .from("customers")
          .update({
            visitor_id: visitorId,
            name: name || existingByEmail.name,
            metadata: { ...existingByEmail.metadata, ...metadata },
            last_seen_at: now,
            updated_at: now,
          })
          .eq("id", existingByEmail.id)
          .select("*")
          .single();

        customer = updated;
      } else {
        // Same customer - just update
        const { data: updated } = await supabaseAdmin
          .from("customers")
          .update({
            name: name || existingByEmail.name,
            metadata: { ...existingByEmail.metadata, ...metadata },
            last_seen_at: now,
            updated_at: now,
          })
          .eq("id", existingByEmail.id)
          .select("*")
          .single();

        customer = updated;
      }
    } else if (existingByEmail) {
      // Customer with email exists - update with new visitor ID
      const { data: updated } = await supabaseAdmin
        .from("customers")
        .update({
          visitor_id: visitorId,
          name: name || existingByEmail.name,
          metadata: { ...existingByEmail.metadata, ...metadata },
          last_seen_at: now,
          updated_at: now,
        })
        .eq("id", existingByEmail.id)
        .select("*")
        .single();

      customer = updated;
    } else if (existingByVisitor) {
      // Customer with visitor ID exists - link email
      const { data: updated } = await supabaseAdmin
        .from("customers")
        .update({
          email,
          name: name || existingByVisitor.name,
          metadata: { ...existingByVisitor.metadata, ...metadata },
          last_seen_at: now,
          updated_at: now,
        })
        .eq("id", existingByVisitor.id)
        .select("*")
        .single();

      customer = updated;
    } else {
      // New customer
      const { data: created, error: createError } = await supabaseAdmin
        .from("customers")
        .insert({
          project_id: projectId,
          visitor_id: visitorId,
          email,
          name,
          metadata: metadata || {},
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

    res.json({
      customer: {
        id: customer.id,
        visitorId: customer.visitor_id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        firstSeenAt: customer.first_seen_at,
        lastSeenAt: customer.last_seen_at,
        conversationCount: customer.conversation_count,
        totalMessageCount: customer.total_message_count,
      },
    });
  } catch (error) {
    console.error("Error in POST /customers/identify:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

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
        .select("id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, capture_source, first_message, form_submitted_at")
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
          .select("id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, capture_source, first_message, form_submitted_at")
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
          .select("id, email, form_data, qualifying_answers, late_qualifying_answers, qualification_status, qualification_reasoning, capture_source, first_message, form_submitted_at")
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
          ? {
              id: customer.id,
              visitorId: customer.visitor_id,
              email: customer.email,
              name: customer.name,
              metadata: customer.metadata,
              firstSeenAt: customer.first_seen_at,
              lastSeenAt: customer.last_seen_at,
              conversationCount: customer.conversation_count,
              totalMessageCount: customer.total_message_count,
            }
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
              captureSource: leadData.capture_source,
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
        .is("merged_into_id", null) // Exclude merged records
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
        customers: (customers || []).map((c) => ({
          id: c.id,
          visitorId: c.visitor_id,
          email: c.email,
          name: c.name,
          firstSeenAt: c.first_seen_at,
          lastSeenAt: c.last_seen_at,
          conversationCount: c.conversation_count,
          totalMessageCount: c.total_message_count,
        })),
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
      customer: {
        id: customer.id,
        visitorId: customer.visitor_id,
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        firstSeenAt: customer.first_seen_at,
        lastSeenAt: customer.last_seen_at,
        conversationCount: customer.conversation_count,
        totalMessageCount: customer.total_message_count,
      },
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
      metadata: z.record(z.unknown()).optional(),
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
    if (validation.data.metadata !== undefined) {
      updates.metadata = { ...customer.metadata, ...validation.data.metadata };
    }

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

    res.json({
      customer: {
        id: updated.id,
        visitorId: updated.visitor_id,
        email: updated.email,
        name: updated.name,
        metadata: updated.metadata,
        firstSeenAt: updated.first_seen_at,
        lastSeenAt: updated.last_seen_at,
        conversationCount: updated.conversation_count,
        totalMessageCount: updated.total_message_count,
      },
    });
  } catch (error) {
    console.error("Error in PUT /customers/:id:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as customersRouter };
