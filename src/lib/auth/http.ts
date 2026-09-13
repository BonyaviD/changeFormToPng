import type { NextRequest } from "next/server";

export function privateResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export function isSameOrigin(request: NextRequest): boolean {
  return request.headers.get("origin") === request.nextUrl.origin &&
    request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function readLoginForm(request: Request): Promise<URLSearchParams | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  } catch { return null; }
}
