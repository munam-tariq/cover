/**
 * Voice HTTP Routes
 *
 * REST endpoints for voice configuration and TTS preview.
 * WebSocket streaming is handled separately in voice-ws.ts
 */

import { Router, type Request, type Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { authMiddleware, projectAuthMiddleware } from "../middleware/auth";
import { textToSpeech } from "../services/deepgram-tts";
import {
  AVAILABLE_VOICES,
  VOICE_CONFIG,
  type VoiceId,
} from "../lib/deepgram";

const router = Router();

/**
 * GET /api/voice/config
 * Get voice configuration for a project (public - for widget)
 */
router.get("/config", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("voice_enabled, voice_greeting, voice_id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json({
      enabled: project.voice_enabled && VOICE_CONFIG.enabled,
      greeting: project.voice_greeting || "Hi! How can I help you today?",
      voiceId: project.voice_id || "aura-2-thalia-en",
      maxDurationSeconds: VOICE_CONFIG.maxDurationSeconds,
    });
  } catch (error) {
    console.error("Voice config error:", error);
    return res.status(500).json({ error: "Failed to get voice config" });
  }
});

/**
 * GET /api/voice/voices
 * Get list of available TTS voices
 */
router.get("/voices", (_req: Request, res: Response) => {
  return res.json({
    voices: AVAILABLE_VOICES,
    defaultVoiceId: "aura-2-thalia-en",
  });
});

/**
 * GET /api/voice/preview
 * Preview a TTS voice with sample text (protected - for dashboard)
 */
router.get(
  "/preview",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const voiceId = (req.query.voiceId as VoiceId) || "aura-2-thalia-en";
      const text =
        (req.query.text as string) || "Hi! How can I help you today?";

      // Validate voice ID
      const validVoice = AVAILABLE_VOICES.find((v) => v.id === voiceId);
      if (!validVoice) {
        return res.status(400).json({ error: "Invalid voice ID" });
      }

      // Limit text length for preview
      const previewText = text.slice(0, 200);

      // Generate TTS
      const audioBuffer = await textToSpeech(previewText, voiceId);

      // Return as audio/wav
      res.set({
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      });

      return res.send(audioBuffer);
    } catch (error) {
      console.error("Voice preview error:", error);
      return res.status(500).json({ error: "Failed to generate voice preview" });
    }
  }
);

/**
 * PATCH /api/voice/settings/:projectId
 * Update voice settings for a project (protected - for dashboard)
 */
router.patch(
  "/settings/:projectId",
  authMiddleware,
  projectAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { voice_enabled, voice_greeting, voice_id } = req.body;

      // Build update object with only provided fields
      const updates: Record<string, unknown> = {};

      if (typeof voice_enabled === "boolean") {
        updates.voice_enabled = voice_enabled;
      }

      if (typeof voice_greeting === "string") {
        // Validate greeting length
        if (voice_greeting.length > 200) {
          return res.status(400).json({
            error: "Voice greeting must be 200 characters or less",
          });
        }
        updates.voice_greeting = voice_greeting;
      }

      if (typeof voice_id === "string") {
        // Validate voice ID
        const validVoice = AVAILABLE_VOICES.find((v) => v.id === voice_id);
        if (!validVoice) {
          return res.status(400).json({ error: "Invalid voice ID" });
        }
        updates.voice_id = voice_id;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // Update project
      const { data: project, error } = await supabaseAdmin
        .from("projects")
        .update(updates)
        .eq("id", projectId)
        .select("id, voice_enabled, voice_greeting, voice_id")
        .single();

      if (error) {
        console.error("Update error:", error);
        return res.status(500).json({ error: "Failed to update voice settings" });
      }

      return res.json({
        success: true,
        project: {
          voice_enabled: project.voice_enabled,
          voice_greeting: project.voice_greeting,
          voice_id: project.voice_id,
        },
      });
    } catch (error) {
      console.error("Voice settings error:", error);
      return res.status(500).json({ error: "Failed to update voice settings" });
    }
  }
);

/**
 * GET /api/voice/settings/:projectId
 * Get voice settings for a project (protected - for dashboard)
 */
router.get(
  "/settings/:projectId",
  authMiddleware,
  projectAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const { data: project, error } = await supabaseAdmin
        .from("projects")
        .select("voice_enabled, voice_greeting, voice_id")
        .eq("id", projectId)
        .single();

      if (error || !project) {
        return res.status(404).json({ error: "Project not found" });
      }

      return res.json({
        voice_enabled: project.voice_enabled ?? false,
        voice_greeting: project.voice_greeting ?? "Hi! How can I help you today?",
        voice_id: project.voice_id ?? "aura-2-thalia-en",
        available_voices: AVAILABLE_VOICES,
        max_duration_seconds: VOICE_CONFIG.maxDurationSeconds,
        feature_enabled: VOICE_CONFIG.enabled,
      });
    } catch (error) {
      console.error("Get voice settings error:", error);
      return res.status(500).json({ error: "Failed to get voice settings" });
    }
  }
);

export const voiceRouter = router;
