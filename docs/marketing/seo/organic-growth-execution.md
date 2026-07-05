# FrontFace Organic Growth Execution

This maps the Reddit SEO playbook to FrontFace implementation work. The goal is to make search engines, AI crawlers, and humans discover useful FrontFace assets without paid ads.

## Shipped In Code

- Indexing foundation: `sitemap.xml`, clean `robots.txt`, `llms.txt`, image sitemap, canonical URLs, and a public IndexNow ownership key.
- IndexNow submission helper: `pnpm indexnow:submit` posts live sitemap URLs to Bing/IndexNow after deploy.
- Free linkable asset: `/tools/support-ticket-deflection-calculator` with an interactive calculator, WebApplication schema, BreadcrumbList schema, FAQ content, internal links, and a 1200x630 OG image.
- Tools hub: `/tools` so future calculators have a crawlable parent.
- AEO/blog improvements: comparison content now supports markdown tables, visible FAQ blocks, official source citations, and contextual next-step links.
- Internal linking: tool pages, blog posts, integration pages, use-case pages, nav, footer, sitemap, and `llms.txt` all point into the support-ticket reduction cluster.
- Image SEO: generated `/blog-og/support-ticket-calculator.png` and included all major OG assets in `/image-sitemap.xml`.
- Consented analytics: Microsoft Clarity loads only after a visitor grants analytics consent via `NEXT_PUBLIC_CLARITY_PROJECT_ID`.

## Manual Setup For You

Do these after deploy, because they require account ownership or domain verification.

1. Google Search Console
   - Add `frontface.app` as a Domain property.
   - Verify through DNS.
   - Submit `https://frontface.app/sitemap.xml`.
   - Inspect and request indexing for `/tools` and `/tools/support-ticket-deflection-calculator`.

2. Bing Webmaster Tools
   - Add `frontface.app`.
   - Verify through DNS or import from Google Search Console.
   - Submit `https://frontface.app/sitemap.xml`.
   - Submit `https://frontface.app/image-sitemap.xml`.
   - Confirm Bing can fetch `https://frontface.app/frontface-indexnow-key.txt`.

3. IndexNow after each deploy
   - Run `pnpm indexnow:submit` once the new deployment is live.
   - If Bing rejects the key, generate a new key in Bing Webmaster Tools and replace `apps/web/public/frontface-indexnow-key.txt`.

4. Microsoft Clarity
   - Create a Clarity project for `frontface.app`.
   - Add `NEXT_PUBLIC_CLARITY_PROJECT_ID=<project-id>` to the web app environment.
   - Confirm the consent banner appears only when the env var is set.

5. Rich Results / schema checks
   - Run Google's Rich Results Test on:
     - `https://frontface.app/tools/support-ticket-deflection-calculator`
     - `https://frontface.app/blog/frontface-vs-chatbase-vs-intercom`
   - Treat FAQ sections as visible AEO content, not guaranteed FAQ rich results.

6. Directory and listing setup
   - Create profiles for FrontFace on AlternativeTo, Product Hunt, Indie Hackers, BetaList, Startup Stash, SaaSHub, and relevant AI tool directories.
   - Use the same positioning: "AI support agent for small teams that answers from your docs with cited sources."
   - Link to the calculator when the directory allows useful resources, otherwise link to the homepage or signup.

7. Reddit execution
   - Follow `docs/marketing/reddit/playbook.md`.
   - Use the calculator URL when replying to support-cost or repetitive-ticket threads.
   - Keep founder disclosure in the first 1-2 lines and use UTM links from the Reddit playbook.

## Next Content Targets

Build these as the next organic assets, using the same template: useful page, visible FAQ, schema, contextual links, OG image, sitemap entry, and `llms.txt` entry.

- AI chatbot cost calculator.
- Knowledge base readiness checklist.
- Shopify support automation calculator.
- Chatbase alternative page.
- Intercom Fin alternative for small teams.
- Zendesk alternative for small business.
- AI support for SaaS startups pillar page.
- AI support for ecommerce stores pillar page.

## Publish Checklist

- One visible H1 with the target keyword.
- Final title under roughly 60 characters when the brand suffix is included.
- Self-contained H2 sections with direct answers early.
- HTML table for comparisons or quantified data.
- Visible FAQ answers around 40-60 words.
- At least 5 contextual in-body links where the content supports them.
- Canonical URL.
- BreadcrumbList schema.
- Article/BlogPosting schema for posts, WebApplication schema for tools.
- Descriptive OG image and image sitemap entry.
- Add the URL to `llms.txt`.
- Deploy, submit sitemap in Google/Bing, then run `pnpm indexnow:submit`.
