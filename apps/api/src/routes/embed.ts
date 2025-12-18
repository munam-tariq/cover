import { Router } from "express";

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
embedRouter.get("/config/:projectId", async (req, res) => {
  const { projectId } = req.params;

  // TODO: Implement widget customization in widget-customization feature
  res.json({
    projectId,
    config: {
      primaryColor: "#000000",
      position: "bottom-right",
      greeting: "Hello! How can I help you today?",
      placeholder: "Type a message...",
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
