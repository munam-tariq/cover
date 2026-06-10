-- Security fix (Critical): anonymous read/write of leads and pulse data.
--
-- Several tables carry policies named "Service role ..." that were created `FOR ALL USING (true)
-- WITH CHECK (true)` with NO `TO` clause, so they apply to PUBLIC (incl. the `anon` role) — not
-- service_role. Anonymous clients could therefore SELECT every tenant's qualified_leads (real
-- emails), pulse responses/campaigns/summaries, and tamper with lead_captures.
--
-- service_role bypasses RLS entirely, so these policies were never needed for the API. Dropping
-- them removes all anon access; the owner-scoped SELECT policies remain, and the intentional
-- write-only public submission policies (message_feedback / pulse_responses INSERT) are kept.
--
-- Verified no client code reads/writes these tables with the anon key — all access is the
-- service-role API.

DROP POLICY IF EXISTS "Service role can manage leads" ON public.qualified_leads;
DROP POLICY IF EXISTS "Service role can insert leads" ON public.lead_captures;
DROP POLICY IF EXISTS "Service role can update leads" ON public.lead_captures;
DROP POLICY IF EXISTS "Service role full access to campaigns" ON public.pulse_campaigns;
DROP POLICY IF EXISTS "Service role full access to responses" ON public.pulse_responses;
DROP POLICY IF EXISTS "Service role full access to summaries" ON public.pulse_summaries;
