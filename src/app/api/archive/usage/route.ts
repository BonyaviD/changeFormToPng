import type { NextRequest } from "next/server";

import { failure, json, notConfigured, openArchive, refuse } from "@/lib/archive-server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const refused = refuse(request);
  if (refused) return refused;
  const archive = openArchive();
  if (!archive) return notConfigured();
  try {
    return json(await archive.usage());
  } catch (error) {
    return failure(error);
  }
}
