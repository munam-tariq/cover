/**
 * Update Vapi Assistant — Add assistant-request + transcript to serverMessages
 *
 * This patches the existing assistant to send us:
 * - assistant-request: So we can dynamically build the system prompt with personality + qualifying Qs
 * - transcript: So we can log individual messages in real-time
 *
 * Usage:
 *   npx tsx apps/api/scripts/update-vapi-assistant.ts
 *
 * Requires these env vars (reads from apps/api/.env):
 *   VAPI_PRIVATE_KEY
 *   VAPI_ASSISTANT_ID
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

  // First, fetch the current assistant to see its config
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

  const currentAssistant = await getResponse.json();
  console.log("Current serverMessages:", currentAssistant.serverMessages);
  console.log("Current clientMessages:", currentAssistant.clientMessages);

  // Patch: Add transcript to serverMessages (for real-time logging)
  const updatedServerMessages = [
    "end-of-call-report",
    "status-update",
    "tool-calls",
    "transcript",
  ];

  // Ensure clientMessages include transcript and speech-update for the widget
  const updatedClientMessages = [
    "transcript",
    "speech-update",
    "status-update",
    "conversation-update",
  ];

  const patchResponse = await fetch(`${VAPI_API_URL}/assistant/${VAPI_ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serverMessages: updatedServerMessages,
      clientMessages: updatedClientMessages,
    }),
  });

  if (!patchResponse.ok) {
    console.error(`Failed to update assistant: ${patchResponse.status}`);
    console.error(await patchResponse.text());
    process.exit(1);
  }

  const updated = await patchResponse.json();
  console.log("\nAssistant updated successfully!");
  console.log("  serverMessages:", updated.serverMessages);
  console.log("  clientMessages:", updated.clientMessages);
}

updateAssistant().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
