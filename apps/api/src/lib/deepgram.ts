/**
 * Deepgram Client
 *
 * Initializes and exports the Deepgram client for voice services.
 * Used for both Speech-to-Text (STT) and Text-to-Speech (TTS).
 */

import { createClient } from "@deepgram/sdk";

if (!process.env.DEEPGRAM_API_KEY) {
  console.warn(
    "Warning: DEEPGRAM_API_KEY is not set. Voice features will not work."
  );
}

export const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

/**
 * Available Aura-2 TTS voices
 */
export const AVAILABLE_VOICES = [
  { id: "aura-2-thalia-en", name: "Thalia", gender: "female", accent: "American" },
  { id: "aura-2-luna-en", name: "Luna", gender: "female", accent: "American" },
  { id: "aura-2-stella-en", name: "Stella", gender: "female", accent: "American" },
  { id: "aura-2-athena-en", name: "Athena", gender: "female", accent: "British" },
  { id: "aura-2-hera-en", name: "Hera", gender: "female", accent: "American" },
  { id: "aura-2-orion-en", name: "Orion", gender: "male", accent: "American" },
  { id: "aura-2-arcas-en", name: "Arcas", gender: "male", accent: "American" },
  { id: "aura-2-perseus-en", name: "Perseus", gender: "male", accent: "American" },
  { id: "aura-2-angus-en", name: "Angus", gender: "male", accent: "Irish" },
  { id: "aura-2-orpheus-en", name: "Orpheus", gender: "male", accent: "American" },
] as const;

export type VoiceId = (typeof AVAILABLE_VOICES)[number]["id"];

/**
 * Default voice settings
 */
export const DEFAULT_VOICE_ID: VoiceId = "aura-2-thalia-en";
export const DEFAULT_VOICE_GREETING = "Hi! How can I help you today?";

/**
 * Voice feature configuration
 */
export const VOICE_CONFIG = {
  maxDurationSeconds: parseInt(process.env.VOICE_CHAT_MAX_DURATION_SECONDS || "300", 10),
  enabled: !!process.env.DEEPGRAM_API_KEY && process.env.VOICE_CHAT_ENABLED !== "false",
};
