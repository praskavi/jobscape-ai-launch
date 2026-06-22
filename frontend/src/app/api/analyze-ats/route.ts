import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { analyzeResumeMatch } from "@/lib/ai/atsAnalyzer"; 
import { calculateSemanticAtsScore } from "@/lib/semanticAtsScoring";
import { recordFeatureUsage, requireFeatureAccess } from "@/lib/subscriptionEntitlements";

const jobDescriptionSchema = z.string().max(10000, "Job description must not exceed 10,000 characters");

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

  const entitlement = await requireFeatureAccess(request, auth.user!.id, "ats_score");
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
  const jobDescription = formData.get("jobDescription") as string | null;
  
  // NEW: Read the flag to determine if AI should run
  const fetchAdvancedAI = formData.get("fetchAdvancedAI") === "true";

  if (!resumeFile) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  const allowedMimeTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const allowedExtensions = [".pdf", ".docx"];
  const maxFileSize = 5 * 1024 * 1024;

  const mimetype = resumeFile.type;
  const filename = resumeFile.name.toLowerCase();
  const filesize = resumeFile.size;

  if (!allowedExtensions.some(ext => filename.endsWith(ext)) || !allowedMimeTypes.includes(mimetype) || filesize > maxFileSize) {
    return NextResponse.json({ error: "Unsupported Media Type or File exceeds 5MB limit." }, { status: 415 });
  }

  const jdResult = jobDescriptionSchema.safeParse(jobDescription || "");
  if (!jdResult.success) {
    return NextResponse.json({ error: "Validation Failed", details: jdResult.error.errors }, { status: 400 });
  }

  let extractedText: string;
  try {
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
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

    await recordFeatureUsage(request, auth.user!.id, "ats_score");

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
