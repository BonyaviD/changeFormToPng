import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig, sessionCookieName, verifySession } from "./core";

export async function requireSession() {
  const jar = await cookies();
  if (!verifySession(jar.get(sessionCookieName())?.value, getAuthConfig())) redirect("/login");
}
