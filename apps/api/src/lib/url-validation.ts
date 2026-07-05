const ALLOWED_CHANNEL_SCHEMES = ["https:", "http:", "mailto:", "tel:"];
const ALLOWED_ICON_SCHEMES = ["https:", "http:"];
const VALID_CHANNEL_TYPES = ["whatsapp", "instagram", "facebook", "email", "phone", "custom"];

export function isSafeChannelUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return ALLOWED_CHANNEL_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function isSafeIconUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return ALLOWED_ICON_SCHEMES.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export { VALID_CHANNEL_TYPES, ALLOWED_CHANNEL_SCHEMES, ALLOWED_ICON_SCHEMES };
