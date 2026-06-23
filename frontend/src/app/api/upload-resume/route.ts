import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordFeatureUsage, requireFeatureAccess } from "@/lib/subscriptionEntitlements";
import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "user-documents";

function withCors(response: NextResponse, corsResponse: ReturnType<typeof handleCors>) {
  if (corsResponse.response) {
    corsResponse.response.headers.forEach((val, key) => {
      response.headers.set(key, val);
    });
  }

  return response;
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length);
}

function createRouteSupabaseClient(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const bearerToken = getBearerToken(request);

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    bearerToken && !serviceRoleKey
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
        }
      : undefined,
  );
}

export async function POST(request: Request) {
  // 1. CORS check
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) {
    return corsResponse.response;
  }

  // 2. Rate limit (20 requests/minute for upload endpoints)
  const rateLimitResponse = checkRateLimit(request, 20);
  if (rateLimitResponse) {
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        rateLimitResponse.headers.set(key, val);
      });
    }
    return rateLimitResponse;
  }

  // 3. JWT Authentication verification
  const auth = await verifyApiUser(request);
  if (auth.response) {
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        auth.response.headers.set(key, val);
      });
    }
    return auth.response;
  }

  const entitlement = await requireFeatureAccess(
    request,
    auth.user!.id,
    "resume_upload",
    auth.user!.email,
  );

  if (entitlement.response) {
    return withCors(entitlement.response, corsResponse);
  }

  // 4. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return withCors(
      NextResponse.json({ error: "Invalid form data format" }, { status: 400 }),
      corsResponse,
    );
  }

  const resumeFile = formData.get("resume") as File | null;

  // 5. File Validation - Done BEFORE parsing or processing
  if (!resumeFile) {
    return withCors(NextResponse.json({ error: "Missing resume file" }, { status: 400 }), corsResponse);
  }

  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const maxFileSize = 5 * 1024 * 1024; // 5 MB

  const mimetype = resumeFile.type;
  const filename = resumeFile.name.toLowerCase();
  const filesize = resumeFile.size;

  const hasValidExt = allowedExtensions.some(ext => filename.endsWith(ext));
  const hasValidMime = allowedMimeTypes.includes(mimetype);

  if (!hasValidExt || !hasValidMime || filesize > maxFileSize) {
    let errorMsg = "";
    if (!hasValidExt || !hasValidMime) {
      errorMsg = "Unsupported file type. Only .pdf, .doc, and .docx files are allowed.";
    } else {
      errorMsg = "File size exceeds the maximum limit of 5 MB.";
    }

    const response = NextResponse.json(
      {
        error: "Unsupported Media Type",
        message: errorMsg,
        details: {
          filename: resumeFile.name,
          mimetype,
          size: filesize
        }
      },
      { status: 415 }
    );
    return withCors(response, corsResponse);
  }

  const supabase = createRouteSupabaseClient(request);
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", auth.user!.id)
    .maybeSingle<{ id: string }>();

  if (profileError || !profile?.id) {
    return withCors(
      NextResponse.json({ error: "Could not load user profile for upload." }, { status: 500 }),
      corsResponse,
    );
  }

  const fileExt = filename.split(".").pop() || "pdf";
  const fileName = `resume_${Date.now()}.${fileExt}`;
  const filePath = `${auth.user!.id}/${fileName}`;
  const existingResume = await supabase
    .from("user_files")
    .select("file_path")
    .eq("user_profile_id", profile.id)
    .eq("file_type", "resume")
    .maybeSingle<{ file_path: string }>();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, resumeFile, {
      cacheControl: "3600",
      contentType: mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error("Resume storage upload failed", uploadError);
    return withCors(
      NextResponse.json({ error: "Failed to upload resume." }, { status: 500 }),
      corsResponse,
    );
  }

  const { data: fileRow, error: dbError } = await supabase
    .from("user_files")
    .upsert(
      {
        user_profile_id: profile.id,
        file_type: "resume",
        file_name: resumeFile.name,
        file_path: filePath,
        bucket_name: STORAGE_BUCKET,
        mime_type: mimetype,
        file_size_bytes: filesize,
      },
      {
        onConflict: "user_profile_id,file_type",
      },
    )
    .select("id, file_type, file_name, file_path, mime_type, file_size_bytes, created_at")
    .single();

  if (dbError || !fileRow) {
    console.error("Resume metadata upsert failed", dbError);
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    return withCors(
      NextResponse.json({ error: "Failed to save resume metadata." }, { status: 500 }),
      corsResponse,
    );
  }

  if (existingResume.data?.file_path && existingResume.data.file_path !== filePath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([existingResume.data.file_path]);
  }

  const { data: signedUrlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 3600);

  await recordFeatureUsage(request, auth.user!.id, "resume_upload", auth.user!.email);

  return withCors(
    NextResponse.json({
      success: true,
      message: "Resume uploaded successfully.",
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
