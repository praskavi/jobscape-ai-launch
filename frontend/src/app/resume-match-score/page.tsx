import { FeatureSeoPage } from "@/components/seo/FeatureSeoPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Match Score",
  description:
    "Use Jobscape AI to estimate how closely your resume matches a target job description before you apply.",
  alternates: {
    canonical: "/resume-match-score",
  },
};

export default function ResumeMatchScoreSeoPage() {
  return (
    <FeatureSeoPage
      eyebrow="Resume match score"
      title="Understand how closely your resume matches a role"
      description="A resume match score helps you decide whether a role is worth applying to and where your resume may need tailoring for the job description."
      primaryCta="Get my match score"
      primaryHref="/register"
      pagePath="/resume-match-score"
      benefits={[
        "Estimate fit before investing time in an application.",
        "Compare resume keywords against job requirements.",
        "Spot missing skills and experience signals.",
        "Use the score alongside your own judgement.",
      ]}
      steps={[
        {
          title: "Add your resume",
          description: "Start with your saved or uploaded resume.",
        },
        {
          title: "Add job context",
          description: "Paste the job description or search for relevant job listings.",
        },
        {
          title: "Use the score",
          description: "Prioritize stronger matches and tailor your resume for roles that matter.",
        },
      ]}
      faqs={[
        {
          question: "Is a high resume match score a guarantee?",
          answer: "No. It is a decision aid that helps you understand alignment, but hiring outcomes depend on many factors.",
        },
        {
          question: "What affects the score?",
          answer: "Skills, role relevance, job requirements, and resume content can all affect the match score.",
        },
        {
          question: "Can I compare multiple resumes?",
          answer: "Premium users can store multiple resumes and choose the best version for a target role.",
        },
      ]}
    />
  );
}
