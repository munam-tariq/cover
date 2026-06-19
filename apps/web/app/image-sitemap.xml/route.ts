import { blogPosts } from "../(marketing)/blog/blog-data";
import { integrations } from "../(marketing)/integrations/integrations-data";
import { tools } from "../(marketing)/tools/tools-data";
import { useCases } from "../(marketing)/use-cases/use-cases-data";
import { vsPages } from "../(marketing)/vs/vs-data";

const BASE_URL = "https://frontface.app";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteImageUrl(url: string) {
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export function GET() {
  const entries = [
    ...blogPosts.map((post) => ({
      page: `${BASE_URL}/blog/${post.slug}`,
      image: absoluteImageUrl(post.image),
      title: post.title,
    })),
    ...integrations.map((page) => ({
      page: page.canonical,
      image: page.ogImage,
      title: page.ogImageAlt,
    })),
    ...useCases.map((page) => ({
      page: page.canonical,
      image: page.ogImage,
      title: page.ogImageAlt,
    })),
    ...tools.map((tool) => ({
      page: tool.canonical,
      image: tool.ogImage,
      title: tool.ogImageAlt,
    })),
    {
      page: `${BASE_URL}/vs`,
      image: `${BASE_URL}/blog-og/vs-index.png`,
      title: "FrontFace competitor comparisons",
    },
    ...vsPages.map((page) => ({
      page: page.canonical,
      image: page.ogImage,
      title: page.ogImageAlt,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .map(
    (entry) => `<url>
  <loc>${escapeXml(entry.page)}</loc>
  <image:image>
    <image:loc>${escapeXml(entry.image)}</image:loc>
    <image:title>${escapeXml(entry.title)}</image:title>
  </image:image>
</url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
