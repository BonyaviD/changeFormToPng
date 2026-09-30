import { NextResponse, type NextRequest } from "next/server";

import { getAuthConfig, sessionCookieName, verifySession } from "@/lib/auth/core";
import { isSameOrigin, privateResponse } from "@/lib/auth/http";
import { ArchiveFullError } from "@/lib/storage/types";

import { getRedisConfig, RedisError, RedisRest } from "./redis";
import { createServerArchive, type ServerArchive } from "./store";
import { InvalidArchiveInput } from "./validation";

export function json(body: unknown, status = 200) {
  return privateResponse(NextResponse.json(body, { status }));
}

export function empty(status: number) {
  return privateResponse(new NextResponse(null, { status }));
}

/**
 * The proxy already turns away requests without a session; this checks again
 * so a matcher change can never expose the archive, and refuses cross-site
 * writes the way the auth routes do.
 */
export function refuse(request: NextRequest): NextResponse | null {
  if (!verifySession(request.cookies.get(sessionCookieName())?.value, getAuthConfig())) {
    return json({ error: "authentication_required" }, 401);
  }
  if (request.method !== "GET" && !isSameOrigin(request)) return empty(403);
  return null;
}

/** `null` when no server store is configured, and the browser keeps the archive. */
export function openArchive(): ServerArchive | null {
  const config = getRedisConfig();
  return config ? createServerArchive(new RedisRest(config)) : null;
}

export function notConfigured() {
  return json({ error: "archive_not_configured" }, 404);
}

/** Reads a JSON body without ever holding more than `limit` bytes of it. */
export async function readJson(request: NextRequest, limit: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    throw new InvalidArchiveInput("expected application/json");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidArchiveInput("empty body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new InvalidArchiveInput("body too large");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InvalidArchiveInput("malformed JSON");
  }
}

export function failure(error: unknown) {
  if (error instanceof ArchiveFullError) {
    const { capacity, needed, available } = error;
    return json({ error: "archive_full", capacity, needed, available }, 409);
  }
  if (error instanceof InvalidArchiveInput) return json({ error: "invalid", message: error.message }, 400);
  if (error instanceof RedisError) {
    console.error("Archive store error:", error);
    return json({ error: "archive_unavailable" }, 502);
  }
  throw error;
}
