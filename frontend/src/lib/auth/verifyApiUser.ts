import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function verifyApiUser(req: Request) {
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
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
