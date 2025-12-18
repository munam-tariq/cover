import { Router } from "express";

export const authRouter = Router();

// Verify auth token from Supabase
authRouter.post("/verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    // TODO: Implement token verification with Supabase in auth-system feature
    res.json({ valid: true, userId: "placeholder" });
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Get current user info
authRouter.get("/me", async (_req, res) => {
  // TODO: Implement with auth middleware in auth-system feature
  res.json({
    id: "placeholder",
    email: "user@example.com",
    createdAt: new Date().toISOString(),
  });
});
