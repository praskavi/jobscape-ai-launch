import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { createClient } from '@supabase/supabase-js'; // Server-side supabase client

// Initialize Supabase admin/service role client for DB queries
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  // 1. CORS check
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  // 2. Rate limit
  const rateLimitResponse = checkRateLimit(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  // 3. JWT Auth
  const auth = await verifyApiUser(request);
  if (auth.response) return auth.response;

  // 4. Parse Form Data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json({ error: "Invalid form data format" }, { status: 400 });
  }

  const resumeFile = formData.get("resume") as File | null;
  const jobTitle = formData.get("jobTitle") as string | null;
  const location = formData.get("location") as string | null;

  if (!resumeFile) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  // 5. File Validation
  const maxFileSize = 5 * 1024 * 1024; // 5 MB
  if (resumeFile.size > maxFileSize) {
    return NextResponse.json({ error: "File exceeds 5MB limit." }, { status: 415 });
  }

  try {
    // 6. Extract Text
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractTextFromFile(buffer, resumeFile.type, resumeFile.name);

    if (!extractedText.trim()) {
      throw new Error("Could not extract text from document.");
    }

    // 7. Get Vector Embeddings from Hugging Face
    // Note: We truncate the text to ~4000 characters to respect typical HF token limits.
    const hfResponse = await fetch("https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: extractedText.substring(0, 4000), 
      }),
    });

    if (!hfResponse.ok) {
      throw new Error("Failed to generate vector embedding from Hugging Face.");
    }

    const vectorEmbedding = await hfResponse.json();

    // 8. Vector Search in Supabase (pgvector)
    // We call a custom Postgres function 'match_jobs'
    const { data: matchedJobs, error: dbError } = await supabaseAdmin.rpc('match_jobs', {
      query_embedding: vectorEmbedding, // The 384/356 dimensional array
      match_threshold: 0.50, // Minimum similarity score (e.g., 50%)
      match_count: 5,        // Top 5 jobs
      filter_title: jobTitle || null,
      filter_location: location || null
    });

    if (dbError) throw dbError;

    // 9. Format response for the frontend
    const formattedMatches = (matchedJobs || []).map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      type: job.employment_type, // e.g., "Full-time"
      // Convert cosine similarity (e.g., 0.92) to percentage (92)
      matchPercentage: Math.round(job.similarity * 100), 
      tags: ["Skills matched", job.similarity > 0.85 ? "ATS ready" : "AI summary"].filter(Boolean)
    }));

    return NextResponse.json({ success: true, matches: formattedMatches });

  } catch (err: any) {
    console.error("Match Error:", err);
    return NextResponse.json({ error: err.message || "An error occurred during analysis." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}