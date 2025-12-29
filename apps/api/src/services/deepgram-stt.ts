/**
 * Deepgram Speech-to-Text (STT) Service
 *
 * Handles real-time speech transcription using Deepgram Nova-3 model.
 * Creates streaming connections for live audio transcription.
 */

import { LiveTranscriptionEvents, type LiveClient } from "@deepgram/sdk";
import { deepgram } from "../lib/deepgram";

/**
 * Options for creating an STT stream
 */
export interface STTOptions {
  /** Callback when transcript is received */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Callback on error */
  onError: (error: Error) => void;
  /** Callback when connection closes */
  onClose?: () => void;
  /** Language for transcription (default: 'en') */
  language?: string;
}

/**
 * STT stream interface for sending audio and managing connection
 */
export interface STTStream {
  /** Send audio data to Deepgram */
  send: (audioData: Buffer | ArrayBuffer) => void;
  /** Close the connection */
  close: () => void;
  /** Check if connection is open */
  isOpen: () => boolean;
}

/**
 * Create a real-time speech-to-text stream using Deepgram Nova-3
 *
 * @param options - STT configuration options
 * @returns STT stream interface for sending audio
 */
export function createSTTStream(options: STTOptions): STTStream {
  let connection: LiveClient | null = null;
  let isConnectionOpen = false;

  try {
    // Create live transcription connection with Nova-3 model
    // Browser sends raw PCM audio (linear16, 16kHz, mono)
    connection = deepgram.listen.live({
      model: "nova-3",
      language: options.language || "en",
      encoding: "linear16", // Raw PCM 16-bit signed little-endian
      sample_rate: 16000, // 16kHz sample rate
      channels: 1, // Mono audio
      smart_format: true, // Automatic punctuation and formatting
      interim_results: true, // Get partial results as user speaks
      utterance_end_ms: 1000, // End of utterance detection (1 second silence)
      vad_events: true, // Voice Activity Detection
    });

    // Handle connection open
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("[Deepgram STT] Connection opened");
      isConnectionOpen = true;
    });

    // Handle transcript events
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      console.log("[Deepgram STT] Transcript event:", JSON.stringify(data, null, 2));
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript) {
        const isFinal = data.is_final || false;
        console.log("[Deepgram STT] Got transcript:", transcript, "isFinal:", isFinal);
        options.onTranscript(transcript, isFinal);
      }
    });

    // Handle metadata
    connection.on(LiveTranscriptionEvents.Metadata, (data) => {
      console.log("[Deepgram STT] Metadata:", JSON.stringify(data, null, 2));
    });

    // Handle errors
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error("[Deepgram STT] Error:", JSON.stringify(error, null, 2));
      options.onError(new Error(error.message || "STT error"));
    });

    // Handle connection close
    connection.on(LiveTranscriptionEvents.Close, (event) => {
      console.log("[Deepgram STT] Connection closed, event:", JSON.stringify(event, null, 2));
      isConnectionOpen = false;
      options.onClose?.();
    });

    // Handle unhandled events
    connection.on(LiveTranscriptionEvents.Unhandled, (data) => {
      console.log("[Deepgram STT] Unhandled event:", JSON.stringify(data, null, 2));
    });

    // Handle speech started (VAD)
    connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      console.log("[Deepgram STT] Speech started");
    });

    // Handle utterance end (user stopped speaking)
    connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      console.log("[Deepgram STT] Utterance ended");
    });
  } catch (error) {
    console.error("[Deepgram STT] Failed to create connection:", error);
    options.onError(
      error instanceof Error ? error : new Error("Failed to create STT stream")
    );
  }

  return {
    send: (audioData: Buffer | ArrayBuffer) => {
      if (connection && isConnectionOpen) {
        try {
          // Convert Buffer to ArrayBuffer for Deepgram SDK compatibility
          const data = audioData instanceof Buffer
            ? audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)
            : audioData;
          console.log("[Deepgram STT] Sending audio chunk, size:", data.byteLength);
          connection.send(data as ArrayBuffer);
        } catch (error) {
          console.error("[Deepgram STT] Failed to send audio:", error);
        }
      } else {
        console.log("[Deepgram STT] Cannot send - connection:", !!connection, "isOpen:", isConnectionOpen);
      }
    },
    close: () => {
      if (connection) {
        try {
          connection.finish();
        } catch (error) {
          console.error("[Deepgram STT] Failed to close connection:", error);
        }
        connection = null;
        isConnectionOpen = false;
      }
    },
    isOpen: () => isConnectionOpen,
  };
}

/**
 * Transcribe a complete audio buffer (non-streaming)
 * Useful for transcribing recorded audio files or complete utterances
 *
 * @param audioBuffer - Complete audio buffer to transcribe
 * @param options - Transcription options
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options?: { language?: string }
): Promise<string> {
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-3",
        language: options?.language || "en",
        smart_format: true,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  } catch (error) {
    console.error("[Deepgram STT] Transcription error:", error);
    throw error;
  }
}
