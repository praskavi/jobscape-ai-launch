import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Protect: /dashboard, /atschecker, /jobsearch, /documents, /settings
  const protectedPaths = ["/dashboard", "/atschecker", "/jobsearch", "/documents", "/settings"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return res;
  }

  // Retrieve Supabase token from cookies
  let token: string | undefined;

  const allCookies = req.cookies.getAll();
  // Find any cookie related to access-token or auth-token
  const authCookie = allCookies.find(c => c.name.includes("auth-token") || c.name === "sb-access-token");

  if (authCookie) {
    try {
      if (authCookie.value.startsWith("[") || authCookie.value.startsWith("{")) {
        const parsed = JSON.parse(authCookie.value);
        token = parsed?.access_token || parsed?.[0];
      } else {
        token = authCookie.value;
      }
    } catch (e) {
      token = authCookie.value;
    }
  }

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Verify the JWT token cryptographically against Supabase Auth server
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(url);
    }
  } catch (err) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/atschecker/:path*",
    "/jobsearch/:path*",
    "/documents/:path*",
    "/settings/:path*",
  ],
};
