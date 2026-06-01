import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { analyzeResumeMatch } from "@/lib/ai/atsAnalyzer";

const jobDescriptionSchema = z.string().max(10000, "Job description must not exceed 10,000 characters");

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

  // 5. File Validation (Task 5) - Done BEFORE parsing or processing
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
        details: {
          filename: resumeFile.name,
          mimetype,
          size: filesize
        }
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

  // 6. Zod Validation (Task 6)
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

  // 8. Analyze match with Gemini API
  try {
    const analysisResult = await analyzeResumeMatch(extractedText, jdResult.data);
    const finalResponse = NextResponse.json({
      success: true,
      analysis: analysisResult
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
