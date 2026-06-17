"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, ArrowLeft } from "lucide-react"; // Added ArrowLeft
import { SocialLoginButton } from "./SocialLoginButton";
import { Divider } from "./Divider";
import { PasswordInput } from "./PasswordInput";
import { supabase } from "@/controllers/suabaseClient";
import { useRouter } from "next/navigation";

const APP_NAME = "JobMatch AI";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.5 6.7 2.5 12s4.2 9.6 9.5 9.6c5.5 0 9.1-3.9 9.1-9.3 0-.6-.07-1.1-.16-1.6H12z"
    />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      fill="currentColor"
      d="M18.244 2H21.5l-7.55 8.63L23 22h-6.78l-5.31-6.94L4.8 22H1.54l8.08-9.23L1 2h6.95l4.8 6.34L18.24 2zm-1.19 18h1.87L7.05 4H5.1l11.95 16z"
    />
  </svg>
);

export function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTwitterLogin = () => {
    // TODO: connect Twitter auth
    console.log("Twitter login");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      setSuccessMsg("Logged in successfully!");
      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      
      <button 
        onClick={() => router.push('/')}
        className="absolute left-6 top-6 sm:left-10 sm:top-10 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>
      
      <section
        aria-labelledby="login-heading"
        // FIX 2: Slightly increased max-width for better breathing room, upgraded border-radius and shadow
        className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8 sm:p-10 shadow-xl"
      >
        <div className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-md"
          >
            <Briefcase className="h-6 w-6" />
          </div>
          <h1 id="login-heading" className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            Login to {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back. Pick up where you left off.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <SocialLoginButton
            icon={<GoogleIcon />}
            label="Continue with Google"
            onClick={handleGoogleLogin}
          />
          <SocialLoginButton
            icon={<TwitterIcon />}
            label="Continue with Twitter"
            onClick={handleTwitterLogin}
          />
        </div>

        <div className="my-6">
          <Divider label="or login with email" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-11 w-full rounded-lg border border-input bg-surface px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              minLength={8}
              required
              // Assuming PasswordInput accepts className props to match the email input height
              className="h-11" 
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p role="alert" className="text-sm font-medium text-destructive text-center">
                {error}
              </p>
            </div>
          )}

          {successMsg && (
            <div className="rounded-md bg-green-500/10 p-3">
              <p role="alert" className="text-sm font-medium text-green-600 dark:text-green-400 text-center">
                {successMsg}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot your password?
          </Link>
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-foreground hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}