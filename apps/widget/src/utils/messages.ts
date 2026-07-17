/**
 * Message Conversion
 *
 * One conversion from a server-shaped message (fetched or realtime) to the widget's stored shape.
 * The fetch and realtime payloads are structurally identical for this purpose, and every field the
 * widget renders has to survive both paths — keeping the mapping in one place is what makes that
 * true by construction.
 */

import type { FetchedMessage } from "./handoff";
import type { RealtimeMessage } from "./realtime";
import type { StoredMessage } from "./storage";

type ServerMessage = FetchedMessage | RealtimeMessage;

export function toStoredMessage(msg: ServerMessage): StoredMessage {
  return {
    id: msg.id,
    content: msg.content,
    role: msg.senderType === "customer" ? "user" : "assistant",
    timestamp: new Date(msg.createdAt).getTime(),
    ...(msg.metadata ? { metadata: msg.metadata } : {}),
    ...(msg.senderType === "agent" && msg.senderName
      ? { agentName: msg.senderName }
      : {}),
  };
}
