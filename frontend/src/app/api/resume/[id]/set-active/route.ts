// KAN-37: Premium-only endpoint to switch which stored resume is active.
//
// Sets all resumes for the user to is_current = false, then sets the
// target resume to is_current = true. The partial unique index
// (uq_user_files_current_per_type WHERE is_current = true) enforces
// exactly one active resume at the DB level.
//
// Only Premium plan users can have more than 1 stored resume, so this
// endpoint is gated to Premium. Free/Basic users always have exactly 1
// resume and never need to switch.

import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { createClient } from "@supabase/supabase-js";

function withCors(
  response: NextResponse,
  corsResponse: ReturnType<typeof handleCors>,
) {
  if (corsResponse.response) {
    corsResponse.response.headers.forEach((val, key) => {
      response.headers.set(key, val);
    });
  }
  return response;
}

function getBearerToken(request: Request) {
  const h = request.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length);
}

function createRouteSupabaseClient(request: Request) {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const bearerToken = getBearerToken(request);

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    bearerToken && !serviceRoleKey
      ? { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      : undefined,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  // 1. CORS
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) {
    return corsResponse.response;
  }

  // 2. JWT auth
  const auth = await verifyApiUser(request);
  if (auth.response) {
    corsResponse.response?.headers.forEach((val, key) =>
      auth.response.headers.set(key, val),
    );
    return auth.response;
  }

  const resumeId = params.id;
  if (!resumeId) {
    return withCors(
      NextResponse.json({ error: "Missing resume ID." }, { status: 400 }),
      corsResponse,
    );
  }

  const supabase = createRouteSupabaseClient(request);

  // 3. Verify user is on Premium plan
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("subscription_plans!inner(plan_code)")
    .eq("user_id", auth.user!.id)
    .in("status", ["trialing", "active", "past_due", "free"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planCode = (subscription as any)?.subscription_plans?.plan_code ?? "free";

  if (planCode !== "premium") {
    return withCors(
      NextResponse.json(
        {
          error: "Upgrade required.",
          message: "Selecting an active resume requires a Premium plan.",
          reason: "feature_not_enabled",
        },
        { status: 402 },
      ),
      corsResponse,
    );
  }

  // 4. Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", auth.user!.id)
    .maybeSingle<{ id: string }>();

  if (!profile?.id) {
    return withCors(
      NextResponse.json({ error: "Could not load user profile." }, { status: 500 }),
      corsResponse,
    );
  }

  // 5. Verify ownership: the target resume must belong to this user
  const { data: targetResume, error: ownershipError } = await supabase
    .from("user_files")
    .select("id, file_name, file_type")
    .eq("id", resumeId)
    .eq("user_profile_id", profile.id)
    .eq("file_type", "resume")
    .maybeSingle<{ id: string; file_name: string; file_type: string }>();

  if (ownershipError || !targetResume) {
    return withCors(
      NextResponse.json(
        { error: "Resume not found or access denied." },
        { status: 404 },
      ),
      corsResponse,
    );
  }

  // 6. Deactivate all resumes for this user, then activate the target.
  //    Two separate updates rather than a single conditional update so the
  //    partial unique index (WHERE is_current = true) is never violated.
  const { error: deactivateError } = await supabase
    .from("user_files")
    .update({ is_current: false })
    .eq("user_profile_id", profile.id)
    .eq("file_type", "resume");

  if (deactivateError) {
    console.error("Failed to deactivate resumes", deactivateError);
    return withCors(
      NextResponse.json(
        { error: "Failed to update active resume. Please try again." },
        { status: 500 },
      ),
      corsResponse,
    );
  }

  const { data: activatedResume, error: activateError } = await supabase
    .from("user_files")
    .update({ is_current: true })
    .eq("id", resumeId)
    .select("id, file_name, file_path, mime_type, file_size_bytes, is_current, created_at")
    .single();

  if (activateError || !activatedResume) {
    console.error("Failed to activate resume", activateError);
    // Attempt to restore: set the most-recent resume back to active
    await supabase
      .from("user_files")
      .update({ is_current: true })
      .eq("user_profile_id", profile.id)
      .eq("file_type", "resume")
      .order("created_at", { ascending: false })
      .limit(1);

    return withCors(
      NextResponse.json(
        { error: "Failed to set active resume. Please try again." },
        { status: 500 },
      ),
      corsResponse,
    );
  }

  return withCors(
    NextResponse.json({
      success: true,
      message: `"${activatedResume.file_name}" is now your active resume.`,
      active_resume_id: resumeId,
      resume: activatedResume,
    }),
    corsResponse,
  );
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
