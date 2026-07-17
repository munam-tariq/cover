export type MessageCursorDirection = "before" | "after";

export function buildMessageCursorFilter(
  direction: MessageCursorDirection,
  createdAt: string,
  id: string
): string {
  const operator = direction === "before" ? "lt" : "gt";
  return `created_at.${operator}.${createdAt},and(created_at.eq.${createdAt},id.${operator}.${id})`;
}

export function pageDescendingMessages<T extends { id: string }>(
  rows: readonly T[],
  limit: number
): { messages: T[]; hasMore: boolean; nextCursor: string | null } {
  const descendingPage = rows.slice(0, limit);

  return {
    messages: descendingPage.slice().reverse(),
    hasMore: rows.length > limit,
    nextCursor: descendingPage.at(-1)?.id ?? null,
  };
}
