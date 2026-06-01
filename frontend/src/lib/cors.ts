import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = ["https://jobscapeai.com", "http://localhost:3000"];

export function handleCors(req: Request, res?: NextResponse) {
  const origin = req.headers.get("origin");

  // Allow same-origin or non-browser requests where Origin header is absent
  if (!origin) {
    return { response: res || null, isAllowed: true };
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return {
      response: NextResponse.json(
        { error: "CORS policy violation: Origin not allowed" },
        { status: 403 }
      ),
      isAllowed: false,
    };
  }

  const response = res || new NextResponse();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");

  return { response, isAllowed: true };
}
