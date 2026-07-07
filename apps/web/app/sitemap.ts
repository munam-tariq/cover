import { MetadataRoute } from "next";

import { blogPosts } from "./[locale]/(marketing)/blog/blog-data";
import { integrations as integrationPages } from "./[locale]/(marketing)/integrations/integrations-data";
import { tools as toolPages } from "./[locale]/(marketing)/tools/tools-data";
import { useCases as useCasePages } from "./[locale]/(marketing)/use-cases/use-cases-data";
import { vsPages } from "./[locale]/(marketing)/vs/vs-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://frontface.app";
  // Routes with an Arabic variant (Phase 1). Blog//vs//use-cases and
  // integration sub-pages are English-only — no hreflang alternates.
  const translatedRoutes = new Set([
    "/",
    "/features",
    "/integrations",
    "/tools",
    "/about",
    "/privacy",
    "/terms",
    ...toolPages.map((tool: { slug: string }) => `/tools/${tool.slug}`),
  ]);
  const withAlternates = (entry: MetadataRoute.Sitemap[number]) => {
    const path = entry.url.slice(baseUrl.length) || "/";
    if (!translatedRoutes.has(path)) return entry;
    return {
      ...entry,
      alternates: {
        languages: {
          en: entry.url,
          ar: `${baseUrl}/ar${path === "/" ? "" : path}`,
        },
      },
    };
  };
  // Use a fixed date so the sitemap is stable across static builds.
  // Update these when content actually changes — "new Date()" on every
  // build tells Google every page changed on every deploy, which burns
  // crawl budget and dilutes freshness signals.
  const staticPages = [
    { url: baseUrl,                        lastModified: new Date("2026-06-17"), changeFrequency: "weekly"  as const, priority: 1   },
    { url: `${baseUrl}/blog`,              lastModified: new Date("2026-06-17"), changeFrequency: "weekly"  as const, priority: 0.9 },
    { url: `${baseUrl}/features`,          lastModified: new Date("2026-06-17"), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/use-cases`,         lastModified: new Date("2026-06-17"), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/integrations`,      lastModified: new Date("2026-06-17"), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/tools`,             lastModified: new Date("2026-06-19"), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/vs`,              lastModified: new Date("2026-06-19"), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/about`,             lastModified: new Date("2026-06-17"), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/privacy`,           lastModified: new Date("2026-06-17"), changeFrequency: "yearly"  as const, priority: 0.3 },
    { url: `${baseUrl}/terms`,             lastModified: new Date("2026-06-17"), changeFrequency: "yearly"  as const, priority: 0.3 },
  ];

  const integrationSubPages = integrationPages.map((p) => ({
    url: `${baseUrl}/integrations/${p.slug}`,
    lastModified: new Date("2026-06-18"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const useCaseSubPages = useCasePages.map((p) => ({
    url: `${baseUrl}/use-cases/${p.slug}`,
    lastModified: new Date("2026-06-18"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Blog posts — real lastModified from post.date so Google sees actual freshness
  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const tools = toolPages.map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified: new Date(tool.lastModified),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const vsSubPages = vsPages.map((p) => ({
    url: `${baseUrl}/vs/${p.slug}`,
    lastModified: new Date("2026-06-19"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...integrationSubPages, ...useCaseSubPages, ...vsSubPages, ...tools, ...blogPages].map(withAlternates);
}
