export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://jobscrape-ai-j8fxn.ondigitalocean.app";

export const siteName = "Jobscape AI";

export const defaultSeoDescription =
  "Upload your resume, search live jobs, and instantly see which roles are worth applying for with AI-powered resume matching and ATS scoring.";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}
