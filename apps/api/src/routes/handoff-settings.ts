/**
 * Handoff Settings API Routes
 *
 * Handles human agent handoff configuration per project:
 * - GET /api/projects/:id/handoff-settings - Get handoff settings
 * - PUT /api/projects/:id/handoff-settings - Update handoff settings
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router({ mergeParams: true });

// ============================================================================
// Validation Schemas
// ============================================================================

const BusinessHoursDaySchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  enabled: z.boolean(),
});

const BusinessHoursSchema = z.object({
  monday: BusinessHoursDaySchema,
  tuesday: BusinessHoursDaySchema,
  wednesday: BusinessHoursDaySchema,
  thursday: BusinessHoursDaySchema,
  friday: BusinessHoursDaySchema,
  saturday: BusinessHoursDaySchema,
  sunday: BusinessHoursDaySchema,
});

// DB format for auto_triggers
const AutoTriggersDbSchema = z.object({
  low_confidence_enabled: z.boolean(),
  low_confidence_threshold: z.number().min(0).max(1),
  keywords_enabled: z.boolean(),
  keywords: z.array(z.string().min(1).max(50)).max(20),
});

// Frontend format for autoTriggers (nested)
const AutoTriggersFrontendSchema = z.object({
  lowConfidence: z.object({
    enabled: z.boolean(),
    threshold: z.number().min(0).max(1),
  }).partial().optional(),
  keywords: z.object({
    enabled: z.boolean(),
    keywords: z.array(z.string().min(1).max(50)).max(20),
  }).partial().optional(),
  customerRequest: z.object({
    enabled: z.boolean(),
  }).partial().optional(),
});

const UpdateHandoffSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  trigger_mode: z.enum(["auto", "manual", "both"]).optional(),
  triggerMode: z.enum(["auto", "manual", "both"]).optional(), // Frontend sends camelCase
  show_human_button: z.boolean().optional(),
  showHumanButton: z.boolean().optional(), // Frontend sends camelCase
  button_text: z.string().min(1).max(50).optional(),
  buttonText: z.string().min(1).max(50).optional(), // Frontend sends camelCase
  auto_triggers: AutoTriggersDbSchema.partial().optional(),
  autoTriggers: AutoTriggersFrontendSchema.partial().optional(), // Frontend sends nested camelCase
  business_hours_enabled: z.boolean().optional(),
  businessHoursEnabled: z.boolean().optional(), // Frontend sends camelCase
  timezone: z.string().min(1).max(50).optional(),
  business_hours: BusinessHoursSchema.partial().optional(),
  businessHours: BusinessHoursSchema.partial().optional(), // Frontend sends camelCase
  default_max_concurrent_chats: z.number().int().min(1).max(50).optional(),
  inactivity_timeout_minutes: z.number().int().min(1).max(60).optional(),
  auto_close_after_warning_minutes: z.number().int().min(1).max(60).optional(),
  session_keep_alive_minutes: z.number().int().min(5).max(120).optional(),
  send_inactivity_warning: z.boolean().optional(),
  // Queue & Messages settings
  assignment_mode: z.enum(["least_busy", "round_robin", "manual"]).optional(),
  assignmentMode: z.enum(["least_busy", "round_robin", "manual"]).optional(), // Frontend sends camelCase
  max_queue_size: z.number().int().min(0).max(1000).optional(),
  maxQueueSize: z.number().int().min(0).max(1000).optional(), // Frontend sends camelCase
  queue_message: z.string().max(500).optional(),
  queueMessage: z.string().max(500).optional(), // Frontend sends camelCase
  agent_joined_message: z.string().max(500).optional(),
  agentJoinedMessage: z.string().max(500).optional(), // Frontend sends camelCase
});

// ============================================================================
// Helpers
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// Transform auto_triggers from DB format to frontend format
interface DbAutoTriggers {
  low_confidence_enabled: boolean;
  low_confidence_threshold: number;
  keywords_enabled: boolean;
  keywords: string[];
}

interface FrontendAutoTriggers {
  lowConfidence: { enabled: boolean; threshold: number };
  keywords: { enabled: boolean; keywords: string[] };
  customerRequest: { enabled: boolean };
}

function transformAutoTriggersToFrontend(dbTriggers: DbAutoTriggers): FrontendAutoTriggers {
  return {
    lowConfidence: {
      enabled: dbTriggers.low_confidence_enabled,
      threshold: dbTriggers.low_confidence_threshold,
    },
    keywords: {
      enabled: dbTriggers.keywords_enabled,
      keywords: dbTriggers.keywords,
    },
    customerRequest: { enabled: true }, // Default for now
  };
}

function transformAutoTriggersToDb(frontendTriggers: FrontendAutoTriggers): DbAutoTriggers {
  return {
    low_confidence_enabled: frontendTriggers.lowConfidence?.enabled ?? true,
    low_confidence_threshold: frontendTriggers.lowConfidence?.threshold ?? 0.6,
    keywords_enabled: frontendTriggers.keywords?.enabled ?? true,
    keywords: frontendTriggers.keywords?.keywords ?? [],
  };
}

// Default handoff settings
const DEFAULT_HANDOFF_SETTINGS = {
  enabled: false,
  trigger_mode: "both" as const,
  show_human_button: false,
  button_text: "Talk to a human",
  auto_triggers: {
    low_confidence_enabled: true,
    low_confidence_threshold: 0.6,
    keywords_enabled: true,
    keywords: ["human", "agent", "person", "speak to someone", "talk to someone"],
  },
  business_hours_enabled: false,
  timezone: "UTC",
  business_hours: {
    monday: { start: "09:00", end: "17:00", enabled: true },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: false },
    sunday: { start: "09:00", end: "17:00", enabled: false },
  },
  default_max_concurrent_chats: 5,
  inactivity_timeout_minutes: 5,
  auto_close_after_warning_minutes: 5,
  session_keep_alive_minutes: 15,
  send_inactivity_warning: true,
  // Queue & Messages settings
  assignment_mode: "least_busy" as const,
  max_queue_size: 0, // 0 = unlimited
  queue_message: "Please wait while we connect you with an agent. You are number {position} in the queue.",
  agent_joined_message: "You're now connected with {agent_name}.",
};

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/projects/:id/handoff-settings
 * Get handoff settings for a project
 * Creates default settings if none exist
 */
router.get("/:id/handoff-settings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { id: projectId } = req.params;

    // Validate project ID
    if (!isValidUUID(projectId)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid project ID format" },
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

    // Get handoff settings
    let { data: settings, error: settingsError } = await supabaseAdmin
      .from("handoff_settings")
      .select("*")
      .eq("project_id", projectId)
      .single();

    // If no settings exist, create default settings
    if (settingsError?.code === "PGRST116" || !settings) {
      const { data: newSettings, error: createError } = await supabaseAdmin
        .from("handoff_settings")
        .insert({
          project_id: projectId,
          ...DEFAULT_HANDOFF_SETTINGS,
        })
        .select("*")
        .single();

      if (createError) {
        console.error("Error creating handoff settings:", createError);
        return res.status(500).json({
          error: { code: "CREATE_ERROR", message: "Failed to create handoff settings" },
        });
      }

      settings = newSettings;
    } else if (settingsError) {
      console.error("Error fetching handoff settings:", settingsError);
      return res.status(500).json({
        error: { code: "FETCH_ERROR", message: "Failed to fetch handoff settings" },
      });
    }

    // Get agent count for warning
    const { count: agentCount } = await supabaseAdmin
      .from("project_members")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "active");

    res.json({
      settings: {
        id: settings.id,
        projectId: settings.project_id,
        enabled: settings.enabled,
        triggerMode: settings.trigger_mode,
        showHumanButton: settings.show_human_button,
        buttonText: settings.button_text || DEFAULT_HANDOFF_SETTINGS.button_text,
        autoTriggers: transformAutoTriggersToFrontend(settings.auto_triggers),
        businessHoursEnabled: settings.business_hours_enabled,
        timezone: settings.timezone,
        businessHours: settings.business_hours,
        defaultMaxConcurrentChats: settings.default_max_concurrent_chats,
        inactivityTimeoutMinutes: settings.inactivity_timeout_minutes,
        autoCloseAfterWarningMinutes: settings.auto_close_after_warning_minutes,
        sessionKeepAliveMinutes: settings.session_keep_alive_minutes,
        sendInactivityWarning: settings.send_inactivity_warning,
        // Queue & Messages settings
        assignmentMode: settings.assignment_mode || DEFAULT_HANDOFF_SETTINGS.assignment_mode,
        maxQueueSize: settings.max_queue_size ?? DEFAULT_HANDOFF_SETTINGS.max_queue_size,
        queueMessage: settings.queue_message || DEFAULT_HANDOFF_SETTINGS.queue_message,
        agentJoinedMessage: settings.agent_joined_message || DEFAULT_HANDOFF_SETTINGS.agent_joined_message,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      },
      warnings: {
        noAgents: settings.enabled && (agentCount || 0) === 0,
      },
    });
  } catch (error) {
    console.error("Error in GET /projects/:id/handoff-settings:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

/**
 * PUT /api/projects/:id/handoff-settings
 * Update handoff settings for a project
 */
router.put("/:id/handoff-settings", authMiddleware, async (req: Request, res: Response) => {
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
    const validation = UpdateHandoffSettingsSchema.safeParse(req.body);
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

    // Get current settings
    const { data: currentSettings, error: fetchError } = await supabaseAdmin
      .from("handoff_settings")
      .select("*")
      .eq("project_id", projectId)
      .single();

    const updates = validation.data;
    let settingsToUpdate: Record<string, unknown> = {};

    // Map camelCase to snake_case and prepare updates
    if (updates.enabled !== undefined) settingsToUpdate.enabled = updates.enabled;
    if (updates.trigger_mode !== undefined) settingsToUpdate.trigger_mode = updates.trigger_mode;
    if (updates.triggerMode !== undefined) settingsToUpdate.trigger_mode = updates.triggerMode;
    if (updates.show_human_button !== undefined) settingsToUpdate.show_human_button = updates.show_human_button;
    if (updates.showHumanButton !== undefined) settingsToUpdate.show_human_button = updates.showHumanButton;
    if (updates.button_text !== undefined) settingsToUpdate.button_text = updates.button_text;
    if (updates.buttonText !== undefined) settingsToUpdate.button_text = updates.buttonText;
    if (updates.business_hours_enabled !== undefined) settingsToUpdate.business_hours_enabled = updates.business_hours_enabled;
    if (updates.businessHoursEnabled !== undefined) settingsToUpdate.business_hours_enabled = updates.businessHoursEnabled;
    if (updates.timezone !== undefined) settingsToUpdate.timezone = updates.timezone;
    if (updates.default_max_concurrent_chats !== undefined) settingsToUpdate.default_max_concurrent_chats = updates.default_max_concurrent_chats;
    if (updates.inactivity_timeout_minutes !== undefined) settingsToUpdate.inactivity_timeout_minutes = updates.inactivity_timeout_minutes;
    if (updates.auto_close_after_warning_minutes !== undefined) settingsToUpdate.auto_close_after_warning_minutes = updates.auto_close_after_warning_minutes;
    if (updates.session_keep_alive_minutes !== undefined) settingsToUpdate.session_keep_alive_minutes = updates.session_keep_alive_minutes;
    if (updates.send_inactivity_warning !== undefined) settingsToUpdate.send_inactivity_warning = updates.send_inactivity_warning;

    // Queue & Messages settings - map camelCase to snake_case
    if (updates.assignment_mode !== undefined) settingsToUpdate.assignment_mode = updates.assignment_mode;
    if (updates.assignmentMode !== undefined) settingsToUpdate.assignment_mode = updates.assignmentMode;
    if (updates.max_queue_size !== undefined) settingsToUpdate.max_queue_size = updates.max_queue_size;
    if (updates.maxQueueSize !== undefined) settingsToUpdate.max_queue_size = updates.maxQueueSize;
    if (updates.queue_message !== undefined) settingsToUpdate.queue_message = updates.queue_message;
    if (updates.queueMessage !== undefined) settingsToUpdate.queue_message = updates.queueMessage;
    if (updates.agent_joined_message !== undefined) settingsToUpdate.agent_joined_message = updates.agent_joined_message;
    if (updates.agentJoinedMessage !== undefined) settingsToUpdate.agent_joined_message = updates.agentJoinedMessage;

    // Handle auto_triggers - both DB format and frontend format
    const currentAutoTriggers = currentSettings?.auto_triggers || DEFAULT_HANDOFF_SETTINGS.auto_triggers;
    if (updates.auto_triggers !== undefined) {
      settingsToUpdate.auto_triggers = {
        ...currentAutoTriggers,
        ...updates.auto_triggers,
      };
    }
    // Handle frontend format (autoTriggers with nested structure)
    if (updates.autoTriggers !== undefined) {
      const frontendTriggers = updates.autoTriggers as FrontendAutoTriggers;
      settingsToUpdate.auto_triggers = {
        low_confidence_enabled: frontendTriggers.lowConfidence?.enabled ?? currentAutoTriggers.low_confidence_enabled,
        low_confidence_threshold: frontendTriggers.lowConfidence?.threshold ?? currentAutoTriggers.low_confidence_threshold,
        keywords_enabled: frontendTriggers.keywords?.enabled ?? currentAutoTriggers.keywords_enabled,
        keywords: frontendTriggers.keywords?.keywords ?? currentAutoTriggers.keywords,
      };
    }

    // Handle business_hours - both snake_case and camelCase
    const currentBusinessHours = currentSettings?.business_hours || DEFAULT_HANDOFF_SETTINGS.business_hours;
    if (updates.business_hours !== undefined) {
      settingsToUpdate.business_hours = {
        ...currentBusinessHours,
        ...updates.business_hours,
      };
    }
    if (updates.businessHours !== undefined) {
      settingsToUpdate.business_hours = {
        ...currentBusinessHours,
        ...updates.businessHours,
      };
    }

    // Validate business hours (start < end)
    if (settingsToUpdate.business_hours) {
      const hours = settingsToUpdate.business_hours as Record<string, { start: string; end: string; enabled: boolean }>;
      for (const [day, config] of Object.entries(hours)) {
        if (config.enabled && config.start >= config.end) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: `Business hours for ${day}: start time must be before end time`,
            },
          });
        }
      }
    }

    let settings;

    if (!currentSettings || fetchError?.code === "PGRST116") {
      // No settings exist, create with defaults + updates
      const { data: newSettings, error: createError } = await supabaseAdmin
        .from("handoff_settings")
        .insert({
          project_id: projectId,
          ...DEFAULT_HANDOFF_SETTINGS,
          ...settingsToUpdate,
        })
        .select("*")
        .single();

      if (createError) {
        console.error("Error creating handoff settings:", createError);
        return res.status(500).json({
          error: { code: "CREATE_ERROR", message: "Failed to create handoff settings" },
        });
      }

      settings = newSettings;
    } else {
      // Update existing settings
      const { data: updatedSettings, error: updateError } = await supabaseAdmin
        .from("handoff_settings")
        .update(settingsToUpdate)
        .eq("project_id", projectId)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error updating handoff settings:", updateError);
        return res.status(500).json({
          error: { code: "UPDATE_ERROR", message: "Failed to update handoff settings" },
        });
      }

      settings = updatedSettings;
    }

    // Auto-enable new conversations feature when handoff is enabled
    if (updates.enabled === true) {
      await supabaseAdmin
        .from("projects")
        .update({ use_new_conversations: true })
        .eq("id", projectId);
    }

    // Get agent count for warning
    const { count: agentCount } = await supabaseAdmin
      .from("project_members")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "active");

    res.json({
      settings: {
        id: settings.id,
        projectId: settings.project_id,
        enabled: settings.enabled,
        triggerMode: settings.trigger_mode,
        showHumanButton: settings.show_human_button,
        buttonText: settings.button_text || DEFAULT_HANDOFF_SETTINGS.button_text,
        autoTriggers: transformAutoTriggersToFrontend(settings.auto_triggers),
        businessHoursEnabled: settings.business_hours_enabled,
        timezone: settings.timezone,
        businessHours: settings.business_hours,
        defaultMaxConcurrentChats: settings.default_max_concurrent_chats,
        inactivityTimeoutMinutes: settings.inactivity_timeout_minutes,
        autoCloseAfterWarningMinutes: settings.auto_close_after_warning_minutes,
        sessionKeepAliveMinutes: settings.session_keep_alive_minutes,
        sendInactivityWarning: settings.send_inactivity_warning,
        // Queue & Messages settings
        assignmentMode: settings.assignment_mode || DEFAULT_HANDOFF_SETTINGS.assignment_mode,
        maxQueueSize: settings.max_queue_size ?? DEFAULT_HANDOFF_SETTINGS.max_queue_size,
        queueMessage: settings.queue_message || DEFAULT_HANDOFF_SETTINGS.queue_message,
        agentJoinedMessage: settings.agent_joined_message || DEFAULT_HANDOFF_SETTINGS.agent_joined_message,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      },
      warnings: {
        noAgents: settings.enabled && (agentCount || 0) === 0,
      },
    });
  } catch (error) {
    console.error("Error in PUT /projects/:id/handoff-settings:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});

export { router as handoffSettingsRouter };
