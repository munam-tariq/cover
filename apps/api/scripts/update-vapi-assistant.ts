/**
 * Update Vapi Assistant — Sync full config from .env
 *
 * Patches the existing assistant with:
 * - LLM provider/model (e.g. Google Gemini 2.5 Flash)
 * - TTS voice (e.g. Deepgram Apollo Aura 2)
 * - STT transcriber (e.g. Deepgram Nova 3)
 * - Background sound, max duration
 * - serverMessages + clientMessages
 *
 * Usage:
 *   npx tsx apps/api/scripts/update-vapi-assistant.ts
 *
 * Requires these env vars (reads from apps/api/.env):
 *   VAPI_PRIVATE_KEY, VAPI_ASSISTANT_ID
 *   VAPI_LLM_PROVIDER, VAPI_LLM_MODEL, VAPI_LLM_TEMPERATURE, VAPI_LLM_MAX_TOKENS
 *   VAPI_TTS_PROVIDER, VAPI_TTS_VOICE_ID, VAPI_TTS_MODEL
 *   VAPI_STT_PROVIDER, VAPI_STT_MODEL, VAPI_STT_LANGUAGE
 *   VAPI_MAX_DURATION_SECONDS, VAPI_BACKGROUND_SOUND
 */

import "dotenv/config";

const VAPI_API_URL = "https://api.vapi.ai";
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

if (!VAPI_PRIVATE_KEY) {
  console.error("Error: VAPI_PRIVATE_KEY is required");
  process.exit(1);
}

if (!VAPI_ASSISTANT_ID) {
  console.error("Error: VAPI_ASSISTANT_ID is required");
  process.exit(1);
}

async function updateAssistant() {
  console.log(`Updating assistant ${VAPI_ASSISTANT_ID}...`);

  // Fetch current assistant config
  const getResponse = await fetch(`${VAPI_API_URL}/assistant/${VAPI_ASSISTANT_ID}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
    },
  });

  if (!getResponse.ok) {
    console.error(`Failed to fetch assistant: ${getResponse.status}`);
    console.error(await getResponse.text());
    process.exit(1);
  }

  const current = await getResponse.json();

  // Build env-based config
  const llmProvider = process.env.VAPI_LLM_PROVIDER || "openai";
  const llmModel = process.env.VAPI_LLM_MODEL || "gpt-4o-mini";
  const ttsProvider = process.env.VAPI_TTS_PROVIDER || "deepgram";
  const ttsVoiceId = process.env.VAPI_TTS_VOICE_ID || "apollo";
  const ttsModel = process.env.VAPI_TTS_MODEL || "aura-2";
  const sttProvider = process.env.VAPI_STT_PROVIDER || "deepgram";
  const sttModel = process.env.VAPI_STT_MODEL || "nova-3";
  const sttLanguage = process.env.VAPI_STT_LANGUAGE || "en";
  const maxDuration = parseInt(process.env.VAPI_MAX_DURATION_SECONDS || "600");
  const backgroundSound = process.env.VAPI_BACKGROUND_SOUND || "office";

  // Show current → new diff
  console.log("\n--- Current Config ---");
  console.log(`  LLM: ${current.model?.provider}/${current.model?.model}`);
  console.log(`  TTS: ${current.voice?.provider}/${current.voice?.voiceId} (${current.voice?.model || "default"})`);
  console.log(`  STT: ${current.transcriber?.provider}/${current.transcriber?.model}`);
  console.log(`  Background: ${current.backgroundSound || "off"}`);
  console.log(`  Max duration: ${current.maxDurationSeconds}s`);
  console.log(`  serverMessages: ${JSON.stringify(current.serverMessages)}`);

  console.log("\n--- New Config (from .env) ---");
  console.log(`  LLM: ${llmProvider}/${llmModel}`);
  console.log(`  TTS: ${ttsProvider}/${ttsVoiceId} (${ttsModel})`);
  console.log(`  STT: ${sttProvider}/${sttModel}`);
  console.log(`  Background: ${backgroundSound}`);
  console.log(`  Max duration: ${maxDuration}s`);

  // Build patch payload — preserve existing model.messages and model.tools
  const patchPayload: Record<string, unknown> = {
    model: {
      ...current.model,
      provider: llmProvider,
      model: llmModel,
      temperature: parseFloat(process.env.VAPI_LLM_TEMPERATURE || "0.3"),
      maxTokens: parseInt(process.env.VAPI_LLM_MAX_TOKENS || "200"),
    },
    voice: {
      provider: ttsProvider,
      voiceId: ttsVoiceId,
      model: ttsModel,
      ...(ttsProvider === "11labs" && {
        stability: 0.5,
        similarityBoost: 0.75,
        optimizeStreamingLatency: 4,
      }),
    },
    transcriber: {
      provider: sttProvider,
      model: sttModel,
      language: sttLanguage,
      smartFormat: true,
    },
    maxDurationSeconds: maxDuration,
    backgroundSound,
    backgroundDenoisingEnabled: true,
    serverMessages: [
      "end-of-call-report",
      "status-update",
      "tool-calls",
      "transcript",
    ],
    clientMessages: [
      "transcript",
      "speech-update",
      "status-update",
      "conversation-update",
    ],
  };

  const patchResponse = await fetch(`${VAPI_API_URL}/assistant/${VAPI_ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchPayload),
  });

  if (!patchResponse.ok) {
    console.error(`Failed to update assistant: ${patchResponse.status}`);
    console.error(await patchResponse.text());
    process.exit(1);
  }

  const updated = await patchResponse.json();
  console.log("\nAssistant updated successfully!");
  console.log(`  LLM: ${updated.model?.provider}/${updated.model?.model}`);
  console.log(`  TTS: ${updated.voice?.provider}/${updated.voice?.voiceId} (${updated.voice?.model})`);
  console.log(`  STT: ${updated.transcriber?.provider}/${updated.transcriber?.model}`);
  console.log(`  Background: ${updated.backgroundSound}`);
  console.log(`  Max duration: ${updated.maxDurationSeconds}s`);
}

updateAssistant().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
