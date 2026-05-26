import { ATSChecker } from "@/components/ATSchecker/ATSChecker";

export const metadata = {
  title: "ATS Resume Checker - Jobscape AI",
  description:
    "Upload your resume and a job description to analyze your ATS match score and get actionable feedback.",
};

export default function AtsChecker() {
  return <ATSChecker />;
}
