interface ConversationIdentityInput {
  visitorId: string;
  source?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

function formatPhone(phone: string): string {
  const trimmed = phone.trim();
  if (/^\d{7,15}$/.test(trimmed)) return `+${trimmed}`;
  return trimmed;
}

function getWhatsAppPhoneFromVisitorId(
  visitorId: string,
  source?: string | null
): string | null {
  if (source !== "whatsapp") return null;
  if (!visitorId.startsWith("whatsapp:")) return null;

  const phone = visitorId.slice("whatsapp:".length).trim();
  return phone ? phone : null;
}

export function getConversationDisplayName({
  visitorId,
  source,
  customerName,
  customerEmail,
  customerPhone,
}: ConversationIdentityInput): string {
  const name = customerName?.trim();
  if (name) return name;

  const email = customerEmail?.trim();
  if (email) return email;

  const phone = customerPhone?.trim() || getWhatsAppPhoneFromVisitorId(visitorId, source);
  if (phone) return formatPhone(phone);

  return `Visitor ${visitorId.slice(0, 8)}`;
}
