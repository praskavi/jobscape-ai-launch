import * as React from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { SocialLoginButton } from "./SocialLoginButton";
import { Divider } from "./Divider";
import { PasswordInput } from "./PasswordInput";
import { supabase } from "@/controllers/suabaseClient";

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

  const handleGoogleLogin = () => {
    // TODO: connect Google auth
    console.log("Google login");
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
      // 1. Send data to your supabase
      const {data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        throw signInError;
      }

      // 2. Handle errors (e.g., wrong password, user not found)
      if (signInError) {
        throw new Error(signInError.message);
      }

      // 3. Success! 
      setSuccessMsg("Logged in successfully!");
      
      // TODO: Redirect user to the dashboard 
      // e.g., router.push('/dashboard') or window.location.href = '/dashboard';

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-[400px] rounded-xl border border-border bg-surface p-8 shadow-soft"
      >
        <div className="flex flex-col items-center text-center">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-soft"
          >
            <Briefcase className="h-7 w-7" />
          </div>
          <h1 id="login-heading" className="mt-5 text-2xl font-bold tracking-tight text-foreground">
            Login to {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Pick up where you left off.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
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

        <div className="my-5">
          <Divider label="or login with email" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
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
              className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
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
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          
          {successMsg && (
            <p role="alert" className="text-xs font-medium text-green-600 dark:text-green-400">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 h-10 w-full rounded-lg bg-foreground text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot password?
          </Link>
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-foreground hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}