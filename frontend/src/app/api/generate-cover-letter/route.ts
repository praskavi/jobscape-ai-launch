import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractTextFromFile } from "@/lib/parsers/extractText";
import { generateCoverLetter } from "@/lib/ai/documentGenerator";
import { recordFeatureUsage, requireFeatureAccess } from "@/lib/subscriptionEntitlements";

const inputSchema = z.object({
  jobDescription: z.string().min(20).max(10000),
  companyName: z.string().max(200).optional(),
  roleTitle: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) return corsResponse.response;

  const rateLimitResponse = checkRateLimit(request, 5);
  if (rateLimitResponse) return rateLimitResponse;

  const auth = await verifyApiUser(request);
  if (auth.response) return auth.response;

  const entitlement = await requireFeatureAccess(request, auth.user!.id, "cover_letter_generate");
  if (entitlement.response) return entitlement.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data format" }, { status: 400 });
  }

  const resumeFile = formData.get("resume") as File | null;
  const input = {
    jobDescription: formData.get("jobDescription")?.toString() || "",
    companyName: formData.get("companyName")?.toString() || undefined,
    roleTitle: formData.get("roleTitle")?.toString() || undefined,
  };

  if (!resumeFile) {
    return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
  }

  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) {
    return NextResponse.json({ error: "Validation Failed", details: parsedInput.error.errors }, { status: 400 });
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

    const coverLetter = await generateCoverLetter(
      resumeText,
      parsedInput.data.jobDescription,
      parsedInput.data.companyName,
      parsedInput.data.roleTitle,
    );
    await recordFeatureUsage(request, auth.user!.id, "cover_letter_generate");

    return NextResponse.json({ success: true, coverLetter });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate cover letter." }, { status: 500 });
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
