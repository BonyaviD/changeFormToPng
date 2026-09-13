import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, safeReturnPath, sessionCookieName, verifySession } from "@/lib/auth/core";
import { privateResponse } from "@/lib/auth/http";
import { loginPage } from "@/lib/auth/login-page";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const config = getAuthConfig();
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  if (verifySession(request.cookies.get(sessionCookieName())?.value, config)) {
    return privateResponse(NextResponse.redirect(new URL(next, request.url), 303));
  }
  const response = new NextResponse(loginPage(next, request.nextUrl.searchParams.get("error") ?? "", Boolean(config)), {
    status: config ? 200 : 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
  return privateResponse(response);
}
