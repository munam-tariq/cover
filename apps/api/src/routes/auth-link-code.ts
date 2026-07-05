/**
 * Cross-browser magic-link relay endpoints.
 *
 * POST /api/auth/link-code        - foreign browser stashes an unusable PKCE
 *                                   auth code, receives a 6-digit display code
 * POST /api/auth/link-code/claim  - originating browser redeems the display
 *                                   code for the auth code (single use)
 *
 * Both endpoints are unauthenticated by nature (callers are mid-sign-in) and
 * rate limited per IP. A claimed auth code cannot be exchanged without the
 * PKCE verifier, which only the originating browser holds.
 */
import { Router } from "express";
import { z } from "zod";

import { supabaseAdmin } from "../lib/supabase";
import { rateLimit } from "../middleware/rate-limit";
import { claimAuthCode, stashAuthCode } from "../services/auth-link-code";

export const authLinkCodeRouter = Router();

const StashSchema = z.object({
  authCode: z.string().uuid(),
});

const ClaimSchema = z.object({
  displayCode: z.string().regex(/^\d{6}$/),
});

authLinkCodeRouter.post(
  "/",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyFn: (req) => `link-code-stash:${req.ip}`,
  }),
  async (req, res) => {
    const parsed = StashSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_auth_code" });
    }

    try {
      const result = await stashAuthCode(supabaseAdmin, parsed.data.authCode);
      res.json(result);
    } catch (err) {
      console.error("[auth-link-code] stash failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  }
);

authLinkCodeRouter.post(
  "/claim",
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyFn: (req) => `link-code-claim:${req.ip}`,
  }),
  async (req, res) => {
    const parsed = ClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(404).json({ error: "invalid_or_expired" });
    }

    try {
      const authCode = await claimAuthCode(
        supabaseAdmin,
        parsed.data.displayCode
      );
      if (!authCode) {
        return res.status(404).json({ error: "invalid_or_expired" });
      }
      res.json({ authCode });
    } catch (err) {
      console.error("[auth-link-code] claim failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
