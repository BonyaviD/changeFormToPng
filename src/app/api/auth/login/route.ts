import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, safeReturnPath, verifyCredentials } from "@/lib/auth/core";
import { renewSession } from "@/lib/auth/cookie";
import { isSameOrigin, privateResponse, readLoginForm } from "@/lib/auth/http";
import { clearLoginAttempts, takeLoginAttempt } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return privateResponse(new NextResponse(null, { status: 403 }));
  const config = getAuthConfig();
  if (!config) return privateResponse(new NextResponse("ورود روی سرور تنظیم نشده است.", { status: 503 }));

  // Only trust the platform's client-IP header on Vercel. Locally all requests
  // share one bucket; caller-supplied X-Forwarded-For does not bypass it.
  const key = process.env.VERCEL === "1"
    ? (request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown")
    : "local";
  // The body is capped at 4KB, so reading it before the limiter costs nothing,
  // and it keeps the return path for the page that explains the refusal.
  const form = await readLoginForm(request);
  if (!form) return privateResponse(new NextResponse(null, { status: 400 }));
  const next = safeReturnPath(form.get("next"));
  const backToLogin = (error: "invalid" | "limited") => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", error);
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  };
  if (!takeLoginAttempt(key)) {
    // Back to the form, which explains the wait, rather than a bare text page.
    const response = backToLogin("limited");
    response.headers.set("Retry-After", "900");
    return privateResponse(response);
  }
  if (!(await verifyCredentials(form.get("username") ?? "", form.get("password") ?? "", config))) {
    return privateResponse(backToLogin("invalid"));
  }
  clearLoginAttempts(key);
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  return privateResponse(renewSession(response, config));
}
