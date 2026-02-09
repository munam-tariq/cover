# SupportBase Pricing Strategy

## Our Unit Economics

### Text Chat (per message)

| Component | Cost |
|-----------|------|
| OpenAI Embedding (text-embedding-3-small, ~50 tokens) | $0.000001 |
| GPT-4o-mini input (~2,000 tokens @ $0.15/1M) | $0.000300 |
| GPT-4o-mini output (~200 tokens @ $0.60/1M) | $0.000120 |
| Supabase pgvector query | ~$0.000000 |
| **Total per message** | **~$0.00042 (0.04 cents)** |

**~2,375 messages per dollar. Text chat is essentially free.**

### Voice Call (per minute, via Vapi)

| Component | Cost/min |
|-----------|----------|
| Vapi platform fee | $0.0500 |
| Deepgram Nova 3 (STT) | $0.0100 |
| Google Gemini 2.5 Flash (LLM) | $0.0020 |
| Deepgram Aura 2 (TTS) | $0.0108 |
| **Total per minute** | **~$0.073 (7.3 cents)** |

Conservative estimate with overhead: **~$0.10/min (10 cents)**

### Monthly Fixed Infrastructure

| Service | Cost |
|---------|------|
| Supabase Pro | $25 |
| Server hosting | $20 |
| Domain + misc | $10 |
| **Total** | **~$55/month** |

---

## Competitive Landscape

### Direct Competitors (AI Chatbot Builders)

| Platform | Entry Tier | Mid Tier | Top Tier | Model | Voice AI |
|----------|-----------|----------|----------|-------|----------|
| **Chatbase** | $40/mo (2K credits) | $150/mo (12K credits) | $500/mo (40K credits) | Per-credit | No |
| **Tidio** | $29/mo (100 convos) | $59-349/mo | $749/mo | Per-conversation | No |
| **ChatBot.com** | $52/mo (12K chats/yr) | $142/mo | $424/mo | Flat + overage | No |
| **Crisp** | ~$49/mo (4 seats) | ~$103/mo (10 seats) | ~$320/mo (20 seats) | Per-workspace | No |

### Enterprise (not our target, but useful for anchoring)

| Platform | Starting Price | Model |
|----------|---------------|-------|
| **Intercom** | $29/seat + $0.99/AI resolution | Per-seat + per-resolution |
| **Drift/Salesloft** | $2,500/mo | Sales-led |
| **LiveChat** | $19/agent/mo | Per-agent |

### Voice AI Platforms

| Platform | Cost/min | Model |
|----------|----------|-------|
| **Retell AI** | $0.07 | All-in bundled |
| **Bland.ai** | $0.09-0.11 + subscription | Sub + per-min |
| **Vapi** (our provider) | $0.07-0.15 all-in | Component-based |
| **Voiceflow** | Credit-based | Credits |

### Key Insight: Voice is our moat

**None of the direct chatbot competitors (Chatbase, Tidio, ChatBot, Crisp) offer voice AI.** Adding voice to chat makes us the only product in the $49-249/mo range that does both. This is a genuine differentiator worth pricing for.

---

## Market Signals

### What customers say (Reddit/forums)

- **#1 complaint**: "Intercom is too expensive for small teams" — recurring theme across r/SaaS, r/startups
- **Price sensitivity**: Indie hackers/startups are willing to pay $29-99/mo for AI chat tools. $150+/mo triggers serious evaluation
- **Voice + chat combo** is seen as the future: "Yes voice + chat combo is exactly what many businesses need" (r/SaaS)
- **AI wrapper fatigue**: Users are skeptical of products that "just slap a shiny UI on GPT" — we need to show real value (lead capture, qualifying, SDR behavior)
- **Self-hosted demand**: ~7% of all tool requests specify wanting self-hosted options — future opportunity
- **SMB budget**: Small businesses building on a budget target $29/mo for customer support AI

### Industry benchmarks

- AI SaaS gross margins: 50-60% (vs 80-90% traditional SaaS)
- Standard markup on LLM costs: 30-50% (effective multiplier: 3-5x)
- Free-to-paid conversion: 2-5% (freemium), 8-12% (free trial)
- Credit-based models grew 126% YoY — now the dominant AI pricing model
- Annual billing discount standard: 16-20% ("2 months free")
- Per-seat pricing: declining, 40% lower margins, 2.3x higher churn vs usage models

---

## Pricing Decision Framework

### What we chose and why

**Model: Hybrid flat subscription + message/voice credits**

Rationale:
1. Flat base gives predictable revenue and covers infrastructure
2. Message limits scale with usage (high-margin since chat is ~$0.00042/msg)
3. Voice minutes priced separately (10-50x more expensive than chat)
4. Credits are the dominant model in AI SaaS (126% YoY growth)
5. No per-seat pricing — it's declining and causes churn

**No free tier. 14-day free trial instead.**

Rationale:
1. Every free user costs us real money in inference
2. Free-to-paid conversion is only 2-5% vs 8-12% for trials
3. Chatbase's free tier (100 credits) creates a permanent cost center
4. Our target (SMBs, not hobbyists) expect to pay for business tools

---

## The Pricing Plan

### Three tiers + Enterprise

| | **Starter** | **Pro** ⭐ | **Growth** | **Enterprise** |
|---|---|---|---|---|
| **Monthly** | **$49/mo** | **$99/mo** | **$249/mo** | Custom |
| **Annual** | $39/mo | $79/mo | $199/mo | Custom |
| | | | | |
| **AI Chat Messages** | 2,000/mo | 10,000/mo | 30,000/mo | Unlimited |
| **Voice Minutes** | — | 50 min/mo | 200 min/mo | Custom |
| **Projects** | 1 | 3 | 10 | Unlimited |
| **Knowledge Sources** | 20 | 100 | 500 | Unlimited |
| **Team Members** | 1 | 3 | 10 | Unlimited |
| | | | | |
| **Lead Capture** | Basic form | Qualifying questions | Qualifying + CRM export | Custom |
| **Human Handoff** | — | Included | Included | Included |
| **Analytics** | Basic | Advanced | Advanced | Custom |
| **Widget Customization** | Colors only | Full branding | Full branding | White-label |
| **API/MCP Access** | — | Included | Included | Included |
| **Support** | Email | Priority email | Dedicated | SLA |
| | | | | |
| **Overage: Extra Messages** | $5 per 1,000 | $4 per 1,000 | $3 per 1,000 | Custom |
| **Overage: Extra Voice** | N/A | $0.25/min | $0.20/min | Custom |

### Add-ons (any plan)

| Add-on | Price |
|--------|-------|
| Remove "Powered by SupportBase" branding | $39/mo |
| Custom domain for widget | $29/mo |
| Additional projects (beyond plan limit) | $15/project/mo |
| Additional team members (beyond plan limit) | $10/seat/mo |

---

## Margin Analysis

### Per-Plan Profitability

**Starter ($49/mo) — Target customer uses ~1,500 messages**

| | Amount |
|---|---|
| Revenue | $49.00 |
| Variable cost (1,500 msgs × $0.00042) | $0.63 |
| Infrastructure allocation (1/10th) | $5.50 |
| **Gross profit** | **$42.87 (87.5%)** |

**Pro ($99/mo) — Target customer uses ~7,000 messages + 30 voice minutes**

| | Amount |
|---|---|
| Revenue | $99.00 |
| Variable cost: chat (7,000 × $0.00042) | $2.94 |
| Variable cost: voice (30 min × $0.10) | $3.00 |
| Infrastructure allocation (1/10th) | $5.50 |
| **Gross profit** | **$87.56 (88.4%)** |

**Growth ($249/mo) — Target customer uses ~20,000 messages + 150 voice minutes**

| | Amount |
|---|---|
| Revenue | $249.00 |
| Variable cost: chat (20,000 × $0.00042) | $8.40 |
| Variable cost: voice (150 min × $0.10) | $15.00 |
| Infrastructure allocation (1/10th) | $5.50 |
| **Gross profit** | **$220.10 (88.4%)** |

**All tiers maintain 85%+ gross margins at typical usage, well above the 50-60% AI SaaS average.**

The reason: GPT-4o-mini and Gemini 2.5 Flash are extremely cost-efficient. Our optimized stack (Deepgram for both STT and TTS) keeps voice costs at the low end.

### Break-even

- **Fixed costs**: $55/month
- **Break-even**: 2 Starter customers or 1 Pro customer

---

## Pricing Page Design

### Layout (proven 3-tier + enterprise pattern)

```
┌─────────────┬──────────────────┬─────────────┬──────────────┐
│   Starter   │   Pro ⭐         │   Growth    │  Enterprise  │
│   $49/mo    │   $99/mo         │   $249/mo   │  Contact Us  │
│             │  "Most Popular"  │             │              │
│  2K msgs    │  10K msgs        │  30K msgs   │  Unlimited   │
│  No voice   │  50 voice min    │  200 voice  │  Custom      │
│  1 project  │  3 projects      │  10 projects│  Unlimited   │
│             │                  │             │              │
│ [Start      │ [Start Free      │ [Start      │ [Contact     │
│  Trial]     │  Trial] ←        │  Trial]     │  Sales]      │
│             │  highlighted     │             │              │
└─────────────┴──────────────────┴─────────────┴──────────────┘

Toggle: [Monthly] [Annual — Save 2 months]

Trust signals:
- "14-day free trial, no credit card required"
- "Cancel anytime"
- "All plans include: SSL, Shadow DOM isolation, Mobile responsive"
```

### Why this works

1. **Pro is the obvious choice**: voice included, 3 projects, 5x messages vs Starter for only 2x the price
2. **Starter is the decoy**: limited enough (no voice, 1 project) to drive upgrades
3. **Growth is for agencies/multi-product**: 10 projects at $249 is $24.90/project
4. **Enterprise anchors upward**: makes $99 feel very reasonable
5. **Annual discount = "2 months free"**: concrete, compelling, drives commitment

---

## Comparison With Competitors

### How we position on the pricing page

| Feature | SupportBase Pro ($99/mo) | Chatbase Standard ($150/mo) | Tidio Growth ($59/mo + Lyro) |
|---------|--------------------------|----------------------------|------------------------------|
| AI Messages | 10,000 | 12,000 credits | 250 convos + $39 for AI |
| Voice AI | 50 min included | No | No |
| Projects | 3 | 2 | 1 |
| Lead capture | Qualifying questions | Basic | Basic |
| Human handoff | Included | Extra | Extra |
| MCP integration | Included | No | No |
| White-label | $39 add-on | $39 add-on | $20 add-on |

**Our positioning**: "The only AI agent that does both chat and voice, with built-in lead qualification — for less than Chatbase."

---

## Landing Page Pricing Copy

### Headline
**"Simple pricing. No surprises."**

### Subheadline
"Start with a 14-day free trial. No credit card required. Upgrade when you're ready."

### FAQ items for pricing section

**Q: What counts as a message?**
A: One message = one customer message + one AI response. System messages, greetings, and form submissions don't count.

**Q: What happens when I hit my message limit?**
A: You can keep chatting. Overage messages are billed at your plan's overage rate. We'll notify you at 80% and 100%.

**Q: How are voice minutes counted?**
A: Voice minutes are billed per second of active call time. A 45-second call is billed as 0.75 minutes.

**Q: Can I change plans anytime?**
A: Yes. Upgrade instantly, downgrade at the end of your billing cycle. No long-term contracts.

**Q: Do you offer a discount for annual billing?**
A: Yes — save 2 months when you pay annually. That's ~20% off.

---

## Implementation Checklist

- [ ] Add pricing page to landing page (section or separate /pricing route)
- [ ] Implement usage tracking: message count per project per billing period
- [ ] Implement voice minute tracking per project per billing period
- [ ] Add Stripe integration for billing (subscriptions + metered usage)
- [ ] Build usage dashboard showing messages used / limit
- [ ] Add overage alerts at 80% and 100% of plan limits
- [ ] Build plan upgrade/downgrade flow in settings
- [ ] Add annual/monthly toggle billing

---

*Strategy created: February 2026*
*Based on: Competitor analysis (10 platforms), social signal research (Reddit/forums), unit economics calculation, AI SaaS pricing best practices research*
