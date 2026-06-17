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
}

export const integrations: IntegrationPage[] = [
  {
    slug: "shopify",
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
];
