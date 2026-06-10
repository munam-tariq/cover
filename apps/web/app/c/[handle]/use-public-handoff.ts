"use client";

/**
 * Live human-handoff state machine for the public hosted page.
 *
 * Mirrors the embeddable widget's behavior (apps/widget/src/components/chat-window.ts):
 * realtime broadcast subscription on `conversation:{id}` with a 2-second polling fallback,
 * queue position, agent join/typing, and status transitions back to the AI.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useConversationRealtime } from "@/hooks/use-inbox-realtime";

import {
  checkHandoffAvailability,
  ensureConversation,
  fetchMessages,
  getConversationStatus,
  sendPresenceUpdate,
  sendTypingIndicator,
  triggerHandoff,
  type ConversationStatus,
  type HandoffAvailability,
  type PublicMessage,
} from "./lib/public-api";

const POLL_INTERVAL_MS = 2000;
const STATUS_CHECK_EVERY_N_POLLS = 5; // status re-check every ~10s while polling
const PRESENCE_HEARTBEAT_MS = 30000;
const TYPING_DEBOUNCE_MS = 1200;

export interface PublicHandoffState {
  status: ConversationStatus | null;
  isInHandoff: boolean;
  queuePosition: number | null;
  agentName: string | null;
  agentTyping: boolean;
  availability: HandoffAvailability | null;
  offlineMessage: string | null;
}

interface UsePublicHandoffArgs {
  projectId: string;
  visitorId: string;
  sessionId: string | null;
  /** false in preview mode — the hook then does nothing and hits no network. */
  enabled: boolean;
  /** New (deduped upstream by id) agent/system messages to append to the thread. */
  onServerMessages: (messages: PublicMessage[]) => void;
  /** A conversation was created on demand (e.g. "Talk to a human" before any message). */
  onSessionEstablished: (sessionId: string) => void;
}

const IN_HANDOFF: ConversationStatus[] = ["waiting", "agent_active"];

export function usePublicHandoff({
  projectId,
  visitorId,
  sessionId,
  enabled,
  onServerMessages,
  onSessionEstablished,
}: UsePublicHandoffArgs) {
  const [status, setStatus] = useState<ConversationStatus | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [availability, setAvailability] = useState<HandoffAvailability | null>(
    null
  );
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [requestingHuman, setRequestingHuman] = useState(false);

  const isInHandoff = status !== null && IN_HANDOFF.includes(status);

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const statusRef = useRef(status);
  statusRef.current = status;

  const lastMessageTsRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTickRef = useRef(0);
  const realtimeConnectedRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onServerMessagesRef = useRef(onServerMessages);
  onServerMessagesRef.current = onServerMessages;
  const onSessionEstablishedRef = useRef(onSessionEstablished);
  onSessionEstablishedRef.current = onSessionEstablished;

  // ---- helpers -------------------------------------------------------------

  const refreshAvailability = useCallback(async () => {
    if (!enabled) return;
    setAvailability(await checkHandoffAvailability(projectId));
  }, [enabled, projectId]);

  const ingestMessages = useCallback((messages: PublicMessage[]) => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last?.createdAt) lastMessageTsRef.current = last.createdAt;
    // The visitor already sees their own messages locally.
    const incoming = messages.filter((m) => m.senderType !== "customer");
    if (incoming.length > 0) onServerMessagesRef.current(incoming);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const exitHandoff = useCallback(
    (finalStatus: ConversationStatus) => {
      stopPolling();
      setStatus(finalStatus);
      setQueuePosition(null);
      setAgentTyping(false);
      void refreshAvailability();
    },
    [refreshAvailability, stopPolling]
  );

  const handleStatusChange = useCallback(
    (next: string) => {
      if (next === "waiting" || next === "agent_active") {
        setStatus(next);
        if (next === "agent_active") setQueuePosition(null);
        return;
      }
      if (next === "resolved" || next === "closed" || next === "ai_active") {
        // Pull any trailing system messages ("conversation resolved") before going quiet.
        const id = sessionIdRef.current;
        if (id) {
          void fetchMessages(id, lastMessageTsRef.current || undefined).then(
            ingestMessages
          );
        }
        exitHandoff(next as ConversationStatus);
      }
    },
    [exitHandoff, ingestMessages]
  );

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTickRef.current = 0;
    pollTimerRef.current = setInterval(async () => {
      const id = sessionIdRef.current;
      if (!id) return;
      ingestMessages(
        await fetchMessages(id, lastMessageTsRef.current || undefined)
      );
      pollTickRef.current += 1;
      if (pollTickRef.current % STATUS_CHECK_EVERY_N_POLLS === 0) {
        const s = await getConversationStatus(id);
        if (s) {
          if (typeof s.queuePosition === "number")
            setQueuePosition(s.queuePosition);
          if (s.assignedAgent?.name) setAgentName(s.assignedAgent.name);
          handleStatusChange(s.status);
        }
      }
    }, POLL_INTERVAL_MS);
  }, [handleStatusChange, ingestMessages]);

  const enterHandoff = useCallback(
    (
      next: Extract<ConversationStatus, "waiting" | "agent_active">,
      info?: {
        queuePosition?: number;
        agentName?: string;
        syncFrom?: "start" | "now";
      }
    ) => {
      setOfflineMessage(null);
      setStatus(next);
      if (typeof info?.queuePosition === "number")
        setQueuePosition(info.queuePosition);
      if (info?.agentName) setAgentName(info.agentName);
      if (info?.syncFrom !== "start" && !lastMessageTsRef.current) {
        // Mid-conversation handoff: the local thread already shows the history; only new
        // agent/system messages should stream in from here on.
        lastMessageTsRef.current = new Date().toISOString();
      }
      // Realtime may already be connected; if not, polling covers the gap.
      if (!realtimeConnectedRef.current) startPolling();
    },
    [startPolling]
  );

  // ---- realtime (active only while in handoff with a known conversation) ----

  useConversationRealtime(
    enabled && isInHandoff && sessionId ? sessionId : null,
    {
      onNewMessage: (message) => {
        ingestMessages([
          {
            id: message.id,
            senderType: message.senderType as PublicMessage["senderType"],
            senderName: message.senderName,
            content: message.content,
            createdAt: message.createdAt,
          },
        ]);
      },
      onStatusChanged: handleStatusChange,
      onAgentJoined: ({ agentName: name }) => {
        if (name) setAgentName(name);
        setStatus("agent_active");
        setQueuePosition(null);
      },
      onQueueUpdate: (position) => setQueuePosition(position),
      onTyping: ({ participant, isTyping }) => {
        if (participant.type === "agent") setAgentTyping(isTyping);
      },
      onConnectionChange: (connected) => {
        realtimeConnectedRef.current = connected;
        if (
          !enabled ||
          !statusRef.current ||
          !IN_HANDOFF.includes(statusRef.current)
        )
          return;
        if (connected) {
          stopPolling();
        } else {
          startPolling();
        }
      },
    }
  );

  // ---- presence heartbeat while in handoff ----------------------------------

  useEffect(() => {
    if (!enabled || !isInHandoff || !sessionId) return;

    void sendPresenceUpdate(sessionId, "online", visitorId);
    presenceTimerRef.current = setInterval(() => {
      void sendPresenceUpdate(sessionId, "online", visitorId);
    }, PRESENCE_HEARTBEAT_MS);

    const onBeforeUnload = () =>
      void sendPresenceUpdate(sessionId, "offline", visitorId);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
      window.removeEventListener("beforeunload", onBeforeUnload);
      onBeforeUnload();
    };
  }, [enabled, isInHandoff, sessionId, visitorId]);

  // ---- mount / resume --------------------------------------------------------

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      if (sessionId) {
        const s = await getConversationStatus(sessionId);
        if (cancelled) return;
        if (s && IN_HANDOFF.includes(s.status)) {
          enterHandoff(s.status as "waiting" | "agent_active", {
            queuePosition: s.queuePosition,
            agentName: s.assignedAgent?.name,
            // Resume after refresh: the thread is rehydrated separately from full history,
            // which also advances lastMessageTsRef before polling starts.
            syncFrom: "start",
          });
          return;
        }
        if (s) setStatus(s.status);
      }
      void refreshAvailability();
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
    // Intentionally keyed on sessionId: switching threads re-evaluates handoff state.
  }, [enabled, sessionId, enterHandoff, refreshAvailability, stopPolling]);

  // ---- public API ------------------------------------------------------------

  /** Mark the rehydrated thread's last timestamp so polling only fetches newer messages. */
  const noteRehydratedThrough = useCallback((lastCreatedAt: string | null) => {
    lastMessageTsRef.current = lastCreatedAt;
  }, []);

  /** "Talk to a human" button. */
  const requestHuman = useCallback(async () => {
    if (!enabled || requestingHuman) return;
    setRequestingHuman(true);
    try {
      let id = sessionIdRef.current;
      if (!id) {
        id = await ensureConversation(projectId, visitorId);
        if (!id) return;
        onSessionEstablishedRef.current(id);
        sessionIdRef.current = id;
      }
      const result = await triggerHandoff(id, { reason: "button_click" });
      if (result.status === "offline" || result.showOfflineForm) {
        setOfflineMessage(
          result.message ||
            "Our team is offline right now. Please try again later."
        );
        return;
      }
      enterHandoff(result.status, {
        queuePosition: result.queuePosition,
        agentName: result.assignedAgent?.name,
      });
      if (result.message) {
        onServerMessagesRef.current([
          {
            id: `sys_${Date.now()}`,
            senderType: "system",
            content: result.message,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setRequestingHuman(false);
    }
  }, [enabled, enterHandoff, projectId, requestingHuman, visitorId]);

  /**
   * Inspect a /api/chat/message response for handoff signals (verbatim widget predicate:
   * a fresh trigger, or an empty response because an agent/queue already owns the thread).
   */
  const handleChatResponse = useCallback(
    (data: {
      response?: string;
      handoff?: {
        triggered?: boolean;
        reason?: string;
        queuePosition?: number;
      };
    }) => {
      if (!enabled) return;
      const handoff = data.handoff;
      if (!handoff) return;
      const emptyResponse = !(data.response || "").trim();
      const shouldEnter =
        handoff.triggered === true ||
        (!!handoff.reason &&
          emptyResponse &&
          (handoff.reason === "in_queue" ||
            handoff.reason === "agent_handling"));
      if (
        shouldEnter &&
        !IN_HANDOFF.includes(statusRef.current || "ai_active")
      ) {
        enterHandoff(
          handoff.reason === "agent_handling" ? "agent_active" : "waiting",
          {
            queuePosition: handoff.queuePosition,
          }
        );
      }
    },
    [enabled, enterHandoff]
  );

  /** Debounced customer-typing signal (only relevant while an agent is watching). */
  const notifyCustomerTyping = useCallback(() => {
    const id = sessionIdRef.current;
    if (!enabled || !id || statusRef.current !== "agent_active") return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    void sendTypingIndicator(id, true);
    typingTimerRef.current = setTimeout(
      () => void sendTypingIndicator(id, false),
      TYPING_DEBOUNCE_MS
    );
  }, [enabled]);

  /** Reset for "New chat". */
  const resetHandoff = useCallback(() => {
    stopPolling();
    lastMessageTsRef.current = null;
    setStatus(null);
    setQueuePosition(null);
    setAgentName(null);
    setAgentTyping(false);
    setOfflineMessage(null);
    void refreshAvailability();
  }, [refreshAvailability, stopPolling]);

  const state: PublicHandoffState = {
    status,
    isInHandoff,
    queuePosition,
    agentName,
    agentTyping,
    availability,
    offlineMessage,
  };

  return {
    ...state,
    requestingHuman,
    requestHuman,
    handleChatResponse,
    notifyCustomerTyping,
    noteRehydratedThrough,
    resetHandoff,
  };
}
