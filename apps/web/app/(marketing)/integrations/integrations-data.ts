export interface IntegrationPage {
  slug: string;
  name: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSub: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonical: string;
  ogImage: string;
  ogImageAlt: string;
  benefits: Array<{ title: string; description: string }>;
  faqs: Array<{ q: string; a: string }>;
  relatedLinks: Array<{ href: string; label: string }>;
}

export const integrations: IntegrationPage[] = [
  {
    slug: "shopify",
    relatedLinks: [
      { href: "/use-cases/ecommerce", label: "AI support for ecommerce" },
      { href: "/vs/tidio", label: "FrontFace vs Tidio" },
      { href: "/blog/add-ai-support-to-shopify-store", label: "How to add AI support to Shopify" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Shopify",
    heroEyebrow: "Shopify Integration",
    heroTitle: "Shopify AI Chatbot — Live in 5 Minutes",
    heroSub:
      "Add an AI support agent to your Shopify store with one line of code. Answers product questions, resolves order status, captures leads, and hands off to humans — 24/7.",
    metaTitle: "Shopify AI Chatbot — Live in 5 Minutes",
    metaDescription:
      "Add an AI support agent to your Shopify store with one line of code. Answers product questions, resolves order status, captures leads 24/7. Free during beta.",
    metaKeywords: [
      "Shopify AI chatbot",
      "Shopify chatbot app",
      "Shopify customer support AI",
      "AI chat for Shopify",
      "Shopify support automation",
      "Shopify live chat alternative",
    ],
    canonical: "https://frontface.app/integrations/shopify",
    ogImage: "https://frontface.app/blog-og/integration-shopify.png",
    ogImageAlt: "FrontFace — AI Chatbot for Shopify stores",
    benefits: [
      {
        title: "Answers product questions instantly",
        description:
          "Your agent reads your product pages, policies and FAQs. Customers get cited, accurate answers about shipping, returns and product details — without waiting.",
      },
      {
        title: "Handles order status queries",
        description:
          "Resolve the most common support request automatically. Your agent handles order tracking and returns questions from your Shopify knowledge base.",
      },
      {
        title: "Captures leads mid-conversation",
        description:
          "When a shopper is interested but not ready to buy, your agent earns their trust and collects their contact info — without a pop-up.",
      },
      {
        title: "One line of code to install",
        description:
          "Paste the script before your closing </body> tag in Shopify's theme editor. No Shopify app required, no developer needed.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to my Shopify store?",
        a: "In your Shopify admin, go to Online Store → Themes → Edit code. Find your theme.liquid file and paste the FrontFace script tag just before the closing </body> tag. That's it — your agent is live.",
      },
      {
        q: "Will it work with my Shopify theme?",
        a: "Yes. FrontFace uses a floating widget that works with any Shopify theme — Debut, Dawn, or any custom theme. It doesn't interfere with your checkout or other scripts.",
      },
      {
        q: "Can it answer product-specific questions?",
        a: "Yes. Feed FrontFace your product pages, FAQs, and policy docs. It answers questions about specific products, shipping times, return policies, and more — grounded in your actual content.",
      },
      {
        q: "Does it work with WooCommerce too?",
        a: "Yes. The same embed code works on WooCommerce (WordPress) as well. See our WordPress integration for setup instructions.",
      },
    ],
  },
  {
    slug: "wordpress",
    relatedLinks: [
      { href: "/use-cases/agencies", label: "AI support for agencies" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/blog/how-to-add-chatbot-to-wordpress", label: "How to add an AI chatbot to WordPress" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "WordPress",
    heroEyebrow: "WordPress Integration",
    heroTitle: "WordPress AI Chatbot — No Plugin Required",
    heroSub:
      "Add an AI support agent to any WordPress site with one script tag. Works with any theme, fully compatible with WooCommerce. Live in under 5 minutes.",
    metaTitle: "WordPress AI Chatbot — No Plugin Required",
    metaDescription:
      "Add an AI customer support chatbot to your WordPress site with one line of code. No plugin required, works with any theme and WooCommerce. Free during beta.",
    metaKeywords: [
      "WordPress AI chatbot",
      "WordPress chatbot plugin",
      "WooCommerce customer support AI",
      "AI chat for WordPress",
      "WordPress support automation",
      "chatbot for WordPress site",
    ],
    canonical: "https://frontface.app/integrations/wordpress",
    ogImage: "https://frontface.app/blog-og/integration-wordpress.png",
    ogImageAlt: "FrontFace — AI Chatbot for WordPress sites",
    benefits: [
      {
        title: "Works with any WordPress theme",
        description:
          "No plugin conflicts, no theme compatibility issues. One script tag works with any WordPress theme — Elementor, Divi, Astra, or custom.",
      },
      {
        title: "Fully compatible with WooCommerce",
        description:
          "Running a WooCommerce store? Your agent can answer product questions, order queries and shipping questions automatically.",
      },
      {
        title: "Grounded answers — no hallucinations",
        description:
          "Upload your docs, FAQs or point to your site. Every answer cites its source. No made-up responses.",
      },
      {
        title: "5-minute setup, no developer needed",
        description:
          "Paste one script tag before </body> in your theme's footer.php, or use the WordPress Customizer. No PHP or JavaScript knowledge needed.",
      },
    ],
    faqs: [
      {
        q: "Do I need to install a WordPress plugin?",
        a: "No. Just paste one line of code into your theme's footer.php file or use a code injection plugin like Insert Headers and Footers. No WordPress plugin required.",
      },
      {
        q: "Will it slow down my WordPress site?",
        a: "No. The FrontFace widget loads asynchronously — it doesn't block page rendering or affect your Core Web Vitals or PageSpeed score.",
      },
      {
        q: "Does it work with WooCommerce?",
        a: "Yes. FrontFace works on any WordPress site including WooCommerce stores. Feed it your product descriptions, policies and FAQs to answer customer questions automatically.",
      },
      {
        q: "Can I use it with Elementor or Divi?",
        a: "Yes. Since it's just a script tag, it works alongside any page builder — Elementor, Divi, Beaver Builder, Gutenberg, or any other.",
      },
    ],
  },
  {
    slug: "wix",
    relatedLinks: [
      { href: "/use-cases/professional-services", label: "AI support for professional services" },
      { href: "/blog/wix-chatbot", label: "How to add an AI chatbot to Wix" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Wix",
    heroEyebrow: "Wix Integration",
    heroTitle: "AI Chatbot for Wix — Add in 10 Minutes",
    heroSub:
      "Add an AI support agent to your Wix site without leaving the Wix editor. Answers customer questions from your own content, captures leads, and hands off to humans.",
    metaTitle: "AI Chatbot for Wix Websites",
    metaDescription:
      "Add an AI customer support chatbot to your Wix website in minutes. No coding required — works in the Wix Editor and Wix Studio. Free during beta.",
    metaKeywords: [
      "Wix AI chatbot",
      "chatbot for Wix website",
      "Wix customer support AI",
      "add chatbot to Wix",
      "Wix live chat alternative",
      "Wix chatbot app",
    ],
    canonical: "https://frontface.app/integrations/wix",
    ogImage: "https://frontface.app/blog-og/integration-wix.png",
    ogImageAlt: "FrontFace — AI Chatbot for Wix websites",
    benefits: [
      {
        title: "Works in Wix Editor and Wix Studio",
        description:
          "Add FrontFace to any Wix site via the HTML embed widget — works in both the classic Wix Editor and the new Wix Studio.",
      },
      {
        title: "No Wix App Market needed",
        description:
          "No app subscription fees on top of FrontFace pricing. One embed and you're live — nothing to install from the App Market.",
      },
      {
        title: "Answers from your Wix content",
        description:
          "Point FrontFace at your Wix pages, product catalog and FAQs. Customers get accurate, cited answers — not generic responses.",
      },
      {
        title: "Captures leads without pop-ups",
        description:
          "When visitors are interested, the agent earns trust through conversation and collects contact info naturally — no annoying forms.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to my Wix site?",
        a: "In the Wix Editor, click Add → Embed → HTML iframe or Custom Embed. Paste the FrontFace script tag into the HTML box. You can also use Wix Velo to add it globally via the masterPage.js file.",
      },
      {
        q: "Does it work with Wix Stores?",
        a: "Yes. FrontFace works on Wix Stores and can answer product questions, return policies and shipping queries from your content.",
      },
      {
        q: "Can I use it without coding?",
        a: "Yes. Use the Wix HTML embed widget — no coding required. For a global embed that appears on all pages, Wix Velo (a few lines of JavaScript) is the cleanest approach.",
      },
      {
        q: "Does it replace Wix Chat?",
        a: "FrontFace is an AI support agent, not just a chat widget. Unlike Wix Chat, it answers questions automatically from your knowledge base and only hands off to a human when needed.",
      },
    ],
  },
  {
    slug: "squarespace",
    relatedLinks: [
      { href: "/use-cases/professional-services", label: "AI support for professional services" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Squarespace",
    heroEyebrow: "Squarespace Integration",
    heroTitle: "AI Chatbot for Squarespace — Live in Minutes",
    heroSub:
      "Add an AI support agent to your Squarespace site via Code Injection. No developer needed — your agent answers customer questions from your own content, 24/7.",
    metaTitle: "AI Chatbot for Squarespace",
    metaDescription:
      "Add an AI customer support chatbot to your Squarespace site in minutes using Code Injection. No developer needed. Free during beta.",
    metaKeywords: [
      "Squarespace AI chatbot",
      "chatbot for Squarespace",
      "Squarespace customer support AI",
      "add chatbot to Squarespace",
      "Squarespace live chat",
      "Squarespace support widget",
    ],
    canonical: "https://frontface.app/integrations/squarespace",
    ogImage: "https://frontface.app/blog-og/integration-squarespace.png",
    ogImageAlt: "FrontFace — AI Chatbot for Squarespace websites",
    benefits: [
      {
        title: "Installs via Code Injection",
        description:
          "Squarespace's built-in Code Injection (Settings → Advanced) lets you add the FrontFace script to every page — no developer, no third-party tools.",
      },
      {
        title: "Works with all Squarespace templates",
        description:
          "Compatible with all Squarespace 7.0 and 7.1 templates. The floating widget doesn't interfere with your design.",
      },
      {
        title: "Answers questions from your site content",
        description:
          "Point FrontFace at your Squarespace pages, product listings and blog posts. Your agent builds a knowledge base from your content automatically.",
      },
      {
        title: "Deflects support tickets 24/7",
        description:
          "Your agent handles common questions around the clock — so you can focus on the work that actually needs you.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to Squarespace?",
        a: "Go to Settings → Advanced → Code Injection in your Squarespace dashboard. Paste the FrontFace script tag into the Footer section. It will appear on every page of your site.",
      },
      {
        q: "Does it work on Squarespace Commerce?",
        a: "Yes. FrontFace works on Squarespace Commerce sites and can answer product questions, shipping and return queries from your content.",
      },
      {
        q: "Will it affect my Squarespace design?",
        a: "No. FrontFace uses a floating widget that doesn't modify your site layout or design. It appears as a small chat button in the corner of your site.",
      },
      {
        q: "Can it replace my contact form?",
        a: "FrontFace complements your contact form. It handles routine questions instantly and captures lead info automatically — so your contact form gets fewer low-value messages.",
      },
    ],
  },
  {
    slug: "webflow",
    relatedLinks: [
      { href: "/use-cases/agencies", label: "AI support for agencies" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Webflow",
    heroEyebrow: "Webflow Integration",
    heroTitle: "AI Chatbot for Webflow — No Dev Required",
    heroSub:
      "Add an AI support agent to your Webflow site in minutes using a custom code embed. Works with Webflow CMS, ecommerce, and any custom build.",
    metaTitle: "AI Chatbot for Webflow",
    metaDescription:
      "Add an AI customer support chatbot to your Webflow site with a custom code embed. Works with Webflow CMS and ecommerce. Free during beta.",
    metaKeywords: [
      "Webflow AI chatbot",
      "chatbot for Webflow",
      "Webflow customer support AI",
      "add chatbot to Webflow",
      "Webflow live chat",
      "Webflow support widget",
    ],
    canonical: "https://frontface.app/integrations/webflow",
    ogImage: "https://frontface.app/blog-og/integration-webflow.png",
    ogImageAlt: "FrontFace — AI Chatbot for Webflow sites",
    benefits: [
      {
        title: "Works with Webflow's custom code embed",
        description:
          "Use Webflow's Project Settings → Custom Code → Footer Code to add the FrontFace script globally. No JavaScript knowledge required.",
      },
      {
        title: "Compatible with Webflow CMS and Ecommerce",
        description:
          "Runs on any Webflow project — static sites, CMS-driven content, and Webflow Ecommerce — without affecting your Designer layouts.",
      },
      {
        title: "Answers from your Webflow content",
        description:
          "Feed FrontFace your published Webflow pages and docs. It builds a knowledge base from your content and answers questions with cited sources.",
      },
      {
        title: "No impact on Webflow animations",
        description:
          "FrontFace loads asynchronously and doesn't block your Webflow interactions, Lottie animations, or GSAP scripts.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to Webflow?",
        a: "In Webflow Designer, go to Project Settings → Custom Code. Paste the FrontFace script tag into the Footer Code field. Publish your site and the agent is live on every page.",
      },
      {
        q: "Does it work with Webflow Ecommerce?",
        a: "Yes. FrontFace works on Webflow Ecommerce sites and can answer product questions, shipping and return queries from your published content.",
      },
      {
        q: "Will it conflict with my Webflow interactions?",
        a: "No. FrontFace loads asynchronously and doesn't interfere with Webflow animations, scroll triggers, or other custom JavaScript.",
      },
      {
        q: "Can I scope it to specific Webflow pages?",
        a: "By default it appears on all pages. To scope it to specific pages, use Webflow's per-page custom code fields instead of the global project settings.",
      },
    ],
  },
  {
    slug: "framer",
    relatedLinks: [
      { href: "/use-cases/saas", label: "AI support for SaaS teams" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Framer",
    heroEyebrow: "Framer Integration",
    heroTitle: "AI Chatbot for Framer — Live in 5 Minutes",
    heroSub:
      "Add an AI support agent to your Framer site with a custom code component. Answers visitor questions from your knowledge base 24/7 — without touching your design.",
    metaTitle: "AI Chatbot for Framer Sites",
    metaDescription:
      "Add an AI customer support chatbot to your Framer site using a custom code component. Works on any Framer project. Free during beta.",
    metaKeywords: [
      "Framer AI chatbot",
      "chatbot for Framer",
      "Framer customer support AI",
      "add chatbot to Framer site",
      "Framer live chat alternative",
      "Framer support widget",
    ],
    canonical: "https://frontface.app/integrations/framer",
    ogImage: "https://frontface.app/blog-og/integration-framer.png",
    ogImageAlt: "FrontFace — AI Chatbot for Framer sites",
    benefits: [
      {
        title: "Installs via Framer's custom code",
        description:
          "Go to Site Settings → General → Custom Code → End of <body>. Paste the FrontFace snippet once and it loads on every published Framer page automatically.",
      },
      {
        title: "Doesn't touch your Framer canvas",
        description:
          "FrontFace is a floating widget injected via custom code — your Framer components, animations, and interactions are completely untouched.",
      },
      {
        title: "Answers from your actual content",
        description:
          "Point FrontFace at your Framer-published URL or upload your docs. Visitors get accurate, cited answers — not generic LLM responses about your product.",
      },
      {
        title: "Captures leads from every page",
        description:
          "Turn visitor questions into email signups or demo requests. The agent earns trust through conversation and captures contact info naturally.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a Framer site?",
        a: "In Framer, open Site Settings → General → Custom Code. Paste your FrontFace embed snippet into the End of <body> field. Publish your site and the chatbot appears on every page.",
      },
      {
        q: "Will it interfere with Framer animations?",
        a: "No. FrontFace loads asynchronously after your page content and doesn't conflict with Framer's animation engine, scroll effects, or interactive components.",
      },
      {
        q: "Can I add it to just one Framer page?",
        a: "To show the widget on a single page only, use a Code Component in Framer's canvas for that page instead of site-wide Custom Code. The component embeds the script on that page alone.",
      },
      {
        q: "Does it work with Framer CMS collections?",
        a: "Yes. The widget appears on all published pages including CMS collection pages. You can feed FrontFace your CMS content as part of the knowledge base.",
      },
    ],
  },
  {
    slug: "bubble",
    relatedLinks: [
      { href: "/use-cases/saas", label: "AI support for SaaS teams" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/chatbase", label: "FrontFace vs Chatbase" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Bubble",
    heroEyebrow: "Bubble Integration",
    heroTitle: "AI Chatbot for Bubble Apps — No Plugin Needed",
    heroSub:
      "Add an AI support agent to your Bubble app with a header script. Answers user questions from your knowledge base automatically — without building a custom chat UI.",
    metaTitle: "AI Chatbot for Bubble Apps",
    metaDescription:
      "Add an AI support chatbot to your Bubble app using a header script injection. No plugin required. Free during beta.",
    metaKeywords: [
      "Bubble AI chatbot",
      "chatbot for Bubble app",
      "Bubble customer support AI",
      "add chatbot to Bubble",
      "Bubble no-code chatbot",
      "Bubble support widget",
    ],
    canonical: "https://frontface.app/integrations/bubble",
    ogImage: "https://frontface.app/blog-og/integration-bubble.png",
    ogImageAlt: "FrontFace — AI Chatbot for Bubble no-code apps",
    benefits: [
      {
        title: "Installs via Bubble's header script",
        description:
          "In Bubble's Settings → SEO / metatags, paste the FrontFace snippet into the Script/meta tags in header field. It loads on every page of your app without a plugin.",
      },
      {
        title: "Handles support so you can focus on building",
        description:
          "Answer user onboarding questions, feature how-tos, and account FAQs automatically — so your time goes to product iteration, not repetitive support.",
      },
      {
        title: "Grounded answers from your app's documentation",
        description:
          "Upload your help docs, onboarding guides, and FAQs. Users get accurate answers from your content — not generic LLM guesses about your app's workflows.",
      },
      {
        title: "Captures leads before users churn",
        description:
          "When users get stuck and might churn, the agent resolves their question instantly and can capture an email for follow-up — all without leaving your app.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a Bubble app?",
        a: "Go to your Bubble app's Settings → SEO / metatags tab. Paste the FrontFace embed script into the 'Script/meta tags in header' field and deploy. The widget loads on every page of your app.",
      },
      {
        q: "Will it work inside Bubble's single-page app routing?",
        a: "Yes. FrontFace's widget persists across Bubble's page navigation. It loads once on initial page load and stays active as users navigate through your app.",
      },
      {
        q: "Can it answer questions about my specific Bubble app workflows?",
        a: "Yes. Upload your help documentation or onboarding guides to FrontFace's knowledge base and it will answer app-specific questions with cited sources from your content.",
      },
      {
        q: "Do I need a Bubble plugin for this?",
        a: "No. FrontFace uses a simple script tag — no Bubble plugin required and no plugin marketplace fees. One script in your header settings and you're live.",
      },
    ],
  },
  {
    slug: "ghost",
    relatedLinks: [
      { href: "/use-cases/saas", label: "AI support for SaaS teams" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Ghost",
    heroEyebrow: "Ghost Integration",
    heroTitle: "AI Chatbot for Ghost Publications",
    heroSub:
      "Add an AI support agent to your Ghost site via Code Injection. Answer reader questions, handle membership FAQs, and capture newsletter signups — 24/7.",
    metaTitle: "AI Chatbot for Ghost CMS",
    metaDescription:
      "Add an AI customer support chatbot to your Ghost publication using Code Injection. Handles membership, newsletter, and reader FAQ automatically. Free during beta.",
    metaKeywords: [
      "Ghost AI chatbot",
      "chatbot for Ghost CMS",
      "Ghost membership support AI",
      "add chatbot to Ghost site",
      "Ghost newsletter chatbot",
      "Ghost support widget",
    ],
    canonical: "https://frontface.app/integrations/ghost",
    ogImage: "https://frontface.app/blog-og/integration-ghost.png",
    ogImageAlt: "FrontFace — AI Chatbot for Ghost publications",
    benefits: [
      {
        title: "Installs via Ghost Code Injection",
        description:
          "Go to Ghost Admin → Settings → Code Injection → Site Footer. Paste the FrontFace script once and it loads on every page of your Ghost publication.",
      },
      {
        title: "Handles membership and subscription questions",
        description:
          "Answer 'How do I cancel?', 'What's included in my membership?', and 'How do I manage my account?' automatically — freeing you from repetitive member support.",
      },
      {
        title: "Answers from your published content",
        description:
          "Point FrontFace at your Ghost publication URL. It indexes your posts, pages, and FAQs and answers reader questions with cited sources from your own writing.",
      },
      {
        title: "Captures newsletter signups mid-conversation",
        description:
          "When a reader asks about your newsletter or membership, the agent can collect their email directly in the conversation — without a pop-up or form.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a Ghost site?",
        a: "In Ghost Admin, go to Settings → Code Injection. Paste your FrontFace embed snippet into the Site Footer field. Save and the chatbot loads on every page of your publication.",
      },
      {
        q: "Does it work with Ghost Members?",
        a: "Yes. FrontFace can answer membership-related questions — billing, account access, plan details — from content you provide. It doesn't integrate with Ghost's member database directly.",
      },
      {
        q: "Can it answer questions about my posts and newsletter content?",
        a: "Yes. Point FrontFace at your Ghost URL and it indexes your published content. Readers asking about topics you've covered get directed to the right article or answer.",
      },
      {
        q: "Will it affect my Ghost site speed?",
        a: "No. The FrontFace script loads asynchronously and doesn't block page rendering. Your Ghost site's load time and Core Web Vitals won't be affected.",
      },
    ],
  },
  {
    slug: "nextjs",
    relatedLinks: [
      { href: "/use-cases/developers", label: "AI support for developer tools" },
      { href: "/integrations/react", label: "React AI chatbot integration" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Next.js",
    heroEyebrow: "Next.js Integration",
    heroTitle: "AI Chatbot for Next.js Apps — Script Component Ready",
    heroSub:
      "Add an AI support agent to your Next.js app using next/script. Works with the App Router and Pages Router. No performance impact — loads after hydration.",
    metaTitle: "AI Chatbot for Next.js",
    metaDescription:
      "Add an AI customer support chatbot to your Next.js app using next/script. App Router and Pages Router compatible. Free during beta.",
    metaKeywords: [
      "Next.js AI chatbot",
      "chatbot for Next.js app",
      "Next.js customer support widget",
      "add chatbot to Next.js",
      "Next.js support automation",
      "React chatbot Next.js",
    ],
    canonical: "https://frontface.app/integrations/nextjs",
    ogImage: "https://frontface.app/blog-og/integration-nextjs.png",
    ogImageAlt: "FrontFace — AI Chatbot for Next.js applications",
    benefits: [
      {
        title: "Works with next/script — zero performance hit",
        description:
          "Use Next.js's built-in Script component with strategy='afterInteractive' so FrontFace loads after hydration, with no impact on LCP or TTI.",
      },
      {
        title: "App Router and Pages Router compatible",
        description:
          "Add to your root layout.tsx (App Router) or _document.tsx / _app.tsx (Pages Router). One placement and the widget is live across your entire app.",
      },
      {
        title: "Answers from your product docs",
        description:
          "Feed FrontFace your documentation site URL or upload API reference docs. Users get precise answers from your actual content, with citations — not generic responses.",
      },
      {
        title: "Handles developer onboarding questions",
        description:
          "Answer integration questions, SDK usage, error codes, and configuration FAQs automatically — letting your team focus on shipping, not repeating setup steps.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a Next.js App Router project?",
        a: "In your root app/layout.tsx, import Script from 'next/script' and add <Script src='https://cdn.frontface.app/widget.js' data-id='YOUR_ID' strategy='afterInteractive' /> inside the <body>. The widget loads on every page.",
      },
      {
        q: "Does it work with Next.js Pages Router?",
        a: "Yes. Add the Script component to _app.tsx or _document.tsx using the same strategy='afterInteractive' approach. It works with both routing systems.",
      },
      {
        q: "Will it affect my Next.js Core Web Vitals?",
        a: "No. Using strategy='afterInteractive' ensures the script loads after the page is interactive. It doesn't block rendering, hydration, or affect LCP or CLS scores.",
      },
      {
        q: "Can I show it only on certain Next.js pages?",
        a: "Yes. Instead of adding it to the root layout, import and render the Script component conditionally in specific page components. It will only load on those pages.",
      },
    ],
  },
  {
    slug: "html",
    relatedLinks: [
      { href: "/use-cases/developers", label: "AI support for developer tools" },
      { href: "/integrations/nextjs", label: "Next.js AI chatbot integration" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "HTML / Static Sites",
    heroEyebrow: "HTML Integration",
    heroTitle: "AI Chatbot for Any HTML Website",
    heroSub:
      "One script tag. Works on any HTML page, static site generator, or custom-built website — Jekyll, Hugo, Eleventy, plain HTML. Live in under two minutes.",
    metaTitle: "AI Chatbot for HTML Websites",
    metaDescription:
      "Add an AI support chatbot to any HTML website with one script tag. Works with Jekyll, Hugo, Eleventy, and plain HTML. Free during beta.",
    metaKeywords: [
      "HTML AI chatbot",
      "chatbot for static website",
      "add chatbot to HTML site",
      "Jekyll chatbot",
      "Hugo chatbot",
      "static site AI support",
    ],
    canonical: "https://frontface.app/integrations/html",
    ogImage: "https://frontface.app/blog-og/integration-html.png",
    ogImageAlt: "FrontFace — AI Chatbot for HTML and static websites",
    benefits: [
      {
        title: "One script tag — that's the entire install",
        description:
          "Paste the FrontFace script tag before your closing </body> tag in any HTML file. No build step, no dependencies, no configuration beyond that.",
      },
      {
        title: "Works with every static site generator",
        description:
          "Jekyll, Hugo, Eleventy, Astro, Gatsby — any generator that outputs HTML works. Add the snippet to your base template and it loads on every page.",
      },
      {
        title: "No JavaScript framework required",
        description:
          "FrontFace is framework-agnostic. It loads as a standalone widget with no dependencies on React, Vue, Angular, or any other library.",
      },
      {
        title: "Answers from your static content",
        description:
          "Point FrontFace at your published site URL or upload a sitemap. It crawls your content and builds a knowledge base from your pages, docs, and FAQs.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a plain HTML website?",
        a: "Open any HTML file and paste the FrontFace script tag just before the closing </body> tag. Add it to your base template or layout file and it loads on every page automatically.",
      },
      {
        q: "Does it work with Jekyll or Hugo?",
        a: "Yes. Add the FrontFace snippet to your Jekyll _layouts/default.html or Hugo baseof.html layout file before </body>. It loads on every generated page at build time.",
      },
      {
        q: "Does it work with Astro or Eleventy?",
        a: "Yes. Paste the script tag into your Astro base layout or Eleventy base template. The widget loads as a vanilla JavaScript file — no framework adapter needed.",
      },
      {
        q: "Will it work on a site hosted on GitHub Pages or Netlify?",
        a: "Yes. FrontFace works on any static hosting — GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any CDN. The script tag is the only thing needed on the HTML side.",
      },
    ],
  },
  {
    slug: "godaddy",
    relatedLinks: [
      { href: "/use-cases/professional-services", label: "AI support for professional services" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "GoDaddy",
    heroEyebrow: "GoDaddy Integration",
    heroTitle: "AI Chatbot for GoDaddy Websites",
    heroSub:
      "Add an AI support agent to your GoDaddy website builder site or Online Store in minutes. Answers customer questions 24/7 from your own content — no developer needed.",
    metaTitle: "AI Chatbot for GoDaddy Website Builder",
    metaDescription:
      "Add an AI customer support chatbot to your GoDaddy website or online store. Works with GoDaddy Website Builder and Managed WordPress. Free during beta.",
    metaKeywords: [
      "GoDaddy AI chatbot",
      "chatbot for GoDaddy website",
      "GoDaddy customer support AI",
      "add chatbot to GoDaddy",
      "GoDaddy website builder chatbot",
      "GoDaddy support widget",
    ],
    canonical: "https://frontface.app/integrations/godaddy",
    ogImage: "https://frontface.app/blog-og/integration-godaddy.png",
    ogImageAlt: "FrontFace — AI Chatbot for GoDaddy websites",
    benefits: [
      {
        title: "Works with GoDaddy Website Builder",
        description:
          "Use GoDaddy's Website Builder HTML widget or the Managed WordPress theme editor to add the FrontFace script. No developer needed — paste and save.",
      },
      {
        title: "Handles customer questions around the clock",
        description:
          "GoDaddy sites span every small business category — services, retail, restaurants, contractors. FrontFace answers industry-specific questions from your content 24/7.",
      },
      {
        title: "Answers from your business content",
        description:
          "Point FrontFace at your GoDaddy site and it indexes your service pages, FAQs, and policies. Every answer cites where it came from.",
      },
      {
        title: "Captures leads when visitors have questions",
        description:
          "Instead of letting visitors leave with unanswered questions, the agent captures their contact info so you can follow up — even after hours.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a GoDaddy website?",
        a: "In GoDaddy Website Builder, add an HTML widget to your page and paste the FrontFace script. For GoDaddy Managed WordPress, add it to your theme's footer.php or use a header/footer plugin.",
      },
      {
        q: "Does it work with GoDaddy Online Store?",
        a: "Yes. Add the FrontFace script to your GoDaddy Online Store via the custom HTML widget. It answers product, shipping, and return policy questions automatically from your content.",
      },
      {
        q: "Can I add it to every page at once?",
        a: "Yes. In GoDaddy Website Builder, add the HTML widget to a global section or footer that appears on all pages. It loads sitewide from a single placement.",
      },
      {
        q: "Do I need a developer to set this up?",
        a: "No. If you can add a widget in GoDaddy's editor, you can install FrontFace. The only 'technical' step is pasting a script tag into an HTML widget field.",
      },
    ],
  },
  {
    slug: "weebly",
    relatedLinks: [
      { href: "/use-cases/professional-services", label: "AI support for professional services" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/vs/crisp", label: "FrontFace vs Crisp" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "Weebly",
    heroEyebrow: "Weebly Integration",
    heroTitle: "AI Chatbot for Weebly Websites",
    heroSub:
      "Add an AI support agent to your Weebly site via the Embed Code element. Answers customer questions automatically from your content — live in minutes, no developer needed.",
    metaTitle: "AI Chatbot for Weebly",
    metaDescription:
      "Add an AI customer support chatbot to your Weebly website using the Embed Code element. Works with Weebly and Square Online. Free during beta.",
    metaKeywords: [
      "Weebly AI chatbot",
      "chatbot for Weebly website",
      "Weebly customer support AI",
      "add chatbot to Weebly",
      "Weebly live chat alternative",
      "Square Online chatbot",
    ],
    canonical: "https://frontface.app/integrations/weebly",
    ogImage: "https://frontface.app/blog-og/integration-weebly.png",
    ogImageAlt: "FrontFace — AI Chatbot for Weebly websites",
    benefits: [
      {
        title: "Installs via Weebly's Embed Code element",
        description:
          "Drag an Embed Code element into your Weebly footer, paste the FrontFace script, and publish. The chatbot appears on every page of your site.",
      },
      {
        title: "Works with Square Online too",
        description:
          "If you've migrated from Weebly to Square Online, FrontFace works the same way — add via the site's custom code settings and publish.",
      },
      {
        title: "Answers from your site's content",
        description:
          "Point FrontFace at your Weebly URL and it builds a knowledge base from your pages, product descriptions, and FAQ content automatically.",
      },
      {
        title: "Supports small business owners 24/7",
        description:
          "Weebly sites are mostly small businesses — local services, boutiques, freelancers. FrontFace handles after-hours questions so nothing falls through the cracks.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a Weebly site?",
        a: "In the Weebly editor, drag an Embed Code element into your footer section (so it appears on all pages). Paste the FrontFace script tag, click Publish, and the chatbot is live.",
      },
      {
        q: "Does it work with Square Online (formerly Weebly)?",
        a: "Yes. For Square Online sites, go to Website → Website Design → Edit Site → Settings → Advanced, and add the FrontFace script to the header or footer code section.",
      },
      {
        q: "Can I show the chatbot on every Weebly page?",
        a: "Yes. Place the Embed Code element in the global footer area of your Weebly site. This ensures FrontFace loads on every page without adding it individually to each one.",
      },
      {
        q: "Will it affect my Weebly site's loading speed?",
        a: "No. The FrontFace script loads asynchronously, which means it doesn't block your Weebly page from rendering. Your page speed score won't be affected.",
      },
    ],
  },
  {
    slug: "react",
    relatedLinks: [
      { href: "/use-cases/developers", label: "AI support for developer tools" },
      { href: "/integrations/nextjs", label: "Next.js AI chatbot integration" },
      { href: "/blog/how-to-add-ai-chatbot-to-website", label: "How to add an AI chatbot to your website" },
      { href: "/tools/support-ticket-deflection-calculator", label: "Support ticket deflection calculator" },
    ],
    name: "React",
    heroEyebrow: "React Integration",
    heroTitle: "AI Chatbot for React Apps",
    heroSub:
      "Add an AI support agent to any React application via a useEffect hook or index.html script tag. Works with create-react-app, Vite, and any React setup.",
    metaTitle: "AI Chatbot for React Apps",
    metaDescription:
      "Add an AI customer support chatbot to any React application. Works via useEffect injection or a simple script tag in index.html. Free during beta.",
    metaKeywords: [
      "React AI chatbot",
      "chatbot for React app",
      "React customer support widget",
      "add chatbot to React",
      "React support automation",
      "SPA chatbot React",
    ],
    canonical: "https://frontface.app/integrations/react",
    ogImage: "https://frontface.app/blog-og/integration-react.png",
    ogImageAlt: "FrontFace — AI Chatbot for React applications",
    benefits: [
      {
        title: "Two install options — script tag or useEffect",
        description:
          "Add the script tag to your public/index.html before </body> for the simplest approach. Or use a useEffect hook in your App component to load the widget programmatically.",
      },
      {
        title: "Works with any React setup",
        description:
          "Create React App, Vite, Parcel — FrontFace is framework-agnostic JavaScript. It attaches to the DOM once and persists across React's virtual DOM re-renders.",
      },
      {
        title: "Answers from your product documentation",
        description:
          "Upload your API docs, guides, and FAQs. Users get accurate, cited answers from your actual content instead of generic LLM responses about your product.",
      },
      {
        title: "Doesn't interfere with React state",
        description:
          "FrontFace runs in an isolated shadow DOM widget and doesn't interact with your React component tree or cause unexpected re-renders.",
      },
    ],
    faqs: [
      {
        q: "How do I add FrontFace to a React app?",
        a: "Option 1: Add the script tag to public/index.html before </body>. Option 2: In your App.tsx, use a useEffect with document.createElement('script') to load the widget on mount. Both approaches work across all React setups.",
      },
      {
        q: "Will it cause React re-render issues?",
        a: "No. FrontFace runs in an isolated widget outside React's component tree. It doesn't modify your component state, trigger context updates, or interfere with React rendering in any way.",
      },
      {
        q: "Does it work with React Router?",
        a: "Yes. The FrontFace widget loads once and persists across React Router navigation without re-initializing. It appears on every route unless you conditionally load it.",
      },
      {
        q: "Can I conditionally show it only on certain routes?",
        a: "Yes. Use a useEffect inside a specific page component to inject the script on mount and clean it up on unmount. This scopes the widget to only that route.",
      },
    ],
  },
];
