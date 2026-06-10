"use client";

/**
 * Voice-call orchestration for the public page — React port of the widget's
 * startVoiceCall/endVoiceCall flow (apps/widget/src/components/chat-window.ts).
 *
 * The transcript is NOT streamed into the text thread; after the call ends the backend
 * persists it (POST /api/voice/session-end) and the caller re-syncs the thread from the DB.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ElevenLabsVoiceManager,
  type ElevenLabsVoiceState,
} from "./lib/elevenlabs-voice";
import { API_URL, endVoiceSession, ensureConversation } from "./lib/public-api";

export interface VoiceTranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

interface UseVoiceCallArgs {
  projectId: string;
  visitorId: string;
  sessionId: string | null;
  enabled: boolean;
  /** A conversation was created on demand before the call. */
  onSessionEstablished: (sessionId: string) => void;
  /** Call fully ended and the transcript was sent — re-sync the thread from the DB. */
  onCallEnded: (durationSeconds: number) => void;
}

export function useVoiceCall({
  projectId,
  visitorId,
  sessionId,
  enabled,
  onSessionEstablished,
  onCallEnded,
}: UseVoiceCallArgs) {
  const [callState, setCallState] = useState<ElevenLabsVoiceState>("idle");
  const [transcript, setTranscript] = useState<VoiceTranscriptEntry[]>([]);
  const [muted, setMuted] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const managerRef = useRef<ElevenLabsVoiceManager | null>(null);
  const transcriptRef = useRef<VoiceTranscriptEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const onSessionEstablishedRef = useRef(onSessionEstablished);
  onSessionEstablishedRef.current = onSessionEstablished;
  const onCallEndedRef = useRef(onCallEnded);
  onCallEndedRef.current = onCallEnded;

  const isCallActive =
    callState === "connecting" ||
    callState === "listening" ||
    callState === "speaking";

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCall = useCallback(async () => {
    if (!enabled || managerRef.current) return;

    setTranscript([]);
    transcriptRef.current = [];
    setMuted(false);
    setDurationSeconds(0);
    setCallState("connecting");

    let id = sessionIdRef.current;
    if (!id) {
      id = await ensureConversation(projectId, visitorId);
      if (id) {
        onSessionEstablishedRef.current(id);
        sessionIdRef.current = id;
      }
    }

    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setDurationSeconds(
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );
    }, 1000);

    const manager = new ElevenLabsVoiceManager({
      projectId,
      apiUrl: API_URL,
      visitorId,
      sessionId: id,
      onStateChange: (state) => {
        setCallState(state);
        if (state === "ended" || state === "error") {
          stopTimer();
          managerRef.current = null;
          const duration = Math.round(
            (Date.now() - startedAtRef.current) / 1000
          );
          const convId = sessionIdRef.current;
          const persist = convId
            ? endVoiceSession({
                projectId,
                visitorId,
                sessionId: convId,
                durationSeconds: duration,
                transcript: transcriptRef.current,
              })
            : Promise.resolve();
          // Give the backend a beat to insert the transcript before the thread re-sync.
          void persist
            .then(
              () => new Promise<void>((resolve) => setTimeout(resolve, 300))
            )
            .then(() => onCallEndedRef.current(duration));
        }
      },
      onTranscript: (role, text) => {
        const trimmed = text?.trim();
        if (!trimmed) return;
        const entry: VoiceTranscriptEntry = { role, content: trimmed };
        transcriptRef.current.push(entry);
        setTranscript((prev) => [...prev, entry]);
      },
      onError: (err) => {
        console.error("[Public page] ElevenLabs voice error:", err);
      },
      onEnded: () => {
        // Handled in onStateChange("ended").
      },
    });

    managerRef.current = manager;
    try {
      await manager.start();
    } catch (err) {
      console.error("[Public page] Failed to start voice call:", err);
      stopTimer();
      managerRef.current = null;
      setCallState("error");
    }
  }, [enabled, projectId, stopTimer, visitorId]);

  const endCall = useCallback(() => {
    managerRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      managerRef.current?.mute(!prev);
      return !prev;
    });
  }, []);

  /** Back to the chat view after the call has ended. */
  const dismissCall = useCallback(() => {
    if (!isCallActive) setCallState("idle");
  }, [isCallActive]);

  // Hard cleanup on unmount.
  useEffect(() => {
    return () => {
      managerRef.current?.stop();
      stopTimer();
    };
  }, [stopTimer]);

  return {
    callState,
    isCallActive,
    transcript,
    muted,
    durationSeconds,
    startCall,
    endCall,
    toggleMute,
    dismissCall,
  };
}
