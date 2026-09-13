import { NextResponse } from "next/server";
import { AuthConfig, createSession, SESSION_SECONDS, sessionCookieName } from "./core";

export function renewSession(response: NextResponse, config: AuthConfig): NextResponse {
  response.cookies.set(sessionCookieName(), createSession(config), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
    path: "/", maxAge: SESSION_SECONDS,
  });
  return response;
}
