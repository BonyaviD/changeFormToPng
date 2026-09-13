import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, safeReturnPath, sessionCookieName, verifySession } from "@/lib/auth/core";
import { privateResponse } from "@/lib/auth/http";
import { renewSession } from "@/lib/auth/cookie";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Login is standalone HTML without a JS bundle or external assets. There is
  // deliberately no blanket /_next, file-extension, or /api exemption.
  if (path === "/login" || path === "/api/auth/login") return privateResponse(NextResponse.next());
  const authConfig = getAuthConfig();
  if (verifySession(request.cookies.get(sessionCookieName())?.value, authConfig)) {
    const response = privateResponse(NextResponse.next());
    const isPageVisit = request.method === "GET" &&
      ["/", "/bulk", "/history", "/settings", "/verify"].includes(path) &&
      !request.headers.has("next-router-prefetch") && request.headers.get("purpose") !== "prefetch";
    return isPageVisit ? renewSession(response, authConfig!) : response;
  }
  if ((request.method === "GET" || request.method === "HEAD") &&
      request.headers.get("accept")?.includes("text/html")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", safeReturnPath(path + request.nextUrl.search));
    return privateResponse(NextResponse.redirect(login));
  }
  return privateResponse(NextResponse.json({ error: "authentication_required" }, { status: 401 }));
}

export const config = { matcher: ["/:path*"] };
