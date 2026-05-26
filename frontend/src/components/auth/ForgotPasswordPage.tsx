"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { supabase } from "@/controllers/suabaseClient";

const APP_NAME = "Jobscape AI";

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "Could not send a password reset email.");
      return;
    }

    setSuccess("If an account exists for that email, a reset link has been sent.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        aria-labelledby="forgot-password-heading"
        className="w-full max-w-[400px] rounded-xl border border-border bg-surface p-8 shadow-soft"
      >
        <div className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-soft"
          >
            <Briefcase className="h-7 w-7" />
          </div>
          <h1
            id="forgot-password-heading"
            className="mt-5 text-2xl font-bold tracking-tight text-foreground"
          >
            Reset your {APP_NAME} password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we will send you a password reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-email" className="sr-only">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-xs font-medium text-emerald-700">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-10 w-full rounded-lg bg-foreground text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
