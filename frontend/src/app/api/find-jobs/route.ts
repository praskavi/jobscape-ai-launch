import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import {
  calculateSemanticAtsScore,
  calculateSemanticAtsScoreFromProfile,
  createSemanticResumeProfile,
  type SemanticResumeProfile,
} from "@/lib/semanticAtsScoring";
import { recordFeatureUsage, requireFeatureAccess } from "@/lib/subscriptionEntitlements";
import { createClient } from '@supabase/supabase-js';
import { createHash } from "node:crypto";

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
      : undefined
  );
}

function buildMatchSummary(score: number) {
  if (score >= 80) return "Strong resume fit based on ATS keyword and semantic matching.";
  if (score >= 60) return "Good resume fit with a few areas to tailor before applying.";
  if (score >= 40) return "Partial resume fit; review missing requirements before applying.";
  return "Low resume fit; significant tailoring may be needed for this role.";
}

async function getUserProfileId(supabaseClient: ReturnType<typeof createRouteSupabaseClient>, authUserId: string) {
  const { data } = await supabaseClient
    .from("user_profiles")
    .select("id")
    .eq("user_id", authUserId)
    .maybeSingle<{ id: string }>();

  return data?.id || null;
}

export async function GET(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  const auth = await verifyApiUser(request);
  if (auth.response) return auth.response;

  const supabase = createRouteSupabaseClient(request);
  const { data, error } = await supabase
    .from("ai_job_match_runs")
    .select("id, job_title, location, result_count, matches, scoring_version, created_at")
    .eq("user_id", auth.user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load cached AI job matches." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    cached: Boolean(data),
    latest: data || null,
  });
}

export async function POST(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  const rateLimitResponse = checkRateLimit(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await verifyApiUser(request);
  if (auth.response) return auth.response;

  const entitlement = await requireFeatureAccess(request, auth.user!.id, "ai_job_match", auth.user!.email);
  if (entitlement.response) return entitlement.response;
  const resultLimit = entitlement.entitlement?.plan_code === "premium" ? 20 : 10;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json({ error: "Invalid form data format" }, { status: 400 });
  }

  const resumeFile = formData.get("resume") as File | null;
  const rawJobTitle = formData.get("jobTitle");
  const jobTitle = (rawJobTitle && rawJobTitle !== "null" && rawJobTitle !== "") ? rawJobTitle.toString() : null;

  const rawLocation = formData.get("location");
  const location = (rawLocation && rawLocation !== "null" && rawLocation !== "") ? rawLocation.toString() : null;

  if (!resumeFile) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  const maxFileSize = 5 * 1024 * 1024; 
  if (resumeFile.size > maxFileSize) {
    return NextResponse.json({ error: "File exceeds 5MB limit." }, { status: 415 });
  }

  try {
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractTextFromFile(buffer, resumeFile.type, resumeFile.name);
    
    if (!extractedText.trim()) throw new Error("Could not extract text from document.");

    let resumeChunks = extractedText.split(/\n\s*\n/).map(chunk => chunk.trim()).filter(chunk => chunk.length > 50);
    if (resumeChunks.length <= 1) resumeChunks = extractedText.match(/.{1,800}(\s|$)/g) || [extractedText];
    resumeChunks = resumeChunks.slice(0, 10);

    const hfResponse = await fetch("https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: resumeChunks }),
    });

    if (!hfResponse.ok) throw new Error("Failed to generate vector embedding from Hugging Face.");

    const vectorEmbedding = await hfResponse.json();
    if (!Array.isArray(vectorEmbedding) || !Array.isArray(vectorEmbedding[0])) throw new Error("Unexpected vector format received from AI model.");
    const supabaseAdmin = createRouteSupabaseClient(request);

    // parallel chunk searching
    const searchPromises = vectorEmbedding.map((chunkVector: number[]) => 
      supabaseAdmin.rpc('match_jobs', {
        query_embedding: chunkVector, 
        match_threshold: 0.45, 
        match_count: 100,       
        filter_title: jobTitle || null,
        filter_location: location || null
      })
    );

    const results = await Promise.all(searchPromises);
    const jobMap = new Map();
    
    results.forEach(({ data, error }) => {
      if (error || !data) return;
      data.forEach((job: any) => {
        const existing = jobMap.get(job.id);
        if (!existing || job.similarity > existing.similarity) {
          jobMap.set(job.id, job);
        }
      });
    });

    const matchedJobs = Array.from(jobMap.values());
    let semanticResumeProfile: SemanticResumeProfile | null = null;
    try {
      semanticResumeProfile = await createSemanticResumeProfile(extractedText);
    } catch (error) {
      console.error("Resume semantic profile creation failed; using per-job fallback scoring.", error);
    }

    const shortlist = matchedJobs
      .sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, Math.max(resultLimit + 2, 12));

    const formattedMatches = await Promise.all(shortlist.map(async (job: any) => {
      const atsResult = semanticResumeProfile
        ? await calculateSemanticAtsScoreFromProfile(semanticResumeProfile, job.description || "")
        : await calculateSemanticAtsScore(extractedText, job.description || "");

      return {
        id: job.id,
        source: job.source,
        title: job.title,
        company: job.company,
        location: job.location,
        city: job.city,
        state: job.state,
        salary: job.salary,
        description: job.description,
        country: job.country,
        classification: job.classification,
        sub_classification: job.sub_classification,
        work_arrangement: job.work_arrangement,
        type: job.employment_type, 
        apply_url: job.apply_url,
        matchPercentage: atsResult.score,
        matchedKeywords: atsResult.matchedKeywords,
        missingKeywords: atsResult.missingKeywords,
        aiSummary: buildMatchSummary(atsResult.score),
        tags: ["Skills matched", atsResult.score > 75 ? "ATS ready" : "AI summary"].filter(Boolean)
      };
    }));

    formattedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const slicedMatches = formattedMatches.slice(0, resultLimit);
    const userProfileId = await getUserProfileId(supabaseAdmin, auth.user!.id);
    const resumeHash = createHash("sha256").update(extractedText).digest("hex");

    const { error: cacheError } = await supabaseAdmin.from("ai_job_match_runs").insert({
      user_id: auth.user!.id,
      user_profile_id: userProfileId,
      resume_hash: resumeHash,
      job_title: jobTitle,
      location,
      result_count: slicedMatches.length,
      matches: slicedMatches,
      scoring_version: "semantic-ats-v2",
    });

    if (cacheError) {
      console.error("Failed to cache AI job match results.", cacheError);
    }

    await recordFeatureUsage(request, auth.user!.id, "ai_job_match", auth.user!.email);

    return NextResponse.json({ success: true, matches: slicedMatches });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An error occurred during analysis." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
