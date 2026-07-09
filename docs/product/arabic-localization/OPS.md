# Arabic (Saudi) Localization — Operations Runbook

Everything **you** need to do outside the code to bring the Arabic experience live.
The application code (Phases 1–9) is complete and type-checks clean; these are the
infrastructure, third-party, and configuration steps the code depends on.

> Deploy order: do the **per-project config** first (safe, reversible), then the
> **`ksa.frontface.app`** DNS/TLS/nginx + auth-cookie change (has a one-time
> logout side effect — see §3), then the **ElevenLabs** language enablement.

---

## 1. Per-project language (no infra — just the dashboard)

For each Saudi client project:

1. Dashboard → **Settings → Response language** → choose **العربية — السعودية (ar-SA)**.
2. Save. This writes `projects.settings.language = { default: "ar-SA" }` (merged into
   existing settings — nothing else is touched).

Effect: greetings, AI replies (Saudi/Gulf dialect), widget + public-page UI, voice, and
WhatsApp all default to Arabic for that project. Visitors who write in English still get
English replies (auto-detected, then pinned per conversation).

> There is a **60-second** project-config cache on the API. After changing the setting,
> wait up to a minute before testing.

---

## 2. `ksa.frontface.app` subdomain (Arabic-by-default host)

Three infra steps. All three are required — the middleware reads the `Host` header, and
TLS must cover the subdomain or the request never reaches nginx.

### 2a. Cloudflare DNS
Add a record for `ksa` pointing at the **same origin** as `frontface.app`:

```
Type: A (or CNAME)     Name: ksa     Content: <same target as frontface.app>     Proxy: (match your apex)
```

### 2b. TLS certificate
`ksa.frontface.app` **must** be on the served certificate, or the browser fails at the
TLS handshake before nginx sees the request. Either:
- a wildcard `*.frontface.app` cert, **or**
- add `ksa.frontface.app` as a SAN to the existing cert (e.g. certbot `-d frontface.app -d ksa.frontface.app`).

### 2c. nginx
Add the host to the existing `server_name` on the **same** upstream block, and make sure
the real Host header is forwarded (the app maps host → locale):

```nginx
server {
    server_name frontface.app ksa.frontface.app;   # add ksa here
    # ... existing config ...
    location / {
        proxy_pass http://<app-upstream>;
        proxy_set_header Host $host;                # required — do not hardcode a host
        # ... existing proxy headers ...
    }
}
```

Reload nginx (`nginx -t && systemctl reload nginx`).

**Result:** visiting `https://ksa.frontface.app` defaults the whole hosted app to Arabic
(RTL). The in-app language switcher still lets a user flip to English — Arabic is the
default, not a lock. (Marketing routes with no Arabic translation — `/blog`, `/vs`,
`/use-cases` — intentionally stay English even on this host.)

---

## 3. Shared login across `frontface.app` ↔ `ksa.frontface.app` (SSO)

The code sets the Supabase auth cookie's `domain` to `.frontface.app` on production hosts
(host-only on localhost/previews, unchanged). One login now spans both hosts, and logout
clears it on both.

> **One-time side effect on first deploy:** existing logged-in users hold an old
> *host-only* `sb-*` cookie. The new cookie is domain-scoped, so the browser briefly holds
> both and **currently-logged-in users are asked to log in once** after this deploys. This
> is expected and was chosen deliberately (no migration code). New logins are unaffected.
> Consider deploying during a low-traffic window and/or noting it to active users.

Nothing for you to configure here — it's automatic on `*.frontface.app`. Just be aware of
the one-time re-login.

---

## 4. Voice (ElevenLabs) Arabic

The app passes `language: "ar"` (and localized spoken greeting + silence/error lines) to
the ElevenLabs agent **for non-English projects only**. English projects send no language
override, so the existing English voice path is unaffected by the steps below.

For Arabic voice to work, two **distinct** things must both be true on the
Conversational-AI agent behind `ELEVENLABS_AGENT_ID` in the **ElevenLabs dashboard**:

1. **Arabic is available:** use a **multilingual** model (a multilingual `eleven_*` model)
   and **add Arabic** as an additional/supported language in the agent's language settings.
2. **The Language override is allowed:** under **Security → Overrides**, enable the
   **Language** override toggle. This is *separate* from step 1 and from the "Custom LLM
   extra body" override already enabled for `firstMessage`/extra_body. If it's off, the
   `language: "ar"` override is silently dropped and you get **Arabic text spoken by the
   English voice/model** (or a session error) — the classic "half-works" symptom.
3. (Optional) set an Arabic-tuned voice for better TTS quality.

No code/env change is needed — only this agent-side enablement.

---

## 5. Environment variables

No **new** env vars were introduced for localization. Confirm the existing voice vars are
set wherever the API runs (only needed if voice is used):

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`

(Cross-lingual retrieval and translation reuse the existing OpenAI client — no new keys.)

---

## 6. Post-deploy verification (needs the servers running)

Run these once everything above is applied. Items 1–7 are self-serviceable; item 8 is the
required native sign-off.

1. **Config persists:** set a project to `ar-SA`, reload Settings — still selected.
2. **AI dialect:** send an Arabic message in the widget → Saudi-Arabic reply; stays Arabic
   across turns; a full English message switches to English. (Wait out the 60 s cache.)
3. **Cross-lingual RAG:** Arabic question against an English KB → relevant answer built
   from the native chunk text; no false handoff.
4. **No English leaks:** run a qualifying-question flow, force a fallback (LLM error), and
   trigger a handoff — all stay Arabic.
5. **Greeting:** Arabic greeting even from an `en-US` browser (project default wins).
6. **Widget + public page RTL:** `dir="rtl"`, Arabic font, correct bidi on mixed
   Arabic + Latin/number text.
7. **Subdomain + SSO:** `curl -I -H "Host: ksa.frontface.app" https://<origin>/` serves the
   Arabic default; log in on `frontface.app`, confirm the session carries to `ksa.*`; log
   out on one host and confirm you're logged out on the other.
8. **Voice + WhatsApp:** start a voice call on an Arabic project → agent greets/converses in
   Arabic; reply to an Arabic WhatsApp message → Arabic answer; send a non-text WhatsApp
   message → Arabic "please send text" notice.
9. **Native sign-off (required):** a Saudi native reviews dialect fidelity (text **and**
   voice). `gpt-4o-mini` dialect quality is the one thing that can't be self-verified; an
   optional per-project stronger-model override is a later lever if needed.

---

## Rollback

- **Per-project:** set Response language back to **Auto** — instantly reverts that project
  to English defaults + auto-detect.
- **`ksa` host:** remove `ksa` from nginx `server_name` (and/or DNS). The auth-cookie domain
  logic is inert off `*.frontface.app`; to fully revert SSO, redeploy without the
  `cookieOptions.domain` change (users re-login once more).
- **Voice:** disabling Arabic on the ElevenLabs agent makes `ar` projects fail voice
  *connect* (text chat unaffected) — prefer leaving it enabled.
