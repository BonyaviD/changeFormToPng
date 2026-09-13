import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/core";
import { isSameOrigin, privateResponse } from "@/lib/auth/http";

export function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return privateResponse(new NextResponse(null, { status: 403 }));
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(sessionCookieName(), "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0,
  });
  return privateResponse(response);
}
