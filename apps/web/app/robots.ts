import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://frontface.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/auth/", "/onboarding/", "/invite/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
