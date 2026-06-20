import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://jobscapeai.com",
  "https://jobscrape-ai-j8fxn.ondigitalocean.app",
  "http://localhost:3000",
];
const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1"]);

function isAllowedOrigin(origin: string) {
  try {
    const url = new URL(origin);

    // Next can move to 3001/3002 when 3000 is busy, so allow localhost
    // development origins without weakening production CORS.
    if (LOCAL_DEVELOPMENT_HOSTS.has(url.hostname)) {
      return true;
    }

    return ALLOWED_ORIGINS.includes(origin);
  } catch {
    return false;
  }
}

export function handleCors(req: Request, res?: NextResponse) {
  const origin = req.headers.get("origin");

  // Allow same-origin or non-browser requests where Origin header is absent
  if (!origin) {
    return { response: res || null, isAllowed: true };
  }

  if (!isAllowedOrigin(origin)) {
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
