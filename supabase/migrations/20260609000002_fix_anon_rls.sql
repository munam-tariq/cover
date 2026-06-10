-- Security fix (Critical/High): remove unauthenticated (anon) broad SELECT policies.
--
-- These policies let any anonymous visitor `select` across ALL tenants, bypassing the
-- field-limited server endpoints. Because the public embed endpoint ships the anon Supabase
-- key to the browser, anyone could read every tenant's settings JSONB (system prompt,
-- lead notification email, lead-capture config), all "ready" knowledge content, and all
-- configured API-endpoint URLs.
--
-- All public widget/page data is served exclusively through the server-side, service-role,
-- field-limited API endpoints (apps/api/src/routes/embed.ts, public-page.ts), never via
-- direct anon table reads. Owner/member access via auth.uid() policies is unaffected.
--
-- See docs/security/stored-content-injection-xss-audit.md (findings #1, #2, #3).

drop policy if exists "Public can read projects by ID" on public.projects;
drop policy if exists "Public can read ready knowledge sources" on public.knowledge_sources;
drop policy if exists "Public can read api endpoints" on public.api_endpoints;
