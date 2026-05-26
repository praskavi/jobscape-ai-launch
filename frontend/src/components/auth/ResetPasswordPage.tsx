"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import { PasswordInput } from "./PasswordInput";
import { supabase } from "@/controllers/suabaseClient";

const APP_NAME = "Jobscape AI";

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const initializeRecoverySession = async () => {
      const code = searchParams.get("code");

      if (!code) {
        if (isMounted) {
          setInitializing(false);
        }
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!isMounted) {
        return;
      }

      if (exchangeError) {
        setError(exchangeError.message || "This password reset link is invalid or has expired.");
      }

      setInitializing(false);
    };

    initializeRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    // The reset email opens this page with a short-lived Supabase recovery
    // session. updateUser changes only the password for that recovered user.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Could not update your password.");
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setSuccess("Password updated. You can continue to your dashboard or log in again.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        aria-labelledby="reset-password-heading"
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
            id="reset-password-heading"
            className="mt-5 text-2xl font-bold tracking-tight text-foreground"
          >
            Reset your {APP_NAME} password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="sr-only">
              New password
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-new-password" className="sr-only">
              Confirm new password
            </label>
            <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              disabled={loading}
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
            disabled={loading || initializing}
            className="mt-1 h-10 w-full rounded-lg bg-foreground text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
          >
            {initializing
              ? "Preparing reset..."
              : loading
                ? "Updating password..."
                : "Update password"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Go to dashboard
          </button>
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
