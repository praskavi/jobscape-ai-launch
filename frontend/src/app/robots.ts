import { siteUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard/", "/documents/", "/settings/", "/subscription/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
