/**
 * Lead Capture V2 Routes
 *
 * Public routes (widget):
 *   POST /api/chat/lead-capture/submit-form - Submit lead capture form
 *   POST /api/chat/lead-capture/skip       - Skip lead capture form
 *   GET  /api/chat/lead-capture/status      - Check returning user status
 *
 * Dashboard routes (auth required):
 *   GET  /api/projects/:id/leads           - List leads for a project
 */

import { Router, Request, Response } from "express";

import { logger } from "../lib/logger";
import { posthog } from "../lib/posthog";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { requirePublicWidgetAccess } from "../middleware/public-widget-gate";
import { chatRateLimiter } from "../middleware/rate-limit";
import type { ChatSource } from "../services/chat-engine";
import { getOrCreateConversation } from "../services/conversation";
import {
  resolveGreetingLanguage,
  projectLanguageDefault,
} from "../services/language";
import { isValidEmail } from "../services/lead-capture-v2";
import {
  submitLeadForm,
  submitInlineEmail,
  getLeadCaptureStatus,
  skipLeadForm,
  deferLeadCapture,
  updateVisitCount,
} from "../services/lead-capture-v2";
import { issueWidgetSessionToken } from "../services/widget-session-token";

import { buildGreeting } from "./embed";

const LEAD_SOURCES: ChatSource[] = [
  "widget",
  "playground",
  "mcp",
  "api",
  "voice",
  "public",
  "mobile",
];

const TRANSITION_MESSAGES = [
  "I just have a quick question to better understand your needs.",
  "Let me ask you something quick so I can guide you properly.",
  "Before we continue, I just need one quick detail.",
  "To make sure I give you the right info, I need to ask:",
  "Quick question so I can help you better:",
];

export const leadCaptureRouter = Router();

// Public widget gate (monitor mode by default; WIDGET_GATE_ENFORCE to fail closed).
const bodyGate = (action: string) =>
  requirePublicWidgetAccess({ action, projectIdSource: "body" });
const queryGate = (action: string) =>
  requirePublicWidgetAccess({ action, projectIdSource: "query" });

// ─── Public Widget Routes ─────────────────────────────────────────────────────

/**
 * POST /api/chat/lead-capture/submit-form
 *
 * Called by the widget when user submits the lead capture form.
 */
leadCaptureRouter.post(
  "/lead-capture/submit-form",
  bodyGate("lead-submit-form"),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const {
        projectId,
        visitorId,
        sessionId,
        formData,
        firstMessage,
        source,
      } = req.body;
      const leadSource: ChatSource = LEAD_SOURCES.includes(source as ChatSource)
        ? (source as ChatSource)
        : "widget";

      // Validate required fields
      // Note: formData.email may be empty during progressive profiling
      // (email already captured inline). submitLeadForm() handles the lookup.
      if (!projectId || !visitorId || !formData) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId, visitorId, and formData are required",
          },
        });
      }

      // Validate email format only if email is provided
      // (empty email is OK for progressive profiling — inline email was already captured)
      if (formData.email && !isValidEmail(formData.email)) {
        return res.status(400).json({
          error: {
            code: "INVALID_EMAIL",
            message: "Please provide a valid email address",
          },
        });
      }

      const result = await submitLeadForm(
        projectId,
        visitorId,
        sessionId || null,
        formData,
        firstMessage || ""
      );

      if (!result.success) {
        return res.json(result);
      }

      // Track the captured lead (server-side: the widget visitor is not a
      // PostHog client, so key the event on the stable visitor id).
      posthog?.capture({
        distinctId: visitorId,
        event: "lead_captured",
        properties: {
          project_id: projectId,
          source: leadSource,
          lead_id: result.leadId,
        },
      });

      // Build the assembled greeting for DOM display only (not persisted to DB).
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("name, company_name, settings")
        .eq("id", projectId)
        .maybeSingle();

      const greetingLang = resolveGreetingLanguage(
        projectLanguageDefault(project?.settings as Record<string, unknown>)
      ).base;
      const greeting = buildGreeting(
        project?.name,
        project?.company_name,
        greetingLang
      );
      let assembledGreeting: string;

      if (
        result.nextAction === "qualifying_question" &&
        result.qualifyingQuestion
      ) {
        const transition =
          TRANSITION_MESSAGES[
            Math.floor(Math.random() * TRANSITION_MESSAGES.length)
          ];
        assembledGreeting = `${greeting.intro}\n${transition}\n${result.qualifyingQuestion}`;
      } else {
        assembledGreeting = greeting.full;
      }

      // When a qualifying question follows, persist it as an assistant message and return the
      // conversation id. Previously the question was UI-only, so a page reload (which rehydrates
      // from the DB) dropped it while the backend stayed mid-qualifying — the visitor lost the
      // question they were expected to answer. In email_first mode no conversation exists yet,
      // so create one here and hand its id back to the client.
      let resolvedSessionId: string | null = sessionId || null;
      if (result.nextAction === "qualifying_question") {
        try {
          resolvedSessionId = await getOrCreateConversation(
            projectId,
            visitorId,
            sessionId || undefined,
            leadSource
          );
          const { error: msgError } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id: resolvedSessionId,
              sender_type: "ai",
              content: assembledGreeting,
              metadata: { lead_capture_question: true },
            });
          if (msgError) {
            logger.error("Failed to persist qualifying question", msgError, {
              projectId,
              visitorId,
            });
          }

          // Backfill the lead's conversation_id. In email_first mode the lead row was inserted
          // with conversation_id=null (no conversation existed yet); without this the lead is
          // never linked to its conversation and source-filtered lead analytics exclude it.
          if (result.leadId && resolvedSessionId) {
            const { error: linkError } = await supabaseAdmin
              .from("qualified_leads")
              .update({ conversation_id: resolvedSessionId })
              .eq("id", result.leadId)
              .is("conversation_id", null);
            if (linkError) {
              logger.error(
                "Failed to backfill lead conversation_id",
                linkError,
                {
                  projectId,
                  visitorId,
                  leadId: result.leadId,
                }
              );
            }
          }
        } catch (persistErr) {
          // Non-fatal: the question still renders in the client response below.
          logger.error(
            "Failed to ensure conversation for qualifying question",
            persistErr,
            {
              projectId,
              visitorId,
            }
          );
        }
      }

      res.json({
        ...result,
        assembledGreeting,
        sessionId: resolvedSessionId,
        // Authorize the conversation this lead form just created/continued (a lead-first
        // conversation otherwise has no session token until the first chat message).
        sessionToken: resolvedSessionId
          ? issueWidgetSessionToken({
              projectId,
              visitorId,
              conversationId: resolvedSessionId,
            })
          : undefined,
      });
    } catch (error) {
      logger.error("Lead form submit error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit lead capture form",
        },
      });
    }
  }
);

/**
 * POST /api/chat/lead-capture/submit-inline
 *
 * Lightweight email-only capture for inline email field (V3 cascade).
 */
leadCaptureRouter.post(
  "/lead-capture/submit-inline",
  bodyGate("lead-submit-inline"),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { projectId, visitorId, sessionId, email, captureSource } =
        req.body;

      if (!projectId || !visitorId || !email) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId, visitorId, and email are required",
          },
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: {
            code: "INVALID_EMAIL",
            message: "Please provide a valid email address",
          },
        });
      }

      const result = await submitInlineEmail(
        projectId,
        visitorId,
        sessionId || null,
        email,
        captureSource || "inline_email"
      );

      res.json({
        ...result,
        sessionToken: sessionId
          ? issueWidgetSessionToken({
              projectId,
              visitorId,
              conversationId: sessionId,
            })
          : undefined,
      });
    } catch (error) {
      logger.error("Inline email submit error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit inline email",
        },
      });
    }
  }
);

/**
 * POST /api/chat/lead-capture/skip
 *
 * Called by the widget when user clicks "Skip" on the form.
 */
leadCaptureRouter.post(
  "/lead-capture/skip",
  bodyGate("lead-skip"),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { projectId, visitorId, skipType } = req.body;

      if (!projectId || !visitorId) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId and visitorId are required",
          },
        });
      }

      await skipLeadForm(projectId, visitorId, skipType || "permanent");

      res.json({ success: true });
    } catch (error) {
      logger.error("Lead form skip error", error, { requestId: req.requestId });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to skip lead capture form",
        },
      });
    }
  }
);

/**
 * GET /api/chat/lead-capture/status
 *
 * Called by widget on init to check if returning user already completed form.
 */
leadCaptureRouter.get(
  "/lead-capture/status",
  queryGate("lead-status"),
  async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string;
      const visitorId = req.query.visitorId as string;

      if (!projectId || !visitorId) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId and visitorId are required",
          },
        });
      }

      const status = await getLeadCaptureStatus(projectId, visitorId);

      res.json(status);
    } catch (error) {
      logger.error("Lead status check error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check lead capture status",
        },
      });
    }
  }
);

// ─── V3 Recovery Routes ──────────────────────────────────────────────────────

/**
 * POST /api/chat/lead-capture/defer
 *
 * Defer lead capture (sets status to "deferred" without terminal skip).
 */
leadCaptureRouter.post(
  "/lead-capture/defer",
  bodyGate("lead-defer"),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { projectId, visitorId } = req.body;

      if (!projectId || !visitorId) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId and visitorId are required",
          },
        });
      }

      await deferLeadCapture(projectId, visitorId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Lead defer error", error, { requestId: req.requestId });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to defer lead capture",
        },
      });
    }
  }
);

/**
 * POST /api/chat/lead-capture/visit
 *
 * Increment visit count for returning visitor recovery.
 */
leadCaptureRouter.post(
  "/lead-capture/visit",
  bodyGate("lead-visit"),
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { projectId, visitorId } = req.body;

      if (!projectId || !visitorId) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId and visitorId are required",
          },
        });
      }

      const result = await updateVisitCount(projectId, visitorId);
      res.json(result);
    } catch (error) {
      logger.error("Visit count update error", error, {
        requestId: req.requestId,
      });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update visit count",
        },
      });
    }
  }
);

// ─── Dashboard Routes ─────────────────────────────────────────────────────────

export const leadsRouter = Router();

/**
 * GET /api/projects/:id/leads
 *
 * List qualified leads for a project. Auth required.
 */
leadsRouter.get(
  "/:id/leads",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.params.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;

      if (!req.userId) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        });
      }

      // Verify project ownership
      const { data: project, error: projectError } = await supabaseAdmin
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", req.userId)
        .is("deleted_at", null)
        .single();

      if (projectError || !project) {
        return res.status(404).json({
          error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        });
      }

      // Build query
      let query = supabaseAdmin
        .from("qualified_leads")
        .select("*", { count: "exact" })
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by status if provided
      if (
        status &&
        [
          "form_completed",
          "qualifying",
          "qualified",
          "not_qualified",
          "skipped",
          "deferred",
        ].includes(status)
      ) {
        query = query.eq("qualification_status", status);
      }

      const { data: leads, error, count } = await query;

      if (error) {
        throw error;
      }

      // Resolve conversation IDs for leads missing them (via customer_id)
      const leadsNeedingConv = (leads || []).filter(
        (l) => !l.conversation_id && l.customer_id
      );
      const customerIds = leadsNeedingConv.map((l) => l.customer_id);
      const convByCustomer: Record<string, string> = {};

      if (customerIds.length > 0) {
        const { data: convs } = await supabaseAdmin
          .from("conversations")
          .select("id, customer_id")
          .in("customer_id", customerIds)
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (convs) {
          for (const conv of convs) {
            // Keep the most recent conversation per customer
            if (!convByCustomer[conv.customer_id]) {
              convByCustomer[conv.customer_id] = conv.id;
            }
          }
        }
      }

      const phoneByCustomer: Record<string, string> = {};
      const allCustomerIds = (leads || [])
        .map((l) => l.customer_id)
        .filter(Boolean);

      if (allCustomerIds.length > 0) {
        const { data: customers } = await supabaseAdmin
          .from("customers")
          .select("id, phone")
          .in("id", allCustomerIds)
          .not("phone", "is", null);

        if (customers) {
          for (const c of customers) {
            if (c.phone) phoneByCustomer[c.id] = c.phone;
          }
        }
      }

      res.json({
        leads: (leads || []).map((lead) => ({
          id: lead.id,
          email: lead.email,
          phone: lead.customer_id ? (phoneByCustomer[lead.customer_id] ?? null) : null,
          formData: lead.form_data,
          qualifyingAnswers: lead.qualifying_answers,
          lateQualifyingAnswers: lead.late_qualifying_answers || [],
          qualificationStatus: lead.qualification_status,
          qualificationReasoning: lead.qualification_reasoning || null,
          captureSource: lead.capture_source || null,
          firstMessage: lead.first_message,
          conversationId:
            lead.conversation_id || convByCustomer[lead.customer_id] || null,
          customerId: lead.customer_id || null,
          formSubmittedAt: lead.form_submitted_at,
          qualificationCompletedAt: lead.qualification_completed_at,
          createdAt: lead.created_at,
        })),
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      logger.error("List leads error", error, { requestId: req.requestId });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list leads",
        },
      });
    }
  }
);
