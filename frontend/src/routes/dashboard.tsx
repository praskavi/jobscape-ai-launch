import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Jobscape AI" },
      {
        name: "description",
        content:
          "Manage your resume, cover letter, and job search activity in your Jobscape AI dashboard.",
      },
    ],
  }),
  component: DashboardPage,
});
