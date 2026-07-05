CREATE TABLE IF NOT EXISTS public.channel_inbound_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('whatsapp')),
  external_message_id TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_channel_inbound_events_provider_message
  ON public.channel_inbound_events(provider, external_message_id);

CREATE INDEX IF NOT EXISTS idx_channel_inbound_events_project_created
  ON public.channel_inbound_events(project_id, created_at DESC);

ALTER TABLE public.channel_inbound_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.channel_inbound_events FROM anon;
REVOKE ALL ON TABLE public.channel_inbound_events FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.channel_inbound_events FROM anon, authenticated;
