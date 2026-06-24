import { createClient } from "@supabase/supabase-js";

export function createServiceSupabaseClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase service role key.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );
}
