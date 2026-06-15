import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Ensure you use the Service Role Key here
);

// --- UNIFIED HYBRID ENGINE: Keyword Matcher ---
function calculateAtsScore(resumeText: string, jdText: string) {
  const stopWords = new Set(['and', 'the', 'for', 'with', 'this', 'that', 'you', 'your', 'are', 'will', 'can', 'have', 'from', 'but', 'not', 'what', 'all', 'were', 'when', 'how', 'any', 'about', 'more', 'our', 'out', 'has', 'must', 'only', 'also', 'such', 'some', 'they', 'their', 'which', 'who', 'whom', 'whose', 'why', 'would', 'should', 'could', 'was', 'been', 'being', 'does', 'doing', 'did', 'done', 'experience', 'years', 'team', 'work', 'required', 'preferred', 'skills', 'strong', 'ability', 'working', 'environment', 'include', 'duties', 'role', 'responsibilities', 'knowledge', 'including', 'support', 'management', 'development', 'business', 'ensure', 'provide', 'using', 'design', 'new', 'within', 'looking', 'about', 'this', 'role']);

  const cleanText = (text: string) => (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  const getKeywords = (text: string) => {
    const words = cleanText(text).split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w) && isNaN(Number(w))) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  };

  // Extract Top 20 core technical/hard skills
  const jdKeywords = getKeywords(jdText).slice(0, 20);
  const resumeCleaned = ` ${cleanText(resumeText)} `;

  const matchedKeywords = jdKeywords.filter(kw => resumeCleaned.includes(` ${kw} `));
  const missingKeywords = jdKeywords.filter(kw => !resumeCleaned.includes(` ${kw} `));

  let score = 0;
  if (jdKeywords.length > 0) {
    // ATS Curve: Matching 15 out of 20 core keywords equals a 100% score.
    const targetCount = Math.min(jdKeywords.length, 15);
    score = Math.min(100, Math.round((matchedKeywords.length / targetCount) * 100));
  }

  return { score, matchedKeywords, missingKeywords };
}

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

    const formattedMatches = matchedJobs.map((job: any) => {
      // Use the universal ATS engine to score the job description against the resume
      const atsResult = calculateAtsScore(extractedText, job.description || "");

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
        matchPercentage: atsResult.score, // GUARANTEED to match the ATS checker
        tags: ["Skills matched", atsResult.score > 75 ? "ATS ready" : "AI summary"].filter(Boolean)
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage); // Sort by the final ATS score

    return NextResponse.json({ success: true, matches: formattedMatches.slice(0, 10) });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An error occurred during analysis." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}