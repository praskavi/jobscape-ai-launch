import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory cache to store request counts by IP + route
const ipCache = new Map<string, RateLimitRecord>();

export function checkRateLimit(req: Request, limit: number, windowMs: number = 60000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
             req.headers.get("x-real-ip") || 
             "127.0.0.1";
             
  const now = Date.now();
  const route = new URL(req.url).pathname;
  const cacheKey = `${ip}:${route}`;

  // Lazy cleanup of cache entries to prevent memory growth
  if (ipCache.size > 2000) {
    for (const [key, value] of ipCache.entries()) {
      if (now > value.resetTime) {
        ipCache.delete(key);
      }
    }
  }

  const record = ipCache.get(cacheKey);

  if (!record || now > record.resetTime) {
    ipCache.set(cacheKey, {
      count: 1,
      resetTime: now + windowMs
    });
    return null;
  }

  if (record.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    const response = NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  record.count += 1;
  return null;
}
