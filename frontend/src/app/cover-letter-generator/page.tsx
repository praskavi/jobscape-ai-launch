import { FeatureSeoPage } from "@/components/seo/FeatureSeoPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Cover Letter Generator",
  description:
    "Generate a role-specific cover letter draft using your resume and target job details with Jobscape AI.",
  alternates: {
    canonical: "/cover-letter-generator",
  },
};

export default function CoverLetterGeneratorSeoPage() {
  return (
    <FeatureSeoPage
      eyebrow="AI cover letter generator"
      title="Create a role-specific cover letter draft faster"
      description="Jobscape AI uses your resume and job details to help draft a focused cover letter that you can review, edit, and personalize before applying."
      primaryCta="Generate a cover letter"
      primaryHref="/register"
      pagePath="/cover-letter-generator"
      benefits={[
        "Draft cover letters from your resume and job context.",
        "Save time when applying to multiple roles.",
        "Keep the final edit under your control.",
        "Use plan-based AI generation limits after signing in.",
      ]}
      steps={[
        {
          title: "Upload your resume",
          description: "Give the generator your background, skills, and recent experience.",
        },
        {
          title: "Add role details",
          description: "Provide the company, title, and job description for better context.",
        },
        {
          title: "Review the draft",
          description: "Edit the generated letter so it sounds like you before sending it.",
        },
      ]}
      faqs={[
        {
          question: "Can I send the generated cover letter as-is?",
          answer: "You can, but we recommend reviewing and personalizing every draft before sending it.",
        },
        {
          question: "Does it use my resume?",
          answer: "Yes. The protected generator uses your resume and the job details to create a more relevant draft.",
        },
        {
          question: "Is cover letter generation free?",
          answer: "AI document generation is controlled by subscription entitlements and monthly usage limits.",
        },
      ]}
    />
  );
}
