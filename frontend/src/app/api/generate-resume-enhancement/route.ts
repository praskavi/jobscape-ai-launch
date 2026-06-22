import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { generateResumeEnhancement } from "@/lib/ai/documentGenerator";
import { recordFeatureUsage, requireFeatureAccess } from "@/lib/subscriptionEntitlements";

const optionalJobDescriptionSchema = z.string().max(10000).optional();

export async function POST(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  const rateLimitResponse = checkRateLimit(request, 5);
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await verifyApiUser(request);
  if (auth.response) return auth.response;

  const entitlement = await requireFeatureAccess(request, auth.user!.id, "resume_generate");
  if (entitlement.response) return entitlement.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data format" }, { status: 400 });
  }

  const resumeFile = formData.get("resume") as File | null;
  const jobDescription = formData.get("jobDescription")?.toString();

  if (!resumeFile) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  const jdResult = optionalJobDescriptionSchema.safeParse(jobDescription || undefined);
  if (!jdResult.success) {
    return NextResponse.json({ error: "Validation Failed", details: jdResult.error.errors }, { status: 400 });
  }

  if (resumeFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 5MB limit." }, { status: 415 });
  }

  try {
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const resumeText = await extractTextFromFile(buffer, resumeFile.type, resumeFile.name);

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "Could not extract text from the document." }, { status: 400 });
    }

    const enhancement = await generateResumeEnhancement(resumeText, jdResult.data);
    await recordFeatureUsage(request, auth.user!.id, "resume_generate");

    return NextResponse.json({ success: true, enhancement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate resume enhancement." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
