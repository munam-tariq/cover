"use client";

/**
 * Live human-handoff state machine for the public hosted page.
 *
 * Mirrors the embeddable widget's polling fallback without exposing browser Supabase Realtime
 * access from an unauthenticated hosted page.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkHandoffAvailability,
  ensureConversation,
  fetchMessagesResult,
  getConversationStatusResult,
  sendPresenceUpdate,
  sendTypingIndicator,
  triggerHandoff,
  type ConversationStatus,
  type HandoffAvailability,
  type PublicMessage,
} from "./lib/public-api";
import { getStoredSessionToken } from "./lib/public-storage";

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
  satisfactionRating: number | null;
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
  /** The stored session token no longer authorizes this conversation. */
  onStaleSession?: (sessionId: string) => void;
}

const IN_HANDOFF: ConversationStatus[] = ["waiting", "agent_active"];

export function usePublicHandoff({
  projectId,
  visitorId,
  sessionId,
  enabled,
  onServerMessages,
  onSessionEstablished,
  onStaleSession,
}: UsePublicHandoffArgs) {
  const [status, setStatus] = useState<ConversationStatus | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [availability, setAvailability] = useState<HandoffAvailability | null>(
    null
  );
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(
    null
  );
  const [requestingHuman, setRequestingHuman] = useState(false);

  const isInHandoff = status !== null && IN_HANDOFF.includes(status);

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const statusRef = useRef(status);
  statusRef.current = status;

  const lastMessageTsRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTickRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onServerMessagesRef = useRef(onServerMessages);
  onServerMessagesRef.current = onServerMessages;
  const onSessionEstablishedRef = useRef(onSessionEstablished);
  onSessionEstablishedRef.current = onSessionEstablished;
  const onStaleSessionRef = useRef(onStaleSession);
  onStaleSessionRef.current = onStaleSession;

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

  const handleStaleSession = useCallback(
    (id: string) => {
      stopPolling();
      lastMessageTsRef.current = null;
      setStatus(null);
      setQueuePosition(null);
      setAgentName(null);
      setAgentTyping(false);
      setOfflineMessage(null);
      setSatisfactionRating(null);
      onStaleSessionRef.current?.(id);
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
          void fetchMessagesResult(
            id,
            lastMessageTsRef.current || undefined,
            getStoredSessionToken(id) ?? undefined
          ).then((result) => {
            if (!result.ok) {
              if (result.staleSession) handleStaleSession(id);
              return;
            }
            ingestMessages(result.data);
          });
        }
        exitHandoff(next as ConversationStatus);
      }
    },
    [exitHandoff, handleStaleSession, ingestMessages]
  );

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTickRef.current = 0;
    pollTimerRef.current = setInterval(async () => {
      const id = sessionIdRef.current;
      if (!id) return;
      const messagesResult = await fetchMessagesResult(
        id,
        lastMessageTsRef.current || undefined,
        getStoredSessionToken(id) ?? undefined
      );
      if (!messagesResult.ok) {
        if (messagesResult.staleSession) handleStaleSession(id);
        return;
      }
      ingestMessages(messagesResult.data);
      pollTickRef.current += 1;
      if (pollTickRef.current % STATUS_CHECK_EVERY_N_POLLS === 0) {
        const statusResult = await getConversationStatusResult(
          id,
          getStoredSessionToken(id) ?? undefined
        );
        if (!statusResult.ok) {
          if (statusResult.staleSession) handleStaleSession(id);
          return;
        }
        const s = statusResult.data;
        if (s) {
          setSatisfactionRating(s.satisfactionRating);
          if (typeof s.queuePosition === "number")
            setQueuePosition(s.queuePosition);
          if (s.assignedAgent?.name) setAgentName(s.assignedAgent.name);
          handleStatusChange(s.status);
        }
      }
    }, POLL_INTERVAL_MS);
  }, [handleStaleSession, handleStatusChange, ingestMessages]);

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
      startPolling();
    },
    [startPolling]
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
      setSatisfactionRating(null);
      if (sessionId) {
        const sessionToken = getStoredSessionToken(sessionId);
        if (sessionToken) {
          const statusResult = await getConversationStatusResult(
            sessionId,
            sessionToken
          );
          if (cancelled) return;
          if (!statusResult.ok) {
            if (statusResult.staleSession) handleStaleSession(sessionId);
            return;
          }
          const s = statusResult.data;
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
          if (s) {
            setStatus(s.status);
            setSatisfactionRating(s.satisfactionRating);
          }
        }
      }
      void refreshAvailability();
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
    // Intentionally keyed on sessionId: switching threads re-evaluates handoff state.
  }, [
    enabled,
    sessionId,
    enterHandoff,
    handleStaleSession,
    refreshAvailability,
    stopPolling,
  ]);

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
      const result = await triggerHandoff(
        id,
        { reason: "button_click" },
        getStoredSessionToken(id) ?? undefined
      );
      if ("staleSession" in result) {
        handleStaleSession(id);
        return;
      }
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
  }, [
    enabled,
    enterHandoff,
    handleStaleSession,
    projectId,
    requestingHuman,
    visitorId,
  ]);

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
    setSatisfactionRating(null);
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
    satisfactionRating,
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
