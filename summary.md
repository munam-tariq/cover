# FrontFace Market Positioning — Work Summary

**Date:** 2026-06-17
**Goal:** Analyze Chatbase as a competitive reference, then make FrontFace's market positioning clear and consistent across the marketing site (hero, landing, pages, blog).

---

## 1. Chatbase analysis (the reference)

Captured live from chatbase.co + public ad libraries.

### Positioning
- **Category:** Repositioned from "build a custom GPT chatbot on your data" → **"The Leading AI Customer Service Platform."**
- **Homepage one-liner (note the discipline — one line, one job):**
  > "Chatbase is the complete platform for building & deploying AI support agents for your business."
- **Core promise everywhere:** automate support, deflect tickets, **"scale without adding headcount."**

### Target audience
- Moved **up-market** — dedicated `/enterprise`, SOC 2 Type II, GDPR, guardrails, whitelabel, 80+ languages.
- Trust logos are big mainstream brands (Chuck E. Cheese, Bridgestone, IHG, National Grid, Miele, Noon); "10,000+ businesses."
- Their own ad copy: *"hundreds of mid-market/enterprise + thousands of SMEs."*
- **They effectively vacated the SMB/founder niche — that is FrontFace's wedge.**

### Information architecture (their content engine)
- **Solutions → By use-case:** Customer Support Agent · Sales Agent
- **Solutions → By industry:** Ecommerce & Retail · Education · Fitness & Wellness · Travel & Hospitality (each with a one-line, task-specific promise)
- **Blog = pure buyer-intent SEO:** pillar guides, listicles that self-rank ("5 Best AI Chatbots…"), buying guides, competitor-capture ("12 Best Zendesk Alternatives").
- **Integrations skew to the support stack** (Zendesk, Salesforce, Stripe, Slack, WhatsApp) — vs FrontFace's website-platform skew (Shopify/WP/Wix).

### Ads
- **Google Ads Transparency:** ~800–900 ads to the domain, mostly **affiliate/agency** accounts. First-party samples: *"Build your AI support agent in minutes… scale without extra hiring"* / *"No-Code Chatbot Builder."*
- **LinkedIn (their real channel):** founder-led, build-in-public posts from CEO Yasser Elsaid (product drops, "$8M ARR, 100% bootstrapped," POV pieces).
- **Growth engine = SEO + founder brand + PLG free tier**, not paid performance. (One partner ad: *"turned AI search [SEO] into their No. 2 acquisition channel."*)

---

## 2. The FrontFace problem (diagnosis)

The old positioning was **feature-led and incoherent**:
- Hero H1: *"An AI agent that actually knows your product"* — memorable, but the buyer doesn't wake up wanting "an agent that knows my product." They wake up with pains: *same questions over and over / too slow / can't hire fast enough / leads leave / nobody reads the docs.*
- Subhead crammed **4 promises into 3 lines** (answers + sources + leads + handoff + anywhere).
- **Lead-capture framing** lingered in title, meta, hero, use-cases, and a blog post — the residue that made everything feel "off."
- Title-tag bug double-suffixed `| FrontFace | FrontFace` on several pages.

---

## 3. The decision (positioning system)

**Outcome-led, not feature-led. Audience: SMB / founders / startups** (the segment Chatbase vacated).

- **Canonical one-liner:**
  > "FrontFace resolves customer questions instantly from your knowledge base — so you support more customers without hiring more agents."
- **Hero headline = the outcome:** "Resolve customer questions instantly."
- **"Knows your product" → demoted to PROOF** (grounded answers + cited sources + the demo's source chips + the pill badge). Never the headline.
- **Lead capture stays but is always secondary.**
- **Anchor copy to buyer pains, not features.**

---

## 4. Changes made

Changes touch marketing content, `next.config.js` redirects, and the shared OG image asset. Verified locally on `localhost:3000`. **Nothing committed** — left in the working tree for IDE review.

### Pass 1 — hero + home
| Change | File |
|---|---|
| Hero H1 → "Resolve customer questions instantly" + tightened 2-line subhead | `components/hero-section.tsx` |
| Home `<title>` + meta description + FAQ schema → outcome one-liner | `page.tsx` |
| Footer tagline → outcome-led | `components/footer.tsx` |
| **Bug fix:** removed double `| FrontFace` suffix | `use-cases/page.tsx`, `integrations/page.tsx` |
| **Dead code:** deleted old blue "leaking leads / AI-Powered Lead Capture" hero | ~~`components/hero.tsx`~~ |

### Pass 2 — pages + blog
| Change | File(s) |
|---|---|
| Use-cases hero sub + metadata → resolution-first (cards were already pain-led) | `use-cases/page.tsx` |
| About hero → "Great support shouldn't need a big team." + metadata de-leaded | `about/page.tsx` |
| Retired 2 off-theme posts (Vibe Coding, MCP Protocol) | `blog/blog-data.ts` |
| Added 4 buyer-intent posts (see below) | `blog/blog-data.ts` |
| Blog posts use the shared real OG asset instead of missing `/blog/*.png` paths | `blog/blog-data.ts`, `public/og-image.png` |
| Retired blog slugs redirect to relevant replacement posts | `next.config.js` |
| OG/Twitter alt text "knows your product" → "resolves customer questions instantly" on **8 pages** | home, use-cases, integrations, about, terms, privacy, blog, features |
| **Bug fix:** title double-suffix also on features / privacy / terms | 3 pages |

### Dead-code cleanup
Deleted **13 unused** marketing components (verified zero importers app-wide):
`faq` · `showcase-section` · `problem-section` · `features-bento` · `code-section` · `cta-section` · `trust-section` · `vibe-code-showcase` · `pricing` · `animated-grid-pattern` · `for-developers` · `metrics-bar` · `works-with`.
(Kept `cursor-glow` + `scroll-progress` — used in `(marketing)/layout.tsx`.)

### Final follow-ups
- `/features` hero + metadata made outcome-led.
- Added honest 3-way comparison post `frontface-vs-chatbase-vs-intercom`.
- `how-to-add-ai-chatbot-to-website` refreshed 2025 → 2026 (title, body, date).
- Updated `public/og-image.png` from the actual FrontFace hero screenshot at 1200×630.

---

## 5. Blog — final state (8 posts, all on-theme buyer-intent SEO)

**Kept:** How to Add an AI Chatbot to Your Website (2026) · AI Customer Support: Complete Guide for Startups · RAG vs Traditional Chatbots · Chatbot Lead Generation
**Added:** How to Cut Support Tickets Without Hiring (2026) · Best AI Customer Support Tools for Startups (2026) · How to Add AI Support to Your Shopify Store · FrontFace vs Chatbase vs Intercom Fin
**Removed:** The Rise of Vibe Coding · MCP Protocol (off-theme dev-trend topics)

---

## 6. Result

The site now tells **one story top to bottom** — hero → use-cases → integrations → features → about → blog all lead with **resolve customer questions instantly / without hiring**, with "knows your product" as proof and lead-capture secondary. Voice and proof target SMB/founders — the segment Chatbase abandoned going enterprise. The blog runs the same buyer-intent SEO playbook Chatbase uses, aimed at the customers they left behind.

---

## 7. Still open (optional, not done)

- `/features` page is reachable via the About CTA but isn't in the header/footer nav — decide whether to surface it.
- The 13 deleted components are git-recoverable if any was wanted as WIP.

## Notes
- All edits are in the working tree; **no git commits/staging** were made (per workflow — review in IDE).
- Competitive detail lives in project memory (`chatbase-competitive-reference`, `landing-redesign`).
