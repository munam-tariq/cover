"use client";

import { cn } from "@chatbot/ui";
import { Mic, MicOff, PhoneOff, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ElevenLabsVoiceState } from "./lib/elevenlabs-voice";
import type { VoiceTranscriptEntry } from "./use-voice-call";

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

const STATE_LABEL: Record<ElevenLabsVoiceState, string> = {
  idle: "",
  connecting: "Connecting…",
  listening: "Listening…",
  speaking: "Speaking…",
  ended: "Call ended",
  error: "Something went wrong",
};

/**
 * Full-screen voice-call overlay — React port of the widget's VoiceCallOverlay
 * (apps/widget/src/components/voice-call-overlay.ts): pulsing orb per state, timer,
 * mute toggle, live transcript, and a "continue chatting" exit once the call ends.
 */
export function VoiceCallOverlay({
  state,
  transcript,
  muted,
  durationSeconds,
  accentColor,
  businessName,
  onEnd,
  onToggleMute,
  onDismiss,
}: {
  state: ElevenLabsVoiceState;
  transcript: VoiceTranscriptEntry[];
  muted: boolean;
  durationSeconds: number;
  accentColor: string;
  businessName: string;
  onEnd: () => void;
  onToggleMute: () => void;
  onDismiss: () => void;
}) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isActive =
    state === "connecting" || state === "listening" || state === "speaking";

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="bg-background/95 absolute inset-0 z-20 flex flex-col items-center backdrop-blur-sm">
      <div className="flex w-full items-center justify-between p-4">
        <span className="text-sm font-medium">{businessName} — voice</span>
        {!isActive && (
          <button
            aria-label="Back to chat"
            onClick={onDismiss}
            className="text-muted-foreground hover:bg-muted rounded-md p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        {/* Orb */}
        <div
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full text-white transition-transform",
            state === "speaking" && "animate-pulse",
            state === "connecting" && "opacity-60"
          )}
          style={{ backgroundColor: accentColor }}
        >
          <Mic className="h-8 w-8" />
        </div>

        <div className="text-sm font-medium">{STATE_LABEL[state]}</div>
        <div className="text-muted-foreground text-xs tabular-nums">
          {formatDuration(durationSeconds)}
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="bg-muted/20 max-h-48 w-full max-w-md space-y-1.5 overflow-y-auto rounded-lg border p-3 text-xs">
            {transcript.map((t, i) => (
              <div key={i}>
                <span className="font-medium">
                  {t.role === "user" ? "You" : "Assistant"}:{" "}
                </span>
                <span className="text-muted-foreground">{t.content}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 p-8">
        {isActive ? (
          <>
            <button
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={onToggleMute}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border transition",
                muted ? "bg-muted text-muted-foreground" : "hover:bg-muted"
              )}
            >
              {muted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <button
              aria-label="End call"
              onClick={onEnd}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </>
        ) : (
          <button
            onClick={onDismiss}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            Continue chatting
          </button>
        )}
      </div>
    </div>
  );
}
