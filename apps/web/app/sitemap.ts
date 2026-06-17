import { MetadataRoute } from "next";

import { blogPosts } from "./(marketing)/blog/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://frontface.app";
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
    { url: `${baseUrl}/about`,             lastModified: new Date("2026-06-17"), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${baseUrl}/privacy`,           lastModified: new Date("2026-06-17"), changeFrequency: "yearly"  as const, priority: 0.3 },
    { url: `${baseUrl}/terms`,             lastModified: new Date("2026-06-17"), changeFrequency: "yearly"  as const, priority: 0.3 },
  ];

  // Blog posts — real lastModified from post.date so Google sees actual freshness
  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
