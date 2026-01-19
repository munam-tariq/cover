import { Router } from "express";
import { domainWhitelistMiddleware } from "../middleware/domain-whitelist";

export const embedRouter = Router();

// Get embed code for a project
embedRouter.get("/code/:projectId", async (req, res) => {
  const { projectId } = req.params;

  const embedCode = `<script src="${process.env.CDN_URL || "https://cdn.chatbot.example"}/widget.js" data-chatbot-id="${projectId}"></script>`;

  res.json({
    projectId,
    embedCode,
    cdnUrl: process.env.CDN_URL || "https://cdn.chatbot.example",
  });
});

// Get widget configuration
embedRouter.get(
  "/config/:projectId",
  domainWhitelistMiddleware({ requireDomain: false, projectIdSource: 'params' }),
  async (req, res) => {
  const { projectId } = req.params;

  // Return widget config including Supabase credentials for realtime
  res.json({
    projectId,
    config: {
      primaryColor: "#000000",
      position: "bottom-right",
      greeting: "Hello! How can I help you today?",
      placeholder: "Type a message...",
    },
    // Supabase credentials for realtime (public anon key is safe to expose)
    realtime: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    },
  });
});

// Validate project ID (for widget initialization)
embedRouter.get("/validate/:projectId", async (req, res) => {
  const { projectId } = req.params;

  // TODO: Implement project validation in widget feature
  res.json({
    valid: true,
    projectId,
  });
});
