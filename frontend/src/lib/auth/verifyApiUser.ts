import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createLegacyClient } from "@supabase/supabase-js";

export async function verifyApiUser(req: Request) {
  // 1. Try cookie-based session verification using the SSR server client first
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (user && !error) {
      return { response: null, user };
    }
  } catch (err) {
    // Ignore and proceed to fallback header check
  }

  // 2. Fallback: Verify JWT using Authorization Bearer header
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null
    };
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createLegacyClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        user: null
      };
    }

    return { response: null, user };
  } catch (err) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null
    };
  }
}
