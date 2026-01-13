# SupportBase Landing Page - Comprehensive Plan

## Research Summary

This plan synthesizes research from:
- 100+ developer tool landing pages (Evil Martians study)
- Top SaaS landing page galleries (SaaSLandingPage.com, Landingfolio, Lapa Ninja)
- Competitor analysis (Intercom, Crisp, Chatbase, Cursor, Drift)
- Conversion optimization best practices (Unbounce, KlientBoost)
- The "Linear Look" design trend analysis
- Framer Motion animation patterns
- Magic UI & shadcn component libraries
- **Visual Analysis** (via Playwright): Linear.app, Cursor.com, Vercel.com, Raycast.com, Chatbase.co

---

## Visual Research Findings (January 2025)

### Key Patterns from Top Landing Pages

**Linear.app:**
- Dark background (#0a0a0a), white headline text
- Product screenshots as hero visual
- Customer logos (Stripe, OpenAI, Vercel, Cursor)
- Feature cards with abstract gradient illustrations
- "Made for modern product teams" positioning

**Cursor.com (Our closest reference):**
- Light theme with ARTISTIC landscape wallpaper backdrop - memorable and unique
- **Interactive product demo in hero** showing actual IDE with AI assistance
- Headline: "Built to make you extraordinarily productive, Cursor is the best way to code with AI"
- Premium testimonials from industry leaders (Andrej Karpathy, Patrick Collison, Greg Brockman, shadcn, Diana Hu from YC)
- Feature cards with LIVE interactive demos
- Model selection UI showing multiple AI models
- Changelog section shows active development

**Vercel.com:**
- Light theme with rainbow gradient visual (Vercel logo with radiating colors)
- **Tabs for different use cases** (AI Apps, Web Apps, Ecommerce, Marketing)
- Customer metrics with SPECIFIC numbers ("build times went from 7m to 40s")
- Animated globe showing global infrastructure
- Real-time stats (model usage percentages)
- Framework logos as trust signals

**Raycast.com:**
- Dark theme with **dramatic red light beams/brushstrokes**
- **Keyboard visual** - brilliant metaphor for keyboard-first product
- Real user avatars with Twitter handles (not fake testimonials)
- Extension grid showing ecosystem (Linear, Slack, Notion, etc.)
- Community stats: "32k Slack members", "80k Twitter followers"
- Developer section emphasizing React/TypeScript

**Chatbase.co (Direct Competitor):**
- Light theme, clean corporate design
- **Video demos** (not static images) - auto-playing product showcase
- Testimonials from OpenAI (Marc Manara), Google (Logan Kilpatrick), Pinecone
- Strong security messaging (SOC 2, GDPR badges)
- Integration logos carousel
- "No credit card required" trust indicator
- Stats: "10,000+ businesses", "140+ countries"

### Key Takeaways for SupportBase

1. **We MUST have an interactive demo** - Every top site shows their product working
2. **Dark theme is valid** but Cursor proves light can work with artistic visuals
3. **Video/animated demos >> static screenshots**
4. **Real integrations are credibility** (Cursor, Claude, OpenAI)
5. **Differentiate from Chatbase** - They target businesses, we target vibe coders
6. **The Vibe Demo must be our WOW moment** - like Cursor's hero demo

### Magic UI Components to Use

Based on research, these specific components will work well:

| Component | Use Case |
|-----------|----------|
| **Bento Grid** | Features section layout |
| **Marquee** | Integration logos scrolling |
| **Text Reveal** | Scroll-triggered text animations |
| **Animated Beam** | Data flow visualization in RAG feature |
| **Border Beam / Shine Border** | Card hover effects |
| **Number Ticker** | Animated stats (if we have real ones) |
| **Typing Animation** | Hero code block effect |
| **Animated Gradient Text** | "In one line" highlight |

Install command: `npx shadcn@latest add [component-name]` (from magicui.design)

---

## Part 1: Strategic Positioning

### The Big Differentiator

**SupportBase is NOT just another chatbot platform.**

While competitors like Intercom, Chatbase, and Crisp target traditional business users who navigate dashboards, SupportBase is purpose-built for the **vibe coding era**:

> "The AI chatbot that lives where you code."

### Target Audience Segments

| Segment | Primary Need | Key Message |
|---------|-------------|-------------|
| **Vibe Coders** | Add chatbot without leaving Cursor/Claude | "Just ask your AI to add a chatbot" |
| **Indie Hackers** | Ship support fast, no complexity | "15 minutes from zero to live" |
| **Startups** | Professional support without hiring | "Your 24/7 support team" |
| **Developers** | Clean integration, no bloat | "One script tag. Works everywhere." |

### Competitive Positioning Matrix

```
                    Simple Setup
                         │
            SupportBase ●│
                         │
    Vibe Coding ─────────┼───────── Dashboard-First
     Native              │
                         │        ● Chatbase
                   Crisp ●        ● Intercom
                         │
                    Complex Setup
```

---

## Part 2: Core Value Propositions

### Primary Value Prop (Hero)
**"Add an AI chatbot to your app. In one line."**

Subheadline: "SupportBase works with Cursor, Claude, and your favorite AI tools. Upload docs, get embed code, ship support—all without leaving your editor."

### Supporting Value Props

1. **MCP-Native** - "The chatbot platform built for AI-first development"
2. **15-Minute Setup** - "From zero to live chatbot in 15 minutes"
3. **Knowledge-Powered** - "Train on your docs. Answer like an expert."
4. **Zero Friction** - "One script tag. Works on any website."

---

## Part 3: Page Architecture

### Section Flow (Psychological Journey)

**Note: Designed for authentic early-stage launch - no fake logos, stats, or testimonials**

```
┌─────────────────────────────────────────────────────────────────┐
│  1. HERO                                                        │
│     Attention → "Add an AI chatbot. In one line."               │
│     Immediate clarity on what this is                           │
├─────────────────────────────────────────────────────────────────┤
│  2. WORKS WITH (replaces Social Proof)                          │
│     Credibility → Real integrations: Cursor, Claude, OpenAI     │
│     These are REAL - we actually integrate with them            │
├─────────────────────────────────────────────────────────────────┤
│  3. THE VIBE CODING DEMO                                        │
│     The WOW moment → Show MCP workflow in action                │
│     "Ask Claude to add a chatbot. Watch it happen."             │
├─────────────────────────────────────────────────────────────────┤
│  4. HOW IT WORKS                                                │
│     Clarity → 3-step process                                    │
│     1. Upload knowledge  2. Get embed code  3. Ship             │
├─────────────────────────────────────────────────────────────────┤
│  5. FEATURES BENTO                                              │
│     Interest → Key capabilities in visual grid                  │
│     RAG, Tool Calling, Lead Capture, Analytics                  │
├─────────────────────────────────────────────────────────────────┤
│  6. OPEN SOURCE / TECH CREDIBILITY                              │
│     Trust → Built with proven tech stack                        │
│     "Built on OpenAI, Supabase, pgvector"                       │
├─────────────────────────────────────────────────────────────────┤
│  7. FAQ                                                         │
│     Objection Handling → Common questions                       │
├─────────────────────────────────────────────────────────────────┤
│  8. FINAL CTA                                                   │
│     Action → "Start building. It's free."                       │
├─────────────────────────────────────────────────────────────────┤
│  9. FOOTER                                                      │
│     Navigation + Legal + Social                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Sections Removed (no content available):**
- ~~Social Proof Bar~~ → Replaced with "Works With" (real integrations)
- ~~Testimonials~~ → Removed entirely (no real users yet)
- ~~Pricing~~ → Can add later or keep it simple "Free to start"
- ~~Problem Section~~ → Merged into hero subheadline (keep it concise)

---

## Part 4: Section-by-Section Content & Design

### Final Section List (9 Sections - Authentic Early-Stage)

| # | Section | Purpose | Authentic Content? |
|---|---------|---------|-------------------|
| 1 | Hero | Hook + Primary CTA | ✅ Our real product |
| 2 | Works With | Tech credibility | ✅ Real integrations (Cursor, Claude, OpenAI) |
| 3 | Vibe Demo | WOW moment - key differentiator | ✅ Real MCP workflow |
| 4 | How It Works | 3-step clarity | ✅ Real process |
| 5 | Features Bento | Capability showcase | ✅ Real features |
| 6 | Built With | Tech stack credibility | ✅ Real tech (OpenAI, Supabase, pgvector) |
| 7 | FAQ | Objection handling | ✅ Real questions |
| 8 | Final CTA | Conversion push | ✅ Real offer |
| 9 | Footer | Navigation + Legal | ✅ Standard |

**Removed Sections (No Content Available):**
- ~~Social Proof Bar~~ - No customers yet
- ~~Testimonials~~ - No real quotes yet
- ~~Detailed Pricing~~ - Keep simple "Free to start"
- ~~Problem Section~~ - Merged into hero copy

---

### Section 1: Hero

**Layout:** Centered, full viewport height

**Headline:**
```
Add an AI chatbot to your app.
In one line.
```

**Subheadline:**
```
SupportBase works with Cursor, Claude, and your favorite AI tools.
Upload your docs, get an embed code, ship—all without leaving your editor.
```

**CTA Buttons:**
- Primary: "Get Started Free" → Dashboard signup
- Secondary: "See it in action" → Scroll to demo

**Visual Element:**
- Animated code block showing the single script tag
- Subtle gradient glow behind it
- The code should "type" itself on load

```html
<script src="https://supportbase.app/widget.js"
        data-project-id="your-project" async>
</script>
```

**Design Notes:**
- Dark background (#0a0a0a or #050505)
- Large, bold headline (56-72px on desktop)
- Subtle gradient text effect on "one line"
- Minimal, no clutter
- Trust badge: "No credit card required"

---

### Section 2: Works With (Real Integrations)

**Layout:** Horizontal row of integration logos

**Copy:** "Works with your favorite AI tools"

**Integrations (ALL REAL - we actually support these):**
- **Cursor** - MCP integration
- **Claude Code** - MCP integration
- **OpenAI** - Powers the chat (GPT-4o-mini)
- **Supabase** - Database & auth
- Plus: "Any website" badge (React, Next.js, HTML, etc.)

**Design Notes:**
- Clean, minimal logo display
- Not a carousel (we don't have many yet, static is more honest)
- Each logo links to relevant docs/integration guide
- This is CREDIBILITY through real tech, not fake customers

**Why this works for early-stage:**
- These are real integrations we support
- Shows technical credibility
- Developers recognize and trust these brands
- No fake customer logos needed

---

### Section 3: The Vibe Coding Demo (KEY DIFFERENTIATOR)

**Layout:** Full-width immersive section

**Headline:** "Just ask your AI to add a chatbot."

**Subheadline:** "SupportBase is the first chatbot platform built for vibe coding."

**Interactive Demo - Implementation Details:**

Based on Cursor's hero demo approach, create a TWO-PANEL layout:

```
┌────────────────────────────────────────────────────────────────────┐
│  LEFT PANEL: Claude/Cursor Terminal     │  RIGHT PANEL: Live Result│
│                                          │                          │
│  You: "Add a customer support chatbot   │  ┌──────────────────────┐│
│        to my app that knows about our   │  │   your-app.com       ││
│        pricing and features"            │  │                      ││
│                                          │  │  [Your app content]  ││
│  Claude: I'll set up a SupportBase      │  │                      ││
│  chatbot for you.                       │  │                      ││
│                                          │  │         ┌─────┐     ││
│  ⬢ Creating project "App Support"... ✓  │  │         │ 💬  │     ││
│  ⬢ Uploading docs to knowledge base...✓ │  │         └─────┘     ││
│  ⬢ Getting embed code...               │  │        Widget appears!││
│                                          │  └──────────────────────┘│
│  Done! Your chatbot is now live.        │                          │
└────────────────────────────────────────────────────────────────────┘
```

**Animation Sequence:**
1. Terminal typing animation (300ms per character)
2. "Thinking" indicator with dots animation
3. Checkmarks appear one by one (400ms delay between each)
4. Right panel fades in the widget bubble
5. Widget expands to show first message: "Hi! How can I help?"

**Visual Design (Inspired by Cursor):**
- Dark terminal background with subtle blue glow
- Monospace font (JetBrains Mono or Berkeley Mono)
- Colored syntax highlighting
- Subtle background gradient or artistic element
- Smooth spring animations (framer-motion)

**Technical Implementation:**
```tsx
// Use framer-motion for orchestrated sequence
const sequence = {
  userMessage: { delay: 0, duration: 2 },
  claudeResponse: { delay: 2.5, duration: 1.5 },
  step1: { delay: 4.5, duration: 0.5 },
  step2: { delay: 5.5, duration: 0.5 },
  step3: { delay: 6.5, duration: 0.5 },
  widgetAppear: { delay: 7.5, duration: 0.8 },
  widgetExpand: { delay: 8.5, duration: 0.6 }
};
```

**Design Notes:**
- This is THE WOW moment that differentiates us from Chatbase
- Must feel like MAGIC - the chatbot materializes from conversation
- Consider adding a "Replay Demo" button
- On mobile: Stack panels vertically with smaller animations

---

### Section 4: How It Works

**Layout:** 3-column grid with numbered steps

**Headline:** "Live in 15 minutes. Seriously."

**Steps:**

**Step 1: Upload Your Knowledge**
- Icon: Document/Upload icon
- Description: "PDFs, text files, or just paste your FAQ. We'll train your chatbot automatically."

**Step 2: Get Your Embed Code**
- Icon: Code brackets icon
- Description: "One script tag. Works on any website—React, Next.js, plain HTML, anywhere."

**Step 3: Ship Support**
- Icon: Rocket icon
- Description: "Your AI chatbot goes live instantly. Answering questions 24/7 while you sleep."

**Design Notes:**
- Clean, minimal icons (Lucide or custom SVG)
- Subtle connecting line between steps
- Each step fades in on scroll
- Optionally: add mini-demos for each step

---

### Section 5: Features Bento Grid

**Layout:** Bento box grid (asymmetric, modern)

**Headline:** "Everything you need. Nothing you don't."

**Feature Cards:**

```
┌─────────────────────────────────┬─────────────────┐
│                                 │                 │
│  RAG-Powered Intelligence       │  Lead Capture   │
│  (Large card with visual)       │  (Small card)   │
│  "Answers from your actual      │                 │
│   documentation, not            │  "Collect       │
│   hallucinations"               │   emails when   │
│                                 │   stuck"        │
├─────────────────┬───────────────┼─────────────────┤
│                 │               │                 │
│  API Tool       │  Analytics    │  Multi-Project  │
│  Calling        │               │                 │
│                 │  "See what    │  "Unlimited     │
│  "Real-time     │   customers   │   chatbots,     │
│   data from     │   really ask" │   one account"  │
│   your APIs"    │               │                 │
│                 │               │                 │
└─────────────────┴───────────────┴─────────────────┘
```

**Feature Details:**

1. **RAG-Powered Intelligence**
   - "Your chatbot answers from YOUR documentation. Semantic search finds the right info every time. No hallucinations, just accurate answers."
   - Visual: Show knowledge chunks being retrieved

2. **API Tool Calling**
   - "Connect your APIs. Let the chatbot check order status, look up accounts, fetch real-time data."
   - Visual: API request/response animation

3. **Lead Capture**
   - "When the chatbot can't answer, it captures emails. Never lose a potential customer."
   - Visual: Email capture form

4. **Analytics Dashboard**
   - "See what customers ask. Find gaps in your docs. Improve over time."
   - Visual: Charts/graphs preview

5. **Multi-Project Support**
   - "One account, unlimited chatbots. Perfect for agencies and multi-product companies."
   - Visual: Project switcher UI

**Design Notes:**
- Bento grid with varying card sizes
- Subtle border gradients
- Glassmorphism on hover
- Each card animates on scroll

---

### Section 6: Built With (Tech Credibility)

**Layout:** Clean horizontal display of tech logos

**Headline:** "Built on technology you trust"

**Copy:** "Powered by the same tools that run the best products on the internet."

**Tech Stack (ALL REAL):**
- **OpenAI** - GPT-4o-mini for chat, embeddings for search
- **Supabase** - Database, auth, and storage
- **pgvector** - Semantic search that actually works

**Why This Works:**
- Developers trust these brands
- Shows we're using production-grade tech
- No fake stats needed—the tech speaks for itself
- This is authentic credibility

**Design Notes:**
- Minimal, clean logo row
- Brief one-liner under each: "Chat intelligence", "Secure data", "Smart search"
- Links to our architecture docs (if available)

---

### ~~Testimonials~~ - REMOVED FOR LAUNCH

**Status:** Will add once we have real users (target: 3-5 genuine testimonials)

**Why removed:** Fake testimonials destroy trust instantly. Better to launch without than with fabricated quotes.

---

### Section 7: FAQ

**Layout:** Accordion or two-column Q&A

**Headline:** "Questions? We've got answers."

**FAQs:**

**Q: How does the MCP integration work?**
A: SupportBase provides an MCP server that works with Cursor, Claude Code, and other AI tools. Your AI assistant can create projects, upload knowledge, and get embed codes—all through conversation.

**Q: What file types can I upload?**
A: PDFs, text files, markdown, and you can paste text directly. We're adding .docx and more soon.

**Q: Can the chatbot access real-time data?**
A: Yes! Configure API endpoints and the chatbot can fetch live data like order status, inventory, or account information.

**Q: How accurate are the answers?**
A: We use RAG (Retrieval Augmented Generation) with semantic search. The chatbot only answers from your actual documentation—no hallucinations.

**Q: What if the chatbot can't answer?**
A: It gracefully says "I don't know" and can capture the visitor's email so you can follow up.

**Q: Is there a free tier?**
A: Yes! Start free with 1,000 messages per month. No credit card required.

**Design Notes:**
- Smooth accordion animation
- Search functionality (optional)
- Link to full documentation

---

### Section 8: Final CTA

**Layout:** Full-width, high-contrast section

**Headline:** "Ready to ship support?"

**Subheadline:** "Add an AI chatbot to your app in minutes. Free to start."

**CTA Button:** "Get Started Free" (large, prominent)

**Trust Elements:**
- "No credit card required"
- "Setup in under 5 minutes"
- "Free forever tier"

**Design Notes:**
- Gradient background
- Large headline (48-64px)
- Animated CTA button (subtle glow/pulse)
- This should feel like closure + invitation

---

### Section 9: Footer

**Layout:** Multi-column footer

**Columns:**
- **Product:** Features, Pricing, Docs, Changelog
- **Company:** About, Blog, Contact
- **Legal:** Privacy, Terms
- **Connect:** Twitter, GitHub, Discord

**Bottom Bar:**
- Copyright
- "Built with love for vibe coders"

---

## Part 5: Design System

### Color Palette

**Primary (Dark Theme Recommended):**
```css
--background: #050505;      /* Near black */
--background-secondary: #0a0a0a;
--surface: #111111;
--surface-elevated: #1a1a1a;

--text-primary: #fafafa;    /* Near white */
--text-secondary: #a1a1aa;  /* Muted */
--text-tertiary: #71717a;   /* Even more muted */

--accent: #3b82f6;          /* Blue */
--accent-hover: #60a5fa;
--accent-glow: rgba(59, 130, 246, 0.3);

--success: #22c55e;
--warning: #eab308;
--error: #ef4444;

--border: rgba(255, 255, 255, 0.1);
--border-hover: rgba(255, 255, 255, 0.2);
```

**Gradient Accents:**
```css
--gradient-primary: linear-gradient(135deg, #3b82f6, #8b5cf6);
--gradient-text: linear-gradient(90deg, #fafafa, #a1a1aa);
--gradient-glow: radial-gradient(ellipse at center, var(--accent-glow), transparent);
```

### Typography

**Font Stack:**
```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "Berkeley Mono", "JetBrains Mono", "Fira Code", monospace;
--font-display: "Inter", var(--font-sans); /* For large headlines, consider Inter Display */
```

**Type Scale:**
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
--text-6xl: 3.75rem;   /* 60px */
--text-7xl: 4.5rem;    /* 72px */
```

**Headline Styles:**
- Hero: 72px, font-weight 700, line-height 1.1
- Section: 48px, font-weight 600, line-height 1.2
- Card: 24px, font-weight 600, line-height 1.3

### Spacing

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

**Section Spacing:**
- Between sections: 96-128px (6-8rem)
- Within sections: 48-64px (3-4rem)
- Between elements: 24-32px (1.5-2rem)

### Border Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

### Shadows & Effects

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Glow effects */
--shadow-glow: 0 0 20px var(--accent-glow);
--shadow-glow-lg: 0 0 40px var(--accent-glow);

/* Glassmorphism */
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: blur(10px);
```

---

## Part 6: Animation Strategy

### Animation Principles

1. **Purposeful** - Every animation should guide attention or provide feedback
2. **Subtle** - Enhance, don't distract
3. **Fast** - 200-400ms for most transitions
4. **Accessible** - Respect `prefers-reduced-motion`

### Framer Motion Patterns

**1. Scroll Reveal (Sections)**
```tsx
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" }
};
```

**2. Stagger Children (Lists/Grids)**
```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
```

**3. Hero Text Animation**
```tsx
// Split text into words/letters
// Animate each with stagger
const heroText = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 }
  })
};
```

**4. Code Block Typing Effect**
```tsx
// Use a typewriter effect for embed code
// Character by character with cursor blink
```

**5. Hover Effects (Cards)**
```tsx
const cardHover = {
  scale: 1.02,
  boxShadow: "0 0 30px rgba(59, 130, 246, 0.2)",
  transition: { duration: 0.2 }
};
```

**6. CTA Button**
```tsx
const buttonHover = {
  scale: 1.05,
  boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)"
};

// Subtle pulse animation when in view
const buttonPulse = {
  boxShadow: [
    "0 0 0 0 rgba(59, 130, 246, 0.4)",
    "0 0 0 10px rgba(59, 130, 246, 0)",
  ],
  transition: { duration: 1.5, repeat: Infinity }
};
```

### Animation Library

Use **Framer Motion** for:
- Scroll-triggered animations
- Page transitions
- Gesture interactions
- Layout animations

Consider **Magic UI** components for:
- Animated backgrounds
- Text effects
- Interactive cards
- Border animations

### Specific Animations by Section

| Section | Animation |
|---------|-----------|
| Hero | Text reveal + code typing + gradient glow pulse |
| Social Proof | Logo carousel auto-scroll |
| Problem | Fade in on scroll |
| Vibe Demo | Simulated terminal typing |
| How It Works | Stagger reveal for steps |
| Features | Bento cards scale on hover |
| Integrations | Icon scale/glow on hover |
| Testimonials | Carousel slide |
| Pricing | Card hover elevation |
| CTA | Button pulse + gradient shift |

---

## Part 7: Technical Implementation

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui + Magic UI
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** Inter (Google Fonts or self-hosted)

### File Structure

```
apps/web/app/(marketing)/
├── page.tsx                 # Landing page
├── layout.tsx               # Marketing layout (no sidebar)
├── pricing/page.tsx         # Pricing page (optional separate)
└── components/
    ├── hero.tsx
    ├── social-proof.tsx
    ├── problem.tsx
    ├── vibe-demo.tsx
    ├── how-it-works.tsx
    ├── features-bento.tsx
    ├── integrations.tsx
    ├── testimonials.tsx
    ├── pricing.tsx
    ├── faq.tsx
    ├── final-cta.tsx
    ├── footer.tsx
    └── ui/
        ├── animated-code.tsx
        ├── bento-card.tsx
        ├── gradient-text.tsx
        ├── logo-carousel.tsx
        └── typing-effect.tsx
```

### Performance Considerations

1. **Font Loading**
   - Preload Inter font
   - Use `font-display: swap`

2. **Images**
   - Use Next.js Image component
   - Lazy load below-fold images
   - Use WebP/AVIF formats

3. **Animations**
   - Use `will-change` sparingly
   - Animate `transform` and `opacity` only
   - Respect `prefers-reduced-motion`

4. **Bundle Size**
   - Tree-shake Framer Motion
   - Lazy load heavy components
   - Target < 200KB JS bundle

5. **Core Web Vitals**
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1

### SEO Considerations

```tsx
// app/(marketing)/page.tsx
export const metadata: Metadata = {
  title: "SupportBase - AI Chatbot for Vibe Coders",
  description: "Add an AI chatbot to your app in one line. Works with Cursor, Claude, and your favorite AI tools. Upload docs, get embed code, ship support.",
  keywords: ["AI chatbot", "customer support", "vibe coding", "MCP", "Cursor", "Claude"],
  openGraph: {
    title: "SupportBase - AI Chatbot for Vibe Coders",
    description: "Add an AI chatbot to your app in one line.",
    url: "https://supportbase.app",
    siteName: "SupportBase",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportBase",
    description: "Add an AI chatbot to your app in one line.",
    images: ["/og-image.png"],
  },
};
```

---

## Part 8: Content Tone & Voice

### Brand Voice

**Personality Traits:**
- **Confident** - We know what we built is good
- **Concise** - No fluff, every word earns its place
- **Friendly** - Approachable, not corporate
- **Technical** - We speak developer, not marketing

**Tone Guidelines:**
- Write like you're talking to a smart friend
- Use "you" and "your" liberally
- Avoid buzzwords and corporate speak
- Be specific, not vague
- Use active voice
- Short sentences. Punchy paragraphs.

### Do's and Don'ts

**Do:**
- "Add a chatbot in one line" ✓
- "Your chatbot learns from your docs" ✓
- "Ship support in 15 minutes" ✓

**Don't:**
- "Leverage AI-powered solutions for enhanced customer engagement" ✗
- "Synergize your support workflows" ✗
- "Next-generation conversational AI platform" ✗

### Headline Formulas

1. **[Verb] + [Result] + [Timeframe]**
   - "Add an AI chatbot. In one line."
   - "Ship support. In 15 minutes."

2. **[Benefit] without [Pain]**
   - "24/7 support without hiring"
   - "Smart answers without training"

3. **The [Adjective] way to [Action]**
   - "The fastest way to add support"
   - "The simplest way to ship a chatbot"

---

## Part 9: Visual Assets Needed

### Graphics & Illustrations

1. **Hero Visual**
   - Animated code block with embed snippet
   - Optional: Widget preview on mock website

2. **Vibe Demo**
   - Simulated Cursor/Claude terminal
   - Step-by-step workflow visualization

3. **Feature Icons**
   - RAG/Knowledge (brain + document)
   - API (brackets + arrow)
   - Lead Capture (email/envelope)
   - Analytics (chart)
   - Multi-project (folder stack)

4. **Integration Icons**
   - Cursor, Claude, OpenAI logos
   - Framework logos (React, Next.js, etc.)

5. **Widget Preview**
   - Clean mockup of chat widget
   - Both collapsed (bubble) and expanded states

### Screenshots

1. Dashboard screenshots for features
2. Analytics dashboard preview
3. Knowledge base upload flow

### Open Graph Image

- 1200x630px
- Dark background
- Logo + tagline
- Optional: Code snippet visual

---

## Part 10: Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Set up marketing route group
- [ ] Create design tokens (colors, typography, spacing)
- [ ] Build base components (buttons, cards, containers)
- [ ] Set up Framer Motion
- [ ] Import Magic UI components

### Phase 2: Core Sections (Days 3-5)
- [ ] Hero section with animations
- [ ] How It Works section
- [ ] Features Bento grid
- [ ] Footer

### Phase 3: Key Differentiators (Days 6-7)
- [ ] Vibe Coding Demo (the wow moment)
- [ ] Integrations section
- [ ] Pricing section

### Phase 4: Trust & Conversion (Day 8)
- [ ] Social proof bar
- [ ] Testimonials section
- [ ] FAQ section
- [ ] Final CTA

### Phase 5: Polish (Days 9-10)
- [ ] Animation refinement
- [ ] Responsive testing
- [ ] Performance optimization
- [ ] SEO implementation
- [ ] Cross-browser testing

---

## Appendix: Competitor Reference

### What to Learn From Each

| Competitor | Learn From | Avoid |
|------------|-----------|-------|
| **Intercom** | Dark theme execution, clear value prop | Complexity, enterprise feel |
| **Chatbase** | Video demos, OpenAI/Google testimonials, SOC 2 badges | Generic "customer service" positioning |
| **Crisp** | Glassmorphism effects, animation | Too many features overwhelming |
| **Cursor** | Interactive hero demo, industry testimonials, changelog section | Nothing—great reference |
| **Linear** | Clean minimal design, typography | May be too minimal for marketing |
| **Vercel** | Tab-based use cases, specific customer metrics, framework logos | Enterprise complexity |
| **Raycast** | Keyboard visual metaphor, real community stats, developer focus | May need large ecosystem |

### Chatbase Deep Analysis (Direct Competitor)

**What they do well:**
- Video demos showing the product in action
- High-profile testimonials (OpenAI, Google, Pinecone)
- "Trusted by 10,000+ businesses" social proof
- SOC 2 Type II & GDPR compliance badges
- Integration logos (Make, Zendesk, Notion, Slack, Stripe, Salesforce)
- "No credit card required" trust signal
- Clean feature grid with icons
- Interactive tabs for different sections

**Where we differentiate:**
1. **They target "businesses"** → We target **vibe coders**
2. **They require dashboard setup** → We work **inside your AI editor**
3. **They feel corporate** → We feel **developer-native**
4. **They emphasize "customer service"** → We emphasize **"ship support fast"**

**Our unique positioning:**
```
Chatbase: "AI agents for magical customer experiences"
         → Corporate, B2B, customer service angle

SupportBase: "Add an AI chatbot to your app. In one line."
           → Developer-first, vibe coding, speed angle
```

### Key Differentiators to Emphasize

1. **MCP-Native** - The ONLY chatbot platform with Cursor/Claude integration
2. **Vibe Coding Workflow** - Setup entirely through conversation
3. **One-Line Embed** - Simpler than Chatbase's integration process
4. **Developer-First** - Not enterprise-first like Intercom/Chatbase
5. **15-Minute Promise** - Faster time-to-value than any competitor

---

## Summary

This landing page should:

1. **Hook immediately** with the one-line value prop
2. **Differentiate clearly** with the vibe coding demo
3. **Build trust** with social proof and testimonials
4. **Convert efficiently** with clear CTAs and simple pricing
5. **Feel premium** with dark theme, subtle animations, modern typography

The goal is not just to inform—it's to make developers think:

> "This is for me. This is how I want to add support to my app."

---

## Confidence Assessment

After comprehensive visual research using Playwright to study Linear, Cursor, Vercel, Raycast, and Chatbase landing pages, plus Magic UI component research:

**Confidence Level: 90%**

**What I'm confident about:**
- ✅ Section architecture and flow
- ✅ Design system (colors, typography, spacing)
- ✅ Animation strategy using Framer Motion
- ✅ Magic UI components to use
- ✅ Differentiation from Chatbase
- ✅ Vibe Demo implementation approach
- ✅ Hero copy and messaging

**Remaining 10% uncertainty:**
- The exact visual execution of the Vibe Demo (needs iteration)
- Whether to go dark or light theme (recommend dark based on research)
- Specific background treatment (gradient, particles, or clean)

**Ready to implement with this plan as the blueprint.**

---

**Document Version:** 2.0
**Created:** January 2025
**Last Updated:** January 2025 (Post Visual Research)
**Status:** Ready for Implementation - 90% Confidence
