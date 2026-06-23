// KAN-37: Resume versioning — plan-based stored-count limits.
//
// resume_upload limit (1/1/3) is a concurrent stored-count cap, NOT a monthly
// rate limit. We do NOT call can_use_feature / increment_usage for this feature.
// Instead we COUNT existing rows in user_files and compare against the plan limit
// read from plan_features. See docs/solution-design-resume-versioning.md.
//
// Free / Basic : limit = 1 → auto-replace existing resume on new upload.
// Premium      : limit = 3 → error when at limit; new upload sets all others
//                             is_current = false, new row is_current = true.

import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "user-documents";
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── plan helpers ──────────────────────────────────────────────────────────────

type PlanInfo = {
  plan_code: string;
  resume_storage_limit: number; // from plan_features.usage_limit for resume_upload
};

async function getUserPlanInfo(
  supabase: ReturnType<typeof createRouteSupabaseClient>,
  authUserId: string,
): Promise<PlanInfo | null> {
  // Join: user_subscriptions → subscription_plans + plan_features → subscription_features
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(
      `
      subscription_plans!inner(plan_code),
      plan_features!inner(
        usage_limit,
        subscription_features!inner(feature_code)
      )
    `,
    )
    .eq("user_id", authUserId)
    .eq("status", "active")
    .eq("plan_features.subscription_features.feature_code", "resume_upload")
    .maybeSingle();

  // Fallback: try 'free' status too
  if (error || !data) {
    const { data: fallback } = await supabase
      .from("user_subscriptions")
      .select(
        `
        subscription_plans!inner(plan_code),
        plan_features!inner(
          usage_limit,
          subscription_features!inner(feature_code)
        )
      `,
      )
      .eq("user_id", authUserId)
      .in("status", ["trialing", "active", "past_due", "free"])
      .eq("plan_features.subscription_features.feature_code", "resume_upload")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallback) return null;

    return {
      plan_code: (fallback as any).subscription_plans?.plan_code ?? "free",
      resume_storage_limit:
        (fallback as any).plan_features?.usage_limit ?? 1,
    };
  }

  return {
    plan_code: (data as any).subscription_plans?.plan_code ?? "free",
    resume_storage_limit: (data as any).plan_features?.usage_limit ?? 1,
  };
}

async function countStoredResumes(
  supabase: ReturnType<typeof createRouteSupabaseClient>,
  userProfileId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("user_files")
    .select("id", { count: "exact", head: true })
    .eq("user_profile_id", userProfileId)
    .eq("file_type", "resume");

  if (error) throw new Error("Could not count stored resumes.");
  return count ?? 0;
}

// ── route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. CORS
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) {
    return corsResponse.response;
  }

  // 2. Rate limit
  const rateLimitResponse = checkRateLimit(request, 20);
  if (rateLimitResponse) {
    corsResponse.response?.headers.forEach((val, key) =>
      rateLimitResponse.headers.set(key, val),
    );
    return rateLimitResponse;
  }

  // 3. JWT auth
  const auth = await verifyApiUser(request);
  if (auth.response) {
    corsResponse.response?.headers.forEach((val, key) =>
      auth.response.headers.set(key, val),
    );
    return auth.response;
  }

  // 4. Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid form data." }, { status: 400 }),
      corsResponse,
    );
  }

  const resumeFile = formData.get("resume") as File | null;
  if (!resumeFile) {
    return withCors(
      NextResponse.json({ error: "Missing resume file." }, { status: 400 }),
      corsResponse,
    );
  }

  // 5. File validation
  const mimetype = resumeFile.type;
  const filename = resumeFile.name.toLowerCase();
  const filesize = resumeFile.size;
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(mimetype);

  if (!hasValidExt || !hasValidMime) {
    return withCors(
      NextResponse.json(
        { error: "Unsupported file type. Only PDF, DOC, and DOCX are allowed." },
        { status: 415 },
      ),
      corsResponse,
    );
  }
  if (filesize > MAX_FILE_BYTES) {
    return withCors(
      NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 415 },
      ),
      corsResponse,
    );
  }

  const supabase = createRouteSupabaseClient(request);

  // 6. Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", auth.user!.id)
    .maybeSingle<{ id: string }>();

  if (profileError || !profile?.id) {
    return withCors(
      NextResponse.json({ error: "Could not load user profile." }, { status: 500 }),
      corsResponse,
    );
  }

  // 7. Plan-aware stored-count check
  let planInfo: PlanInfo | null = null;
  try { planInfo = await getUserPlanInfo(supabase, auth.user!.id); } catch {}

  const storageLimit = planInfo?.resume_storage_limit ?? 1;
  const planCode = planInfo?.plan_code ?? "free";

  let currentCount: number;
  try {
    currentCount = await countStoredResumes(supabase, profile.id);
  } catch {
    return withCors(
      NextResponse.json({ error: "Could not check resume storage." }, { status: 500 }),
      corsResponse,
    );
  }

  const { data: existingResumes } = await supabase
    .from("user_files")
    .select("id, file_path, is_current")
    .eq("user_profile_id", profile.id)
    .eq("file_type", "resume")
    .order("created_at", { ascending: false });

  const resumes = existingResumes ?? [];

  if (planCode === "premium") {
    if (currentCount >= storageLimit) {
      return withCors(
        NextResponse.json(
          {
            error: "Resume library full.",
            message: `Your plan allows up to ${storageLimit} stored resumes. Delete one to upload a new resume.`,
            reason: "storage_limit_reached",
            current_count: currentCount,
            limit: storageLimit,
          },
          { status: 402 },
        ),
        corsResponse,
      );
    }
    if (resumes.length > 0) {
      await supabase
        .from("user_files")
        .update({ is_current: false })
        .eq("user_profile_id", profile.id)
        .eq("file_type", "resume");
    }
  } else {
    if (resumes.length > 0) {
      const old = resumes[0];
      const { error: storageDeleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([old.file_path]);
      if (storageDeleteError) {
        return withCors(
          NextResponse.json({ error: "Failed to replace existing resume. Please try again." }, { status: 500 }),
          corsResponse,
        );
      }
      await supabase.from("user_files").delete().eq("id", old.id);
    }
  }

  // 8. Upload new file to storage
  const fileExt = filename.split(".").pop() || "pdf";
  const newFileName = `resume_${Date.now()}.${fileExt}`;
  const newFilePath = `${auth.user!.id}/${newFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(newFilePath, resumeFile, { cacheControl: "3600", contentType: mimetype, upsert: false });

  if (uploadError) {
    if (planCode === "premium" && resumes.length > 0) {
      await supabase.from("user_files").update({ is_current: true }).eq("id", resumes[0].id);
    }
    return withCors(
      NextResponse.json({ error: "Failed to upload resume." }, { status: 500 }),
      corsResponse,
    );
  }

  // 9. Insert DB row with is_current = true
  const { data: fileRow, error: dbError } = await supabase
    .from("user_files")
    .insert({
      user_profile_id: profile.id,
      file_type: "resume",
      file_name: resumeFile.name,
      file_path: newFilePath,
      bucket_name: STORAGE_BUCKET,
      mime_type: mimetype,
      file_size_bytes: filesize,
      is_current: true,
    })
    .select("id, file_type, file_name, file_path, mime_type, file_size_bytes, is_current, created_at")
    .single();

  if (dbError || !fileRow) {
    await supabase.storage.from(STORAGE_BUCKET).remove([newFilePath]);
    if (planCode === "premium" && resumes.length > 0) {
      await supabase.from("user_files").update({ is_current: true }).eq("id", resumes[0].id);
    }
    return withCors(
      NextResponse.json({ error: "Failed to save resume metadata." }, { status: 500 }),
      corsResponse,
    );
  }

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(newFilePath, 3600);

  return withCors(
    NextResponse.json({
      success: true,
      message: "Resume uploaded successfully.",
      plan_code: planCode,
      stored_count: currentCount + 1,
      storage_limit: storageLimit,
      file: { ...fileRow, file_url: signedUrlData?.signedUrl || "" },
    }),
    corsResponse,
  );
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
    .maybeSingle<{ id: string }>();

  if (profileError || !profile?.id) {
    return withCors(
      NextResponse.json(
        { error: "Could not load user profile." },
        { status: 500 },
      ),
      corsResponse,
    );
  }

  // 7. Plan-aware stored-count check
  //    resume_upload limit = max concurrent stored resumes (NOT monthly uploads).
  //    We do NOT call can_use_feature / increment_usage for this feature.
  let planInfo: PlanInfo | null = null;
  try {
    planInfo = await getUserPlanInfo(supabase, auth.user!.id);
  } catch {
    // Non-fatal: default to most restrictive limit
  }

  const storageLimit = planInfo?.resume_storage_limit ?? 1;
  const planCode = planInfo?.plan_code ?? "free";

  let currentCount: number;
  try {
    currentCount = await countStoredResumes(supabase, profile.id);
  } catch {
    return withCors(
      NextResponse.json(
        { error: "Could not check resume storage." },
        { status: 500 },
      ),
      corsResponse,
    );
  }

  // Fetch existing resumes for cleanup (Free/Basic auto-replace, Premium deactivate)
  const { data: existingResumes } = await supabase
    .from("user_files")
    .select("id, file_path, is_current")
    .eq("user_profile_id", profile.id)
    .eq("file_type", "resume")
    .order("created_at", { ascending: false });

  const resumes = existingResumes ?? [];

  if (planCode === "premium") {
    // Premium: block at limit, otherwise deactivate existing resumes
    if (currentCount >= storageLimit) {
      return withCors(
        NextResponse.json(
          {
            error: "Resume library full.",
            message: `Your plan allows up to ${storageLimit} stored resumes. Delete one to upload a new resume.`,
            reason: "storage_limit_reached",
            current_count: currentCount,
            limit: storageLimit,
          },
          { status: 402 },
        ),
        corsResponse,
      );
    }

    // Mark all existing resumes as inactive before inserting new active one
    if (resumes.length > 0) {
      await supabase
        .from("user_files")
        .update({ is_current: false })
        .eq("user_profile_id", profile.id)
        .eq("file_type", "resume");
    }
  } else {
    // Free / Basic: auto-replace — delete old resume from storage and DB
    if (resumes.length > 0) {
      const oldResume = resumes[0];

      // Delete old file from storage first
      const { error: storageDeleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([oldResume.file_path]);

      if (storageDeleteError) {
        console.error("Failed to delete old resume from storage", storageDeleteError);
        return withCors(
          NextResponse.json(
            { error: "Failed to replace existing resume. Please try again." },
            { status: 500 },
          ),
          corsResponse,
        );
      }

      // Delete old DB row
      await supabase
        .from("user_files")
        .delete()
        .eq("id", oldResume.id);
    }
  }

  // 8. Upload new file to storage
  const fileExt = filename.split(".").pop() || "pdf";
  const newFileName = `resume_${Date.now()}.${fileExt}`;
  const newFilePath = `${auth.user!.id}/${newFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(newFilePath, resumeFile, {
      cacheControl: "3600",
      contentType: mimetype,
      upsert: false,
    });

  if (uploadError) {
    console.error("Resume storage upload failed", uploadError);
    // If premium, restore is_current on existing resumes
    if (planCode === "premium" && resumes.length > 0) {
      await supabase
        .from("user_files")
        .update({ is_current: true })
        .eq("id", resumes[0].id);
    }
    return withCors(
      NextResponse.json({ error: "Failed to upload resume." }, { status: 500 }),
      corsResponse,
    );
  }

  // 9. Insert new DB row with is_current = true
  const { data: fileRow, error: dbError } = await supabase
    .from("user_files")
    .insert({
      user_profile_id: profile.id,
      file_type: "resume",
      file_name: resumeFile.name,
      file_path: newFilePath,
      bucket_name: STORAGE_BUCKET,
      mime_type: mimetype,
      file_size_bytes: filesize,
      is_current: true,
    })
    .select("id, file_type, file_name, file_path, mime_type, file_size_bytes, is_current, created_at")
    .single();

  if (dbError || !fileRow) {
    console.error("Resume DB insert failed", dbError);
    // Rollback: remove the just-uploaded storage file
    await supabase.storage.from(STORAGE_BUCKET).remove([newFilePath]);
    // For premium: restore previous active resume
    if (planCode === "premium" && resumes.length > 0) {
      await supabase
        .from("user_files")
        .update({ is_current: true })
        .eq("id", resumes[0].id);
    }
    return withCors(
      NextResponse.json(
        { error: "Failed to save resume metadata." },
        { status: 500 },
      ),
      corsResponse,
    );
  }

  // 10. Generate signed URL for immediate display
  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(newFilePath, 3600);

  return withCors(
    NextResponse.json({
      success: true,
      message: "Resume uploaded successfully.",
      plan_code: planCode,
      stored_count: currentCount + 1,
      storage_limit: storageLimit,
      file: {
        ...fileRow,
        file_url: signedUrlData?.signedUrl || "",
      },
    }),
    corsResponse,
  );
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
