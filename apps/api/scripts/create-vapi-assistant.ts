/**
 * Create Vapi Assistant (One-Time Setup Script)
 *
 * Creates a persistent Vapi assistant with:
 * - GPT-4o-mini model (Vapi-managed)
 * - ElevenLabs voice
 * - Deepgram Nova-2 transcriber
 * - Custom Knowledge Base pointing to our webhook
 * - Server tools: captureLead, handoffToHuman
 * - Template variables for multi-tenant overrides
 *
 * Usage:
 *   VAPI_PRIVATE_KEY=... API_BASE_URL=... npx tsx apps/api/scripts/create-vapi-assistant.ts
 */

const VAPI_API_URL = "https://api.vapi.ai";
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;
const API_BASE_URL = process.env.API_BASE_URL || "https://api.frontface.app";

if (!VAPI_PRIVATE_KEY) {
  console.error("Error: VAPI_PRIVATE_KEY environment variable is required");
  process.exit(1);
}

async function createAssistant() {
  console.log("Creating Vapi assistant...");
  console.log(`Server URL: ${API_BASE_URL}/api/vapi/webhook`);

  const assistantConfig = {
    name: "FrontFace Voice Agent",
    model: {
      provider: process.env.VAPI_LLM_PROVIDER || "openai",
      model: process.env.VAPI_LLM_MODEL || "gpt-4o-mini",
      temperature: parseFloat(process.env.VAPI_LLM_TEMPERATURE || "0.3"),
      maxTokens: parseInt(process.env.VAPI_LLM_MAX_TOKENS || "200"),
      messages: [
        {
          role: "system",
          content: `You are {{companyName}}'s voice assistant — friendly, knowledgeable, and naturally conversational. You sound like a helpful team member, not a robot.

{{systemPrompt}}

Voice conversation rules:
- Keep responses to one to three sentences. The caller is listening, not reading.
- Be warm and conversational — use contractions, simple words, natural phrasing.
- Speak numbers naturally: say "about two hundred" not "200", say "fifteen percent" not "15%".
- Never use markdown, bullet points, or text formatting — speak naturally.
- If you don't know something, say so honestly and offer to help find the answer.
- When the caller asks a question, check the knowledge base first before responding.
- If the caller shares contact info, save it so the team can follow up.
- If the caller wants to speak with a real person, or seems frustrated, connect them to the team.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "captureLead",
            description:
              "Save the caller's contact information so the team can follow up. Use this when the caller shares their name, email, or phone number — either because you asked or because they volunteered it. Be proactive: if they mention their email in passing (e.g., 'you can reach me at john@example.com'), capture it immediately.",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The caller's name (first and/or last)",
                },
                email: {
                  type: "string",
                  description: "The caller's email address",
                },
                phone: {
                  type: "string",
                  description: "The caller's phone number",
                },
              },
            },
          },
          server: {
            url: `${API_BASE_URL}/api/vapi/webhook`,
          },
        },
        {
          type: "function",
          function: {
            name: "handoffToHuman",
            description:
              "Connect the caller to a human team member. Use this when: (1) the caller asks to speak with a real person, (2) the caller seems frustrated or unhappy with the conversation, (3) the question is too complex or sensitive for you to handle, or (4) the caller needs help with something outside your knowledge. It's always better to hand off than to give a bad answer.",
            parameters: {
              type: "object",
              properties: {
                reason: {
                  type: "string",
                  description: "Brief summary of why the caller needs human help and what they were asking about",
                },
              },
            },
          },
          server: {
            url: `${API_BASE_URL}/api/vapi/webhook`,
          },
        },
      ],
    },
    voice: {
      provider: process.env.VAPI_TTS_PROVIDER || "deepgram",
      voiceId: process.env.VAPI_TTS_VOICE_ID || "apollo",
      model: process.env.VAPI_TTS_MODEL || "aura-2",
      // ElevenLabs-specific fields (ignored by Deepgram)
      ...(process.env.VAPI_TTS_PROVIDER === "11labs" && {
        stability: 0.5,
        similarityBoost: 0.75,
        optimizeStreamingLatency: 4,
      }),
    },
    transcriber: {
      provider: process.env.VAPI_STT_PROVIDER || "deepgram",
      model: process.env.VAPI_STT_MODEL || "nova-2",
      language: process.env.VAPI_STT_LANGUAGE || "en",
      smartFormat: true,
    },
    firstMessage: "{{greeting}}",
    firstMessageMode: "assistant-speaks-first",
    endCallMessage: "Thanks for calling! Have a great day.",
    endCallFunctionEnabled: true,
    maxDurationSeconds: parseInt(process.env.VAPI_MAX_DURATION_SECONDS || "600"),
    backgroundSound: process.env.VAPI_BACKGROUND_SOUND || "office",
    backgroundDenoisingEnabled: true,
    server: {
      url: `${API_BASE_URL}/api/vapi/webhook`,
      timeoutSeconds: 20,
    },
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
    analysisPlan: {
      summaryPlan: {
        enabled: true,
        messages: [
          {
            role: "system",
            content: "Summarize the voice call in 2-3 concise sentences. Focus on what the customer asked about and whether their question was resolved.",
          },
        ],
      },
    },
  };

  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assistantConfig),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to create assistant: ${response.status}`);
      console.error(errorBody);
      process.exit(1);
    }

    const assistant = await response.json();

    console.log("\nAssistant created successfully!");
    console.log(`  ID: ${assistant.id}`);
    console.log(`  Name: ${assistant.name}`);
    console.log("\nAdd this to your .env file:");
    console.log(`  VAPI_ASSISTANT_ID=${assistant.id}`);

    // Also create the custom knowledge base
    console.log("\nCreating custom knowledge base...");

    const kbResponse = await fetch(`${VAPI_API_URL}/knowledge-base`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "custom-knowledge-base",
        name: "FrontFace Knowledge Base",
        server: {
          url: `${API_BASE_URL}/api/vapi/webhook`,
        },
      }),
    });

    if (kbResponse.ok) {
      const kb = await kbResponse.json();
      console.log(`  Knowledge Base ID: ${kb.id}`);
      console.log("\nNow update the assistant to use this knowledge base:");
      console.log(`  model.knowledgeBaseId = "${kb.id}"`);

      // Update assistant with KB
      const updateResponse = await fetch(
        `${VAPI_API_URL}/assistant/${assistant.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: {
              ...assistantConfig.model,
              knowledgeBaseId: kb.id,
            },
          }),
        }
      );

      if (updateResponse.ok) {
        console.log("  Assistant updated with knowledge base.");
      }
    } else {
      console.warn("  Failed to create knowledge base (non-critical):");
      console.warn("  ", await kbResponse.text());
    }

    console.log("\nSetup complete!");
  } catch (error) {
    console.error("Error creating assistant:", error);
    process.exit(1);
  }
}

createAssistant();
