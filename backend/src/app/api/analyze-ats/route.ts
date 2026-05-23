import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { analyzeResumeMatch } from "@/lib/ai/atsAnalyzer";

// Require Node environment for file parsing
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!resumeFile || !jobDescription) {
      return NextResponse.json(
        { error: "Missing resume or job description" },
        { status: 400 }
      );
    }

    // 1. Extract text using our reusable utility
    const extractedText = await extractTextFromFile(resumeFile);

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the document." },
        { status: 400 }
      );
    }

    // 2. Pass the raw text to our AI utility
    const analysisResult = await analyzeResumeMatch(extractedText, jobDescription);

    // 3. Return the payload
    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during analysis." },
      { status: 500 }
    );
  }
}