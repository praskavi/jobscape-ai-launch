import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { analyzeResumeMatch } from "@/lib/ai/atsAnalyzer"; 
import { calculateSemanticAtsScore } from "@/lib/semanticAtsScoring";
import { recordFeatureUsage, requireFeatureAccess } from "@/lib/subscriptionEntitlements";
import { createClient } from "@supabase/supabase-js";

const jobDescriptionSchema = z.string().max(10000, "Job description must not exceed 10,000 characters");
const DEFAULT_STORAGE_BUCKET = "user-documents";
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const allowedExtensions = [".pdf", ".doc", ".docx"];
const maxFileSize = 5 * 1024 * 1024;

function getBearerToken(request: Request) {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
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

function validateResumeFileMetadata(filename: string, mimetype: string, filesize: number) {
  const normalizedFilename = filename.toLowerCase();
  return (
    allowedExtensions.some((ext) => normalizedFilename.endsWith(ext)) &&
    allowedMimeTypes.includes(mimetype) &&
    filesize <= maxFileSize
  );
}

export async function POST(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  const rateLimitResponse = checkRateLimit(request, 10);
  if (rateLimitResponse) {
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => rateLimitResponse.headers.set(key, val));
    }
    return rateLimitResponse;
  }

  const auth = await verifyApiUser(request);
  if (auth.response) {
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => auth.response!.headers.set(key, val));
    }
    return auth.response;
  }

  const entitlement = await requireFeatureAccess(request, auth.user!.id, "ats_score", auth.user!.email);
  if (entitlement.response) {
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => entitlement.response!.headers.set(key, val));
    }
    return entitlement.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json({ error: "Invalid form data format" }, { status: 400 });
  }

  const resumeFile = formData.get("resume") as File | null;
  const resumeFileId = formData.get("resumeFileId") as string | null;
  const jobDescription = formData.get("jobDescription") as string | null;
  
  // NEW: Read the flag to determine if AI should run
  const fetchAdvancedAI = formData.get("fetchAdvancedAI") === "true";

  if (!resumeFile && !resumeFileId) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  const jdResult = jobDescriptionSchema.safeParse(jobDescription || "");
  if (!jdResult.success) {
    return NextResponse.json({ error: "Validation Failed", details: jdResult.error.errors }, { status: 400 });
  }

  let extractedText: string;
  try {
    let buffer: Buffer;
    let mimetype: string;
    let filename: string;
    let filesize: number;

    if (resumeFileId) {
      const supabase = createRouteSupabaseClient(request);
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", auth.user!.id)
        .maybeSingle<{ id: string }>();

      if (profileError || !profile?.id) {
        return NextResponse.json({ error: "Could not load user profile." }, { status: 500 });
      }

      const { data: storedResume, error: resumeError } = await supabase
        .from("user_files")
        .select("id, file_name, file_path, bucket_name, mime_type, file_size_bytes")
        .eq("id", resumeFileId)
        .eq("user_profile_id", profile.id)
        .eq("file_type", "resume")
        .maybeSingle<{
          id: string;
          file_name: string;
          file_path: string;
          bucket_name: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
        }>();

      if (resumeError || !storedResume) {
        return NextResponse.json({ error: "Resume not found or access denied." }, { status: 404 });
      }

      filename = storedResume.file_name;
      mimetype = storedResume.mime_type || "application/octet-stream";
      filesize = storedResume.file_size_bytes ?? 0;

      if (!validateResumeFileMetadata(filename, mimetype, filesize)) {
        return NextResponse.json({ error: "Unsupported Media Type or File exceeds 5MB limit." }, { status: 415 });
      }

      const { data: storageFile, error: downloadError } = await supabase.storage
        .from(storedResume.bucket_name || DEFAULT_STORAGE_BUCKET)
        .download(storedResume.file_path);

      if (downloadError || !storageFile) {
        return NextResponse.json({ error: "Failed to load stored resume." }, { status: 500 });
      }

      buffer = Buffer.from(await storageFile.arrayBuffer());
    } else {
      filename = resumeFile!.name;
      mimetype = resumeFile!.type;
      filesize = resumeFile!.size;

      if (!validateResumeFileMetadata(filename, mimetype, filesize)) {
        return NextResponse.json({ error: "Unsupported Media Type or File exceeds 5MB limit." }, { status: 415 });
      }

      buffer = Buffer.from(await resumeFile!.arrayBuffer());
    }

    extractedText = await extractTextFromFile(buffer, mimetype, filename);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to extract text from document" }, { status: 400 });
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "Could not extract text from the document." }, { status: 400 });
  }

  try {
    const { score, matchedKeywords, missingKeywords } = await calculateSemanticAtsScore(extractedText, jdResult.data);
    
    let aiRecommendations = null;
    
    // NEW: Only hit your AI endpoint if the button was explicitly clicked
    if (fetchAdvancedAI) {
      aiRecommendations = await analyzeResumeMatch(extractedText, jdResult.data); 
    }

    const finalResponse = NextResponse.json({
      success: true,
      analysis: {
        score,
        status: score >= 75 ? 'Excellent Match' : 'Needs Improvement',
        matchedKeywords,
        missingKeywords,
        aiRecommendations 
      }
    });

    await recordFeatureUsage(request, auth.user!.id, "ats_score", auth.user!.email);

    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => finalResponse.headers.set(key, val));
    }
    return finalResponse;

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An error occurred during analysis." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
