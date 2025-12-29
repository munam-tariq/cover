/**
 * Deepgram Text-to-Speech (TTS) Service
 *
 * Handles text-to-speech synthesis using Deepgram Aura-2 model.
 * Supports both single request and streaming TTS.
 */

import { LiveTTSEvents, type SpeakLiveClient } from "@deepgram/sdk";
import { deepgram, DEFAULT_VOICE_ID, type VoiceId } from "../lib/deepgram";

/**
 * Options for streaming TTS
 */
export interface TTSStreamOptions {
  /** Voice ID to use (default: aura-2-thalia-en) */
  voiceId?: VoiceId;
  /** Callback when audio chunk is received */
  onAudioChunk: (chunk: Buffer) => void;
  /** Callback when TTS is complete */
  onComplete: () => void;
  /** Callback on error */
  onError: (error: Error) => void;
}

/**
 * TTS stream interface for sending text
 */
export interface TTSStream {
  /** Send text to synthesize */
  sendText: (text: string) => void;
  /** Flush the stream (signal end of text) */
  flush: () => void;
  /** Close the connection */
  close: () => void;
  /** Check if connection is open */
  isOpen: () => boolean;
}

/**
 * Create a streaming TTS connection
 * Allows sending text in chunks and receiving audio as it's generated
 *
 * @param options - TTS configuration options
 * @returns TTS stream interface
 */
export function createTTSStream(options: TTSStreamOptions): TTSStream {
  let connection: SpeakLiveClient | null = null;
  let isConnectionOpen = false;

  try {
    // Create live TTS connection
    connection = deepgram.speak.live({
      model: options.voiceId || DEFAULT_VOICE_ID,
      encoding: "linear16", // PCM 16-bit audio
      sample_rate: 24000, // 24kHz for better quality playback
    });

    // Handle connection open
    connection.on(LiveTTSEvents.Open, () => {
      console.log("[Deepgram TTS] Connection opened");
      isConnectionOpen = true;
    });

    // Handle audio data
    connection.on(LiveTTSEvents.Audio, (data) => {
      if (data && data.audio) {
        options.onAudioChunk(Buffer.from(data.audio));
      }
    });

    // Handle flushed (audio generation complete for current text)
    connection.on(LiveTTSEvents.Flushed, () => {
      console.log("[Deepgram TTS] Flushed");
      options.onComplete();
    });

    // Handle errors
    connection.on(LiveTTSEvents.Error, (error) => {
      console.error("[Deepgram TTS] Error:", error);
      options.onError(new Error(error.message || "TTS error"));
    });

    // Handle connection close
    connection.on(LiveTTSEvents.Close, () => {
      console.log("[Deepgram TTS] Connection closed");
      isConnectionOpen = false;
    });
  } catch (error) {
    console.error("[Deepgram TTS] Failed to create connection:", error);
    options.onError(
      error instanceof Error ? error : new Error("Failed to create TTS stream")
    );
  }

  return {
    sendText: (text: string) => {
      if (connection && isConnectionOpen) {
        try {
          connection.sendText(text);
        } catch (error) {
          console.error("[Deepgram TTS] Failed to send text:", error);
        }
      }
    },
    flush: () => {
      if (connection && isConnectionOpen) {
        try {
          connection.flush();
        } catch (error) {
          console.error("[Deepgram TTS] Failed to flush:", error);
        }
      }
    },
    close: () => {
      if (connection) {
        try {
          // Use requestClose to gracefully close the connection
          connection.requestClose();
        } catch (error) {
          console.error("[Deepgram TTS] Failed to close:", error);
        }
        connection = null;
        isConnectionOpen = false;
      }
    },
    isOpen: () => isConnectionOpen,
  };
}

/**
 * Convert text to speech (single request)
 * Returns the complete audio buffer
 *
 * @param text - Text to synthesize
 * @param voiceId - Voice ID to use
 * @returns Audio buffer (PCM 16-bit, 24kHz)
 */
export async function textToSpeech(
  text: string,
  voiceId?: VoiceId
): Promise<Buffer> {
  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: voiceId || DEFAULT_VOICE_ID,
        encoding: "linear16",
        sample_rate: 24000,
      }
    );

    // Get the audio stream
    const stream = await response.getStream();
    if (!stream) {
      throw new Error("No audio stream returned");
    }

    // Read all chunks from the stream
    const chunks: Buffer[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error("[Deepgram TTS] Error:", error);
    throw error;
  }
}

/**
 * Convert text to speech with streaming callback
 * Streams audio chunks as they are generated
 *
 * @param text - Text to synthesize
 * @param options - TTS options including callbacks
 */
export async function textToSpeechStream(
  text: string,
  options: TTSStreamOptions
): Promise<void> {
  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: options.voiceId || DEFAULT_VOICE_ID,
        encoding: "linear16",
        sample_rate: 24000,
      }
    );

    // Get the audio stream
    const stream = await response.getStream();
    if (!stream) {
      throw new Error("No audio stream returned");
    }

    // Read and stream chunks
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      options.onAudioChunk(Buffer.from(value));
    }

    options.onComplete();
  } catch (error) {
    console.error("[Deepgram TTS] Streaming error:", error);
    options.onError(
      error instanceof Error ? error : new Error("TTS streaming failed")
    );
  }
}
