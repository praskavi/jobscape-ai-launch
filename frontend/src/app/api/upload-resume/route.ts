import { NextResponse } from "next/server";
import { verifyApiUser } from "@/lib/auth/verifyApiUser";
import { handleCors } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // 1. CORS check
  const corsResponse = handleCors(request);
  if (corsResponse.response && !corsResponse.isAllowed) {
    return corsResponse.response;
  }

  // 2. Rate limit (20 requests/minute for upload endpoints)
  const rateLimitResponse = checkRateLimit(request, 20);
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

  // 5. File Validation - Done BEFORE parsing or processing
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

  // File is validated successfully
  const successResponse = NextResponse.json({
    success: true,
    message: "File validated successfully and is ready for upload."
  });

  if (corsResponse.response) {
    corsResponse.response.headers.forEach((val, key) => {
      successResponse.headers.set(key, val);
    });
  }
  return successResponse;
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request, new NextResponse(null, { status: 200 }));
  return corsResponse.response || new NextResponse(null, { status: 200 });
}
