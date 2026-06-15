# FrontFace — Chatbase Gap Analysis & Master Roadmap

| Field | Value |
|-------|-------|
| Status | **Living document** — read the [Decision & Status](#4-decision--status) table first |
| Product | **FrontFace** (formerly SupportBase) |
| Benchmark | [Chatbase](https://www.chatbase.co) |
| Research method | **Live-verified** in a logged-in Chatbase dashboard via Chrome DevTools, 2026-06-12 |
| Created | 2026-06-12 |
| Owner | Product |

> **For future sessions:** this is the handoff anchor. Section 4 (Decision & Status) is the source of truth for what we're building, what we deferred, and where to start when we pick a deferred item up. Detailed work lives in the subplans listed in Section 5.

> **Branding note:** the product is now **FrontFace**. The codebase still uses `supportbase` / `chatbot` naming (package `@chatbot/ui`, the `supportbase` MCP server, etc.). That rename is a known inconsistency and is **out of scope** for these roadmap docs — wherever this document says FrontFace, the code may still say SupportBase/chatbot.

---

## 1. Context & Product Inventory

FrontFace is an AI support-chatbot platform competing with Chatbase. What it ships today (verified against `docs/product/features/_index.md`, `apps/web/app/(dashboard)/`, and `apps/api/src/routes/`):

- **RAG chat engine** — `apps/api/src/services/chat-engine.ts`, hybrid retrieval over embedded knowledge chunks.
- **Embeddable widget** with **Vapi voice** — `apps/api/src/routes/embed.ts`, in-widget voice calls.
- **Human handoff + live inbox** — `apps/web/app/(dashboard)/inbox/`, agent presence, real-time relay.
- **Lead capture v2 / lead recovery** — `apps/api/src/services/lead-capture-v2.ts`.
- **Pulse micro-surveys** — `apps/web/app/(dashboard)/pulse/`.
- **Knowledge ingestion** — text, PDF/TXT, one-shot URL scrape via **Firecrawl** (`apps/api/src/routes/knowledge.ts`).
- **Analytics** — message counts, top questions (`question-clustering` service), device/geo metadata, feedback issues (`apps/api/src/routes/analytics.ts`).
- **Multi-project, teams, MCP server, public agent page** (`/c/[handle]`).

---

## 2. Live-Verified Gap Matrix

What Chatbase has that FrontFace lacks (every Chatbase capability below was confirmed in the logged-in dashboard on 2026-06-12 unless marked *docs-sourced*):

| # | Gap | Chatbase capability (verified) | FrontFace today | Value / Effort |
|---|-----|--------------------------------|-----------------|----------------|
| 1 | **Conversation insights** | Analytics → **Topics** + **Sentiment** (date-ranged, graph/pie). Plus **Sources → Suggestions**: finds missing content from real questions **and conflicting info across sources** | Message counts + top questions + device/geo; no topics, sentiment, or answer-gap surfacing | High / Medium |
| 2 | **Knowledge sources v2** | Files, Text, **Website (crawl/sitemap/individual link + retrain)**, **Q&A**, **Notion**, **Tickets**; **Auto-retrain every 7 days** | Text, PDF/TXT, one-shot Firecrawl scrape; sources go stale silently | High / Medium |
| 3 | **Channels** | Deploy page: widget, help page, Email, Shopify, **Phone (Beta via Twilio)**, WhatsApp, Messenger, Instagram, Zendesk/Salesforce, **Slack**, WordPress, API, Zapier | Widget + public page only | High / High |
| 4 | **Model selection** | Settings → AI model picker ("GPT-5.5 now available"), temperature, instruction presets | Hardcoded `const MODEL = "gpt-4o-mini"` (`apps/api/src/services/chat-engine.ts:175`) | Medium / Low-Med |
| 5 | **Native action integrations** | Stripe, Shopify, Cal.com/Calendly, Tavily web search, live-chat handover, custom forms, in-chat widgets, escalation to Intercom/HubSpot/Zoho/Freshdesk/Help Scout | Generic custom API endpoints (tool calling) + MCP server — powerful but DIY | Medium / High |
| 6 | **Widget customization** | Content + Style tabs: theme, avatar, launcher icon, two colors, alignment, suggested messages, notice/footer, feedback/copy toggles, localization, voice toggles | `primaryColor` + `title` + `greeting` only; `position` hardcoded `"bottom-right"` (`apps/api/src/routes/embed.ts:188`) | Medium / Low |
| 7 | **Identity verification** | HMAC-signed user identity (*docs-sourced*; live Security tab only showed rate limiting) | `visitorId` in localStorage only | Low-Med / Low |
| 8 | **Phone voice agent** | Phone channel (Beta) via Twilio; Voice + Telephony are Standard-tier | In-widget Vapi voice already works | Medium / Medium |

---

## 3. New Findings (parked as P2/P3 candidates)

Things the original desk research missed, found by walking the live dashboard:

| Finding | What it is | Note for FrontFace |
|---------|-----------|--------------------|
| **Interactive Widget Builder** | AI-powered generative builder (AI Builder / Code / Functions / States tabs) producing **interactive in-chat components** from a prompt or templates (pricing table, order tracker, product card, contact form) | Genuinely differentiated; bigger than basic theming. Own P2/P3 line. |
| **Backstage** | Per-agent AI ops copilot ("audit my config", "how are my credits used", "improve my instructions") | Differentiating, not table-stakes |
| **Help desk** | Built-in ticketing (Standard); resolved tickets feed back as a KB source (Pro) | FrontFace handoff/inbox is halfway there; "human-resolved → KB" is the cheap analog |
| **Outbound campaigns (Beta)** | Proactive WhatsApp campaigns to Contacts, template-based, delivery/read tracking | Depends on channels + contacts; later |
| **Contacts CRM** | Contact records w/ custom attributes, import, API | FrontFace already has customers/leads tables |
| **Pricing intel** | Standard **$120/mo**, Pro **$400/mo**. Gating: auto-retrain / voice / help desk / API = Standard; advanced analytics / suggestions / tickets-as-source = Pro | Benchmark for FrontFace packaging |

---

## 4. Decision & Status

**This is the section to read first.** Decisions made with the user on 2026-06-12:

| Gap | Decision | Status | When we pick it up — start here |
|-----|----------|--------|----------------------------------|
| **1. Conversation Insights** | **Build now** | 🟢 In Subplan 1 | See [Subplan 1, Part A](./subplan-01-insights-and-widget.md#part-a--conversation-insights-gap-1) |
| **6. Widget Customization** (all 4 groups, **no custom domains**) | **Build now** | 🟢 In Subplan 1 | See [Subplan 1, Part B](./subplan-01-insights-and-widget.md#part-b--widget-customization-gap-6) |
| 2. Knowledge Sources v2 | Deferred | ⚪ Not yet planned | Firecrawl-only won't scale at volume. **Reference the user's existing scraping project** before writing a detailed plan. Q&A pairs + auto-retrain (content-hash re-sync) are the v1 scope. |
| 3. Slack channel | Deferred | ⚪ Not yet planned | Chosen angle: let FrontFace **support agents reply to customers from Slack** instead of opening the FrontFace inbox (relay handoff threads into Slack). The "AI agent answers in Slack" mode is secondary. Builds on `docs/PRODUCT_RESEARCH_AND_ROADMAP.md:493` (Part 4). |
| 4. Model selection | **Removed** | ⛔ Won't do | Not crucial; single model is fine for now. |
| 5. Native action integrations | Deferred | ⚪ Not yet planned | Needs a dedicated session; scope unclear. FrontFace already has custom API endpoints + MCP as the DIY substrate. |
| 7. Identity verification | Deferred | ⚪ Not yet planned | HMAC-signed visitor identity for logged-in embeds. Low effort when needed. |
| 8. Phone voice agent | Deferred | ⚪ Not yet planned | Natural extension of existing Vapi voice → inbound phone numbers. |

---

## 5. Subplan Index

| Subplan | Scope | Status |
|---------|-------|--------|
| [Subplan 1 — Insights + Widget](./subplan-01-insights-and-widget.md) | Gap 1 (Conversation Insights) + Gap 6 (Widget Customization) | 🟢 Ready to build |
| Subplan 2 — Knowledge v2 *(future)* | Gap 2 | ⚪ Deferred — reference existing scraping project |
| Subplan 3 — Slack for agents *(future)* | Gap 3 | ⚪ Deferred — agent-replies-via-Slack angle |
| Subplan 4 — Action integrations *(future)* | Gap 5 | ⚪ Deferred |

---

## 6. Sources

- Chatbase Analytics (Topics/Sentiment): https://www.chatbase.co/docs/user-guides/chatbot/analytics
- Chatbase Data Sources (Q&A, Notion, auto-retrain): https://www.chatbase.co/docs/user-guides/chatbot/data-sources
- 2026 reviews: https://chatimize.com/reviews/chatbase/ , https://aigearbase.com/tool/chatbase
- Chatbase Voice launch (May 2026): https://www.globenewswire.com/news-release/2026/05/08/3291228/0/en/chatbase-launches-voice-ai-agents-extending-its-customer-support-platform-from-chat-to-the-phone-line.html
- Live dashboard walkthrough (Topics, Sentiment, Suggestions, Deploy/channels, Actions, Integrations, Settings→AI model picker, chat-widget Content/Style tabs, Contacts, Outbound, Help desk) — captured 2026-06-12.
