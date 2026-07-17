import { INBOX_CONFIG } from "@chatbot/shared/constants";
import { z } from "zod";

export type InboxSort = (typeof INBOX_CONFIG.SORT_VALUES)[number];

export type InboxStatus = (typeof INBOX_CONFIG.STATUS_VALUES)[number];

export interface InboxPageOptions {
  projectId: string;
  viewerId: string;
  scope: "mine" | "all";
  status: InboxStatus;
  source?: string;
  sort: InboxSort;
  needsReply: boolean;
  voiceUsed: boolean;
  assignedAgent?: string;
  handoffReason?: string;
  activityPeriod?: (typeof INBOX_CONFIG.ACTIVITY_PERIOD_VALUES)[number];
  flaggedOnly: boolean;
  page: number;
  limit: number;
}

const RpcItemSchema = z.object({
  conversation_id: z.string().uuid(),
  priority_reason: z.enum(["waiting", "customer_reply", "activity"]),
  priority_at: z.string().datetime({ offset: true }),
});

const RpcResultSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(RpcItemSchema),
});

export type InboxPageOrder = z.infer<typeof RpcResultSchema>;

interface InboxPageRpcResult {
  data: unknown;
  error: { message: string } | null;
}

export type InboxPageRpc = (
  args: Record<string, unknown>
) => PromiseLike<InboxPageRpcResult>;

export function parseInboxPageRpc(value: unknown): InboxPageOrder {
  return RpcResultSchema.parse(value);
}

export async function getInboxConversationPage(
  options: InboxPageOptions,
  rpc: InboxPageRpc
): Promise<InboxPageOrder> {
  const { data, error } = await rpc({
    p_project_id: options.projectId,
    p_viewer_id: options.viewerId,
    p_scope: options.scope,
    p_status: options.status,
    p_source: options.source ?? null,
    p_sort: options.sort,
    p_needs_reply: options.needsReply,
    p_voice_used: options.voiceUsed,
    p_assigned_agent: options.assignedAgent ?? null,
    p_handoff_reason: options.handoffReason ?? null,
    p_activity_period: options.activityPeriod ?? null,
    p_flagged_only: options.flaggedOnly,
    p_page: options.page,
    p_limit: options.limit,
  });

  if (error) {
    throw new Error(`Inbox page query failed: ${error.message}`);
  }

  return parseInboxPageRpc(data);
}
