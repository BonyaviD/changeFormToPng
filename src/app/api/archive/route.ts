import type { NextRequest } from "next/server";

import { json, refuse } from "@/lib/archive-server/http";
import { getRedisConfig } from "@/lib/archive-server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the browser where the archive lives. Answers from configuration alone. */
export function GET(request: NextRequest) {
  return refuse(request) ?? json({ enabled: getRedisConfig() !== null });
}
