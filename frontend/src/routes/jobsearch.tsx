import { createFileRoute } from "@tanstack/react-router";
import JobSearchPage from "@/components/jobsearch/JobSearchPage"; // Adjust if JobSearchPage is default or named

export const Route = createFileRoute("/jobsearch")({
  head: () => ({
    meta: [
      { title: "Job Searches — Jobscape AI" },
      {
        name: "description",
        content: "Track your automated job search results.",
      },
    ],
  }),
  component: JobSearchPage,
});