import type { NextRequest } from "next/server";

import { empty, failure, json, notConfigured, openArchive, readJson, refuse } from "@/lib/archive-server/http";
import { InvalidArchiveInput } from "@/lib/archive-server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A certificate names at most a few signatories, each image capped at 2MB. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_IDS = 20;

export async function GET(request: NextRequest) {
  const refused = refuse(request);
  if (refused) return refused;
  const archive = openArchive();
  if (!archive) return notConfigured();
  try {
    const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    if (ids.length > MAX_IDS) throw new InvalidArchiveInput("too many ids");
    return json({ assets: await archive.loadAssets(ids) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  const refused = refuse(request);
  if (refused) return refused;
  const archive = openArchive();
  if (!archive) return notConfigured();
  try {
    const body = await readJson(request, MAX_BODY_BYTES);
    const assets = (body as { assets?: unknown })?.assets;
    if (typeof assets !== "object" || assets === null || Array.isArray(assets)) {
      throw new InvalidArchiveInput("expected { assets: { id: image } }");
    }
    const entries = Object.entries(assets);
    if (entries.length > MAX_IDS || entries.some(([, image]) => typeof image !== "string")) {
      throw new InvalidArchiveInput("invalid assets");
    }
    await archive.saveAssets(Object.fromEntries(entries) as Record<string, string>);
    return empty(204);
  } catch (error) {
    return failure(error);
  }
}
