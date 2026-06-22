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
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Ensure you use the Service Role Key here
);

export async function POST(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  const rateLimitResponse = checkRateLimit(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await verifyApiUser(request);
  if (auth.response) return auth.response;

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
      .slice(0, 12);

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
        tags: ["Skills matched", atsResult.score > 75 ? "ATS ready" : "AI summary"].filter(Boolean)
      };
    }));

    formattedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return NextResponse.json({ success: true, matches: formattedMatches.slice(0, 10) });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An error occurred during analysis." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
