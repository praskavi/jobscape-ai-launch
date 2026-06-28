import { siteUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicRoutes = [
    "",
    "/pricing",
    "/ats-resume-checker",
    "/ai-job-matching",
    "/resume-match-score",
    "/cover-letter-generator",
    "/login",
    "/register",
    "/forgot-password",
    "/about",
    "/privacy",
    "/terms",
  ];

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
