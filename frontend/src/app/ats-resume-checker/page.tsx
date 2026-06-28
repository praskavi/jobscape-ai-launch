import { FeatureSeoPage } from "@/components/seo/FeatureSeoPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ATS Resume Checker",
  description:
    "Check how well your resume matches a job description with Jobscape AI's ATS resume checker and AI-powered feedback.",
  alternates: {
    canonical: "/ats-resume-checker",
  },
};

export default function AtsResumeCheckerSeoPage() {
  return (
    <FeatureSeoPage
      eyebrow="ATS resume checker"
      title="Check your resume against a job description before you apply"
      description="Jobscape AI helps you compare your resume with a target job description, understand your match score, and identify gaps before spending time on an application."
      primaryCta="Check my resume"
      primaryHref="/register"
      pagePath="/ats-resume-checker"
      secondaryCta="See plans"
      secondaryHref="/pricing"
      benefits={[
        "Compare a resume against a target job description.",
        "See an ATS-style match score before applying.",
        "Identify missing skills, keywords, and experience signals.",
        "Use saved resumes after signing in.",
      ]}
      steps={[
        {
          title: "Upload or select a resume",
          description: "Use your saved resume or upload a document to start the ATS check.",
        },
        {
          title: "Paste the job description",
          description: "Add the role description so Jobscape AI can compare your resume to the actual requirements.",
        },
        {
          title: "Review your score",
          description: "Use the match score and feedback to decide whether to tailor your resume before applying.",
        },
      ]}
      faqs={[
        {
          question: "Is the ATS checker public?",
          answer: "The feature page is public, but the actual resume analysis is protected so your resume data stays tied to your account.",
        },
        {
          question: "Can I use a saved resume?",
          answer: "Yes. After signing in, the ATS checker can use resumes stored in your Jobscape AI document library.",
        },
        {
          question: "Does it replace human review?",
          answer: "No. It helps you spot likely ATS and keyword gaps, but you should still review your resume before applying.",
        },
      ]}
    />
  );
}
