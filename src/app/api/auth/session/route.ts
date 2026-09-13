import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig, sessionCookieName, verifySession } from "@/lib/auth/core";
import { isSameOrigin, privateResponse } from "@/lib/auth/http";
import { renewSession } from "@/lib/auth/cookie";

export function GET(request: NextRequest) {
  const authenticated = verifySession(request.cookies.get(sessionCookieName())?.value, getAuthConfig());
  return privateResponse(NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401 }));
}

export function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return privateResponse(new NextResponse(null, { status: 403 }));
  const config = getAuthConfig();
  if (!verifySession(request.cookies.get(sessionCookieName())?.value, config)) {
    return privateResponse(new NextResponse(null, { status: 401 }));
  }
  return privateResponse(renewSession(new NextResponse(null, { status: 204 }), config!));
}
