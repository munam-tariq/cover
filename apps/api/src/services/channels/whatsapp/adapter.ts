import crypto from "crypto";

export interface ParsedInbound {
  type: "text" | "unsupported";
  waMessageId: string;
  waId: string;
  phoneNumberId: string;
  text: string;
  displayName: string;
  timestamp: number;
}

export function verifyWebhookChallenge(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedToken: string
): string | null {
  if (mode === "subscribe" && token === expectedToken) {
    return challenge ?? null;
  }
  return null;
}

export function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const receivedSig = signatureHeader.replace("sha256=", "");

  const expected = Buffer.from(expectedSig, "hex");
  const received = Buffer.from(receivedSig, "hex");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

/**
 * Meta batches webhook deliveries: a single POST can carry multiple `entry`
 * items (one per WABA) and multiple `changes` per entry (up to 1000 updates
 * per request per Meta's docs). Every value object across the whole payload
 * must be considered, not just the first.
 */
function getChangeValues(body: unknown): Array<Record<string, unknown>> {
  const obj = asRecord(body);
  if (!obj || obj.object !== "whatsapp_business_account") return [];

  return asRecordArray(obj.entry).flatMap((entry) =>
    asRecordArray(entry.changes).flatMap((change) => {
      const value = asRecord(change.value);
      return value ? [value] : [];
    })
  );
}

function getPhoneNumberId(value: Record<string, unknown>): string | null {
  const metadata = asRecord(value.metadata);
  const phoneNumberId = metadata?.phone_number_id;
  return typeof phoneNumberId === "string" ? phoneNumberId : null;
}

export function extractPhoneNumberIds(body: unknown): string[] {
  const ids = getChangeValues(body).flatMap((value) => {
    const phoneNumberId = getPhoneNumberId(value);
    return phoneNumberId ? [phoneNumberId] : [];
  });
  return [...new Set(ids)];
}

export function extractPhoneNumberId(body: unknown): string | null {
  return extractPhoneNumberIds(body)[0] ?? null;
}

function getContactDisplayName(
  contacts: Array<Record<string, unknown>>,
  waId: string
): string {
  const matchingContact =
    contacts.find((contact) => contact.wa_id === waId) ?? contacts[0];
  const profile = asRecord(matchingContact?.profile);
  return typeof profile?.name === "string" ? profile.name : "";
}

function parseInboundMessage(
  value: Record<string, unknown>,
  msg: Record<string, unknown>
): ParsedInbound | null {
  const phoneNumberId = getPhoneNumberId(value);
  const waMessageId = msg.id;
  const from = msg.from;
  const timestampRaw = msg.timestamp;
  const msgType = msg.type;

  if (
    !phoneNumberId ||
    typeof waMessageId !== "string" ||
    typeof from !== "string" ||
    typeof timestampRaw !== "string" ||
    typeof msgType !== "string"
  ) {
    return null;
  }

  const timestamp = parseInt(timestampRaw, 10);
  if (Number.isNaN(timestamp)) return null;

  const displayName = getContactDisplayName(
    asRecordArray(value.contacts),
    from
  );

  if (msgType === "text") {
    const text = asRecord(msg.text);
    const textBody = typeof text?.body === "string" ? text.body : "";
    return {
      type: "text",
      waMessageId,
      waId: from,
      phoneNumberId,
      text: textBody,
      displayName,
      timestamp,
    };
  }

  return {
    type: "unsupported",
    waMessageId,
    waId: from,
    phoneNumberId,
    text: "",
    displayName,
    timestamp,
  };
}

export function parseInboundMessages(body: unknown): ParsedInbound[] {
  return getChangeValues(body).flatMap((value) =>
    asRecordArray(value.messages).flatMap((msg) => {
      const parsed = parseInboundMessage(value, msg);
      return parsed ? [parsed] : [];
    })
  );
}

export function parseInbound(body: unknown): ParsedInbound | null {
  return parseInboundMessages(body)[0] ?? null;
}

/**
 * A batched POST can reference connections with different app secrets
 * (different Meta apps). Verify the raw body against each distinct secret
 * once, and only trust phone_number_ids whose connection's secret actually
 * matched — a stale/wrong secret on one connection must not let its
 * messages ride along on another connection's valid signature.
 */
export function selectVerifiedPhoneNumberIds(
  candidates: Array<{ phoneNumberId: string; appSecret: string }>,
  rawBody: Buffer,
  signatureHeader: string | undefined
): Set<string> {
  const verifiedBySecret = new Map<string, boolean>();
  const verifiedPhoneNumberIds = new Set<string>();

  for (const { phoneNumberId, appSecret } of candidates) {
    let result = verifiedBySecret.get(appSecret);
    if (result === undefined) {
      result = verifySignature(rawBody, signatureHeader, appSecret);
      verifiedBySecret.set(appSecret, result);
    }
    if (result) verifiedPhoneNumberIds.add(phoneNumberId);
  }

  return verifiedPhoneNumberIds;
}

/**
 * Processes each parsed message in payload order (sequential, not
 * concurrent) so two messages from the same WhatsApp user in one batch
 * can't race each other into conflicting AI replies. A message with no
 * resolved connection is skipped; a processing failure for one message
 * does not stop the rest of the batch (the POST is already ACKed, so a
 * silently-aborted loop would drop the remaining messages).
 */
export async function processInboundBatch<TConn>(
  parsedMessages: ParsedInbound[],
  resolveConnection: (phoneNumberId: string) => TConn | undefined,
  processFn: (conn: TConn, parsed: ParsedInbound) => Promise<void>,
  onSkip: (parsed: ParsedInbound) => void,
  onError: (parsed: ParsedInbound, err: unknown) => void
): Promise<void> {
  for (const parsed of parsedMessages) {
    const conn = resolveConnection(parsed.phoneNumberId);
    if (!conn) {
      onSkip(parsed);
      continue;
    }
    try {
      await processFn(conn, parsed);
    } catch (err) {
      onError(parsed, err);
    }
  }
}

const DEFAULT_GRAPH_API_VERSION = "v25.0";

export function getGraphApiVersion(): string {
  return process.env.GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ waMessageId: string }> {
  const url = `https://graph.facebook.com/${getGraphApiVersion()}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    messages: Array<{ id: string }>;
  };
  return { waMessageId: data.messages[0].id };
}
