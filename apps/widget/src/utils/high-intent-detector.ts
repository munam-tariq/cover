/**
 * High Intent Detector
 *
 * Simple keyword-based detection of high-intent user messages.
 * When a user types something like "pricing", "demo", or "contact sales",
 * this signals buying intent and can trigger email capture overrides.
 */

const DEFAULT_KEYWORDS = [
  "pricing",
  "demo",
  "trial",
  "contact",
  "sales",
  "buy",
  "subscribe",
  "cost",
  "price",
  "plan",
  "enterprise",
  "quote",
];

/**
 * Detect high-intent keywords in a user message.
 *
 * @param message - The user's message text
 * @param keywords - Custom keyword list (falls back to defaults)
 * @returns true if high-intent keywords are found
 */
export function detectHighIntent(
  message: string,
  keywords?: string[]
): boolean {
  const list = keywords && keywords.length > 0 ? keywords : DEFAULT_KEYWORDS;
  const lower = message.toLowerCase();
  return list.some((kw) => lower.includes(kw.toLowerCase()));
}
