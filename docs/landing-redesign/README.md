# Landing page redesign — direction & mockups

Reference package for redesigning the marketing home (`apps/web/app/(marketing)/`).
Goal: move the landing page from a competent-but-generic monochrome SaaS page to a
distinctive, high-energy, **editorial-bold** design with real liveliness.

> **How to view the mockups:** open the files in `mockups/` directly in a browser
> (they're self-contained HTML, fonts load from Google Fonts, no build step).
> Start with **`01-homepage-lively.html`** — that's the target direction.

## Mockups

| File | What it shows |
|------|---------------|
| `mockups/01-homepage-lively.html` | **Target.** Full homepage with the real two-panel animated demo restored + MindMarket-style liveliness (doodles, floating bubbles, motion). |
| `mockups/02-homepage-static.html` | Earlier pass — same layout, before liveliness was added. Useful diff. |
| `mockups/03-color-exploration.html` | The signature-color options that were considered. |
| `mockups/04-typeface-exploration.html` | The display-typeface options that were considered. |

## Chosen direction

**Lane:** Editorial-bold, inspired by MindMarket (mobbin.com) — giant type, a vivid
full-bleed signature color, stacked rounded color-block "chapters", playful liveliness.
(Tines was the second reference for warmth/motion; we did **not** take its serif + purple.)

### Design tokens
- **Signature color:** acid lime `#C6F24E` (deep `#B4E600`), used full-bleed on hero
  accents, the stat band, and the final CTA.
- **Ink / text:** near-black `#14181f`; body text `#1c2530`; soft `#5a6573`.
- **Base canvas:** cream `#F7F4EC` (alt `#EFEBDF`); cards white; lines `#E7E3D6`.
- **Dark chapters:** `#14181f` (Deploy Anywhere, capabilities featured card).
- **Display type:** **Bricolage Grotesque** (700–800, tight `-0.035em`, huge sizes).
- **Body type:** **Inter**. Mono accents: JetBrains Mono (citations, KB file paths).
- Generous border-radius (16–36px), pill nav + pill buttons with a circular icon-chip.

### Section flow (keep existing sections & copy — restyle only)
Header → **Hero** (centered giant H1 + full-width animated demo showcase) → Logo strip
(marquee) → **Stat band** (lime chapter) → How it works (4 steps) → Capabilities (bento,
one dark featured card) → **Deploy anywhere** (near-black chapter) → Testimonials →
Pricing → **Final CTA** (lime chapter). Mood shifts as you scroll: cream → lime → cream
→ dark → lime.

### Liveliness recipe (the point of v2)
- **Hand-drawn doodles** (sparkles, squiggles, curly arrows) that draw themselves in via
  SVG `stroke-dashoffset`, then gently float. Scattered near headlines, between the
  how-it-works steps (dashed connectors), and around CTAs.
- **Floating conversation bubbles** that bob around the hero demo — authentic to a chat
  product (e.g. "Answered in 1.2s", "Lead captured → Sales", "Handed off to Maya").
- Floating avatar cluster in testimonials, marquee logos, hover-lift cards, pulsing
  "live" dot, lime highlight-marker under a hero word.
- In the real build, add scroll-triggered reveals + subtle parallax on the doodles.

### IMPORTANT — preserve the real animated demo
The hero centerpiece is the existing **`apps/web/app/(marketing)/components/live-demo.tsx`**
(two panels: streaming chat with cited sources + lead-capture/handoff card, beside a live
**RAG-retrieval panel** where knowledge files scan → "MATCH" → "grounded in N sources").
**Keep this component** and restyle it (lime accent, doodles around it) — the mockup only
approximates it statically. Don't rebuild it from scratch.

## Implementation notes
- Tokens live in `apps/web/app/globals.css` under `.marketing-light` as `--ff-*` vars —
  update those and the change propagates across all marketing pages (`/features`, `/vs`,
  `/use-cases`, `/tools`, blog). Add Bricolage Grotesque via `next/font`.
- Sections are in `apps/web/app/(marketing)/components/`. They use inline styles today;
  match that pattern or migrate a section at a time.
- **Honesty fix:** the logo strip ("Trusted by…") and all three testimonials use
  placeholder companies (HofMigration / OneGo / Sleet) and unsourced stats (89%, 12s).
  Replace with real proof, or soften the claims, during implementation.

_Direction agreed with Munam. Questions → ping Munam._
