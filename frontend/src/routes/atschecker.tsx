import { createFileRoute } from "@tanstack/react-router";
import { ATSChecker } from "@/components/ATSchecker/ATSChecker"; // Ensure this path matches your folder structure

export const Route = createFileRoute("/atschecker")({
  head: () => ({
    meta: [
      { title: "ATS Resume Checker — Jobscape AI" },
      {
        name: "description",
        content:
          "Upload your resume and a job description to analyze your ATS match score and get actionable feedback.",
      },
    ],
  }),
  component: ATSChecker,
});