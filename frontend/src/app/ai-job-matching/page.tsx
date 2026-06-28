import { FeatureSeoPage } from "@/components/seo/FeatureSeoPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Job Matching",
  description:
    "Find better-fit roles with AI job matching that compares your resume profile against live job listings.",
  alternates: {
    canonical: "/ai-job-matching",
  },
};

export default function AiJobMatchingSeoPage() {
  return (
    <FeatureSeoPage
      eyebrow="AI job matching"
      title="Find better-fit jobs with AI-powered resume matching"
      description="Jobscape AI ranks job listings against your resume profile so you can focus on roles where your skills, title history, and experience are a stronger fit."
      primaryCta="Start job matching"
      primaryHref="/register"
      pagePath="/ai-job-matching"
      benefits={[
        "Search live job listings by role and location.",
        "Rank jobs using resume fit signals.",
        "Compare rule-based and AI-assisted scoring.",
        "Save time by focusing on stronger-fit opportunities.",
      ]}
      steps={[
        {
          title: "Create your resume profile",
          description: "Upload your resume so Jobscape AI can extract role, skills, and experience signals.",
        },
        {
          title: "Search for jobs",
          description: "Enter a role and location to find relevant jobs from available sources.",
        },
        {
          title: "Review ranked matches",
          description: "Use match scores to prioritize the jobs worth deeper review.",
        },
      ]}
      faqs={[
        {
          question: "What is AI job matching?",
          answer: "AI job matching compares your resume profile with job listings to help surface roles that better match your skills and background.",
        },
        {
          question: "Does Jobscape AI apply to jobs for me?",
          answer: "No. Jobscape AI helps you decide where to apply. You remain in control of every application.",
        },
        {
          question: "Why is this behind login?",
          answer: "Matching requires your resume profile and saved search data, so the actual tool is protected by account login.",
        },
      ]}
    />
  );
}
