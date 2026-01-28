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
import { chatRateLimiter } from "../middleware/rate-limit";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import {
  submitLeadForm,
  getLeadCaptureStatus,
  skipLeadForm,
} from "../services/lead-capture-v2";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";
import { isValidEmail } from "../services/lead-capture";

export const leadCaptureRouter = Router();

// ─── Public Widget Routes ─────────────────────────────────────────────────────

/**
 * POST /api/chat/lead-capture/submit-form
 *
 * Called by the widget when user submits the lead capture form.
 */
leadCaptureRouter.post(
  "/lead-capture/submit-form",
  chatRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { projectId, visitorId, sessionId, formData, firstMessage } = req.body;

      // Validate required fields
      if (!projectId || !visitorId || !formData?.email) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "projectId, visitorId, and formData.email are required",
          },
        });
      }

      // Validate email format
      if (!isValidEmail(formData.email)) {
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

      res.json(result);
    } catch (error) {
      logger.error("Lead form submit error", error, { requestId: req.requestId });
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
 * POST /api/chat/lead-capture/skip
 *
 * Called by the widget when user clicks "Skip" on the form.
 */
leadCaptureRouter.post(
  "/lead-capture/skip",
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

      await skipLeadForm(projectId, visitorId);

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
      logger.error("Lead status check error", error, { requestId: req.requestId });
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check lead capture status",
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
      if (status && ["form_completed", "qualifying", "qualified", "skipped"].includes(status)) {
        query = query.eq("qualification_status", status);
      }

      const { data: leads, error, count } = await query;

      if (error) {
        throw error;
      }

      res.json({
        leads: (leads || []).map((lead) => ({
          id: lead.id,
          email: lead.email,
          formData: lead.form_data,
          qualifyingAnswers: lead.qualifying_answers,
          qualificationStatus: lead.qualification_status,
          firstMessage: lead.first_message,
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
