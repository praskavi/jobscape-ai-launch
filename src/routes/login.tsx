import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/auth/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — JobMatch AI" },
      {
        name: "description",
        content: "Log in to JobMatch AI to access your personalized job matches and dashboard.",
      },
    ],
  }),
  component: LoginPage,
});
