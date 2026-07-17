-- Make per-call voice duration structurally queryable.
--
-- WHY: `voiceCallCount` (apps/api/src/routes/analytics.ts:711-719, surfaced on analytics/page.tsx:51
-- and dashboard/page.tsx:32) counts `is_voice_call = true` — a column NO code writes, DEFAULT false.
-- It reads ~0 permanently (7 stale rows from a replaced voice implementation).
--
-- Repointing it at the conversation's voice_* columns does not work either: voice and text share one
-- conversation and multi-call is the norm (staging has conversations with 27, 19 and 11 calls), while
-- session-end OVERWRITES conversations.voice_ended_reason / voice_duration_seconds. Counting
-- conversations reports 19 where the truth is 79 calls — a 4x undercount.
--
-- The per-call record already exists: session-end (routes/voice.ts) inserts one summary message per
-- call tagged metadata.voice_summary = true. The only gap is duration, which lives ONLY inside the
-- message text ("Voice call ended (3:42).", via formatVoiceDuration) — recoverable today only by
-- regex-parsing prose. This backfill lifts it into metadata; voice.ts writes it going forward.
--
-- Verified 2026-07-15 (staging): 79 summary messages, 79 match the m:ss pattern, 0 already carry
-- durationSeconds. Range 0:00 - 5:32.

-- The `||` merge is mandatory: replacing metadata would delete `voice_summary: true` itself, and the
-- new analytics query — which counts exactly that key — would then miss every backfilled row.
update messages
set metadata = metadata || jsonb_build_object(
      'durationSeconds',
      split_part(substring(content from 'Voice call ended \(([0-9]+:[0-9]{2})\)'), ':', 1)::int * 60
      + split_part(substring(content from 'Voice call ended \(([0-9]+:[0-9]{2})\)'), ':', 2)::int
    )
where metadata->>'voice_summary' = 'true'
  and not (metadata ? 'durationSeconds')
  and content ~ 'Voice call ended \([0-9]+:[0-9]{2}\)';
