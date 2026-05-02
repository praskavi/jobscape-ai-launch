import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Jobscape AI — AI-powered job search & resume matching" },
      { name: "description", content: "Upload your resume, search live jobs, and instantly see which roles are worth applying for with AI-powered match scores." },
      { property: "og:title", content: "Jobscape AI — Apply smarter, not harder" },
      { property: "og:description", content: "AI resume matching and ATS scoring for live job listings." },
    ],
  }),
});
