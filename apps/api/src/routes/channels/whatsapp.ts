import { Router } from "express";
import type { Request, Response } from "express";

import { logger } from "../../lib/logger";
import {
  getConnectionsByExternalIds,
  decryptCredentials,
} from "../../services/channels/connections";
import {
  verifyWebhookChallenge,
  extractPhoneNumberIds,
  parseInboundMessages,
  selectVerifiedPhoneNumberIds,
  processInboundBatch,
} from "../../services/channels/whatsapp/adapter";
import { handleInbound } from "../../services/channels/whatsapp/inbound";
import type { ChannelConnection, WhatsAppCredentials } from "../../types/channels";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.error("WHATSAPP_VERIFY_TOKEN not configured");
    return res.sendStatus(403);
  }

  const result = verifyWebhookChallenge(mode, token, challenge, verifyToken);
  if (result !== null) {
    return res.status(200).send(result);
  }

  return res.sendStatus(403);
});

whatsappWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  // Meta may batch multiple WABAs' updates into one POST (up to 1000 per
  // their docs), so every phone_number_id in the payload must be resolved.
  const phoneNumberIds = extractPhoneNumberIds(req.body);
  if (!phoneNumberIds.length) return res.sendStatus(200);

  let connections;
  try {
    connections = await getConnectionsByExternalIds("whatsapp", phoneNumberIds);
  } catch (err) {
    // A lookup failure is not "unknown phone number" — it must not be ACKed
    // 200, or Meta will never retry a message we genuinely failed to look up.
    logger.error("Connection lookup failed for webhook payload", err, {
      phoneNumberIds,
    });
    return res.sendStatus(503);
  }

  if (!connections.length) {
    logger.warn("No active connection for any phone_number_id in payload", {
      phoneNumberIds,
    });
    return res.sendStatus(200);
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error("rawBody not available for HMAC verification");
    return res.sendStatus(401);
  }

  // A single connection with corrupted/rotated credentials must not throw
  // and crash the whole batch (which would surface as a 500 and make Meta
  // retry a request that will never succeed) — log it loudly for ops and
  // exclude just that connection from signature verification.
  const candidates: Array<{ phoneNumberId: string; appSecret: string }> = [];
  for (const conn of connections) {
    try {
      const { appSecret } = decryptCredentials<WhatsAppCredentials>(
        conn.encryptedCredentials
      );
      candidates.push({ phoneNumberId: conn.externalId, appSecret });
    } catch (err) {
      logger.error("Failed to decrypt connection credentials", err, {
        phoneNumberId: conn.externalId,
      });
    }
  }
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const verifiedPhoneNumberIds = selectVerifiedPhoneNumberIds(
    candidates,
    rawBody,
    signature
  );
  if (verifiedPhoneNumberIds.size === 0) {
    logger.warn("Invalid webhook signature", { phoneNumberIds });
    return res.sendStatus(401);
  }

  const connectionsByPhoneNumberId = new Map(
    connections.map((conn) => [conn.externalId, conn])
  );
  const parsedMessages = parseInboundMessages(req.body);

  // Fast ACK only after HMAC verification. RAG/LLM work happens async.
  res.sendStatus(200);
  void processInboundBatch<ChannelConnection & { encryptedCredentials: string }>(
    parsedMessages,
    (phoneNumberId) =>
      verifiedPhoneNumberIds.has(phoneNumberId)
        ? connectionsByPhoneNumberId.get(phoneNumberId)
        : undefined,
    handleInbound,
    (parsed) =>
      logger.warn("No verified connection for phone_number_id, skipping message", {
        phoneNumberId: parsed.phoneNumberId,
        waMessageId: parsed.waMessageId,
      }),
    (parsed, err) =>
      logger.error("Webhook processing error", err, {
        waMessageId: parsed.waMessageId,
        phoneNumberId: parsed.phoneNumberId,
      })
  );
});
