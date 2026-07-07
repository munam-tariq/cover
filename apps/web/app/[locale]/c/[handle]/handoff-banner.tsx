"use client";

import { Headphones, Loader2 } from "lucide-react";

import type { PublicHandoffState } from "./use-public-handoff";

/**
 * Status strip shown above the composer while a human handoff is in flight:
 * queue position while waiting, agent identity once claimed.
 */
export function HandoffBanner({
  state,
  accentColor,
}: {
  state: PublicHandoffState;
  accentColor: string;
}) {
  if (state.status === "waiting") {
    return (
      <div className="bg-muted/40 text-muted-foreground mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg border px-3 py-2 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {typeof state.queuePosition === "number" && state.queuePosition > 0
          ? `You're #${state.queuePosition} in the queue — a human agent will be with you shortly.`
          : "Connecting you with a human agent…"}
      </div>
    );
  }

  if (state.status === "agent_active") {
    return (
      <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg border px-3 py-2 text-xs">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: accentColor }}
        >
          <Headphones className="h-3 w-3" />
        </span>
        <span className="font-medium">
          {state.agentName
            ? `${state.agentName} is helping you`
            : "A human agent is helping you"}
        </span>
        {state.agentTyping && (
          <span className="text-muted-foreground">— typing…</span>
        )}
      </div>
    );
  }

  return null;
}
