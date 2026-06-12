import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { analyzeResumeMatch } from "@/lib/ai/atsAnalyzer"; // You may want to update this prompt internally later

const jobDescriptionSchema = z.string().max(10000, "Job description must not exceed 10,000 characters");

// --- NEW: Deterministic Code-Based Scoring Engine ---
function calculateAtsScore(resumeText: string, jdText: string) {
  // 1. Basic stop words to ignore
  const stopWords = new Set(['and', 'the', 'for', 'with', 'this', 'that', 'you', 'your', 'are', 'will', 'can', 'have', 'from', 'but', 'not', 'what', 'all', 'were', 'when', 'how', 'any', 'about', 'more', 'our', 'out', 'has', 'must', 'only', 'also', 'such', 'some', 'they', 'their', 'which', 'who', 'whom', 'whose', 'why', 'would', 'should', 'could', 'was', 'been', 'being', 'does', 'doing', 'did', 'done']);

  // 2. Helper to clean text (lowercase, remove special chars)
  const cleanText = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // 3. Helper to extract and rank keywords
  const getKeywords = (text: string) => {
    const words = cleanText(text).split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w) && isNaN(Number(w))) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }
    
    // Sort by highest frequency
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  };

  // 4. Extract top 30 keywords from JD as "Required"
  const jdKeywords = getKeywords(jdText).slice(0, 30);
  const resumeWords = new Set(getKeywords(resumeText));

  // 5. Compare
  const matchedKeywords = jdKeywords.filter(kw => resumeWords.has(kw));
  const missingKeywords = jdKeywords.filter(kw => !resumeWords.has(kw));

  let score = 0;
  if (jdKeywords.length > 0) {
    score = Math.round((matchedKeywords.length / jdKeywords.length) * 100);
  }

  return { score, matchedKeywords, missingKeywords };
}
// ---------------------------------------------------

export async function POST(request: Request) {
  // 1. CORS check
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) {
    return corsResponse.response;
  }

  // 2. Rate limit (10 requests/minute for ATS analysis endpoint)
  const rateLimitResponse = checkRateLimit(request, 10);
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

  // 4. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    const errorRes = NextResponse.json({ error: "Invalid form data format" }, { status: 400 });
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        errorRes.headers.set(key, val);
      });
    }
    return errorRes;
  }

  const resumeFile = formData.get("resume") as File | null;
  const jobDescription = formData.get("jobDescription") as string | null;

  // 5. File Validation
  if (!resumeFile) {
    const errorRes = NextResponse.json({ error: "Missing resume file" }, { status: 400 });
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        errorRes.headers.set(key, val);
      });
    }
    return errorRes;
  }

  const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  const allowedExtensions = [".pdf", ".docx"];
  const maxFileSize = 5 * 1024 * 1024; // 5 MB

  const mimetype = resumeFile.type;
  const filename = resumeFile.name.toLowerCase();
  const filesize = resumeFile.size;

  const hasValidExt = allowedExtensions.some(ext => filename.endsWith(ext));
  const hasValidMime = allowedMimeTypes.includes(mimetype);

  if (!hasValidExt || !hasValidMime || filesize > maxFileSize) {
    let errorMsg = "";
    if (!hasValidExt || !hasValidMime) {
      errorMsg = "Unsupported file type. Only .pdf and .docx files are allowed.";
    } else {
      errorMsg = "File size exceeds the maximum limit of 5 MB.";
    }

    const response = NextResponse.json(
      {
        error: "Unsupported Media Type",
        message: errorMsg,
        details: { filename: resumeFile.name, mimetype, size: filesize }
      },
      { status: 415 }
    );

    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        response.headers.set(key, val);
      });
    }
    return response;
  }

  // 6. Zod Validation
  const jdResult = jobDescriptionSchema.safeParse(jobDescription || "");
  if (!jdResult.success) {
    const response = NextResponse.json(
      {
        error: "Validation Failed",
        details: jdResult.error.errors.map(err => ({
          path: "jobDescription",
          message: err.message
        }))
      },
      { status: 400 }
    );

    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        response.headers.set(key, val);
      });
    }
    return response;
  }

  // 7. Parse file buffer and extract text
  let extractedText: string;
  try {
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    extractedText = await extractTextFromFile(buffer, mimetype, filename);
  } catch (err: any) {
    const response = NextResponse.json({ error: err.message || "Failed to extract text from document" }, { status: 400 });
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        response.headers.set(key, val);
      });
    }
    return response;
  }

  if (!extractedText.trim()) {
    const response = NextResponse.json({ error: "Could not extract text from the document." }, { status: 400 });
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        response.headers.set(key, val);
      });
    }
    return response;
  }

  // 8. Analyze Match (Code-First, AI-Second Logic)
  try {
    // Step A: Run native code scoring
    const { score, matchedKeywords, missingKeywords } = calculateAtsScore(extractedText, jdResult.data);
    
    let aiRecommendations = null;

    // Step B: Only trigger AI if the score is below 85%
    if (score < 85) {
      // Pass the extracted text and JD to your AI. 
      // TIP: You might want to update analyzeResumeMatch to accept 'missingKeywords' to give the AI better context!
      aiRecommendations = await analyzeResumeMatch(extractedText, jdResult.data); 
    }

    // Step C: Return final payload
    const finalResponse = NextResponse.json({
      success: true,
      analysis: {
        score,
        status: score >= 85 ? 'Excellent Match' : 'Needs Improvement',
        matchedKeywords,
        missingKeywords,
        aiRecommendations: aiRecommendations || "Your resume is highly optimized for this role! No AI rewriting needed."
      }
    });

    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        finalResponse.headers.set(key, val);
      });
    }
    return finalResponse;

  } catch (err: any) {
    const response = NextResponse.json({ error: err.message || "An error occurred during analysis." }, { status: 500 });
    if (corsResponse.response) {
      corsResponse.response.headers.forEach((val, key) => {
        response.headers.set(key, val);
      });
    }
    return response;
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}