import type { NextRequest } from "next/server";

import { empty, failure, json, notConfigured, openArchive, readJson, refuse } from "@/lib/archive-server/http";
import { InvalidArchiveInput, parseRecords } from "@/lib/archive-server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 500 records at the 32KB ceiling each would be 16MB; real ones are ~1KB. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** `?serial=` looks one certificate up; otherwise one page from `?cursor=`. */
export async function GET(request: NextRequest) {
  const refused = refuse(request);
  if (refused) return refused;
  const archive = openArchive();
  if (!archive) return notConfigured();
  try {
    const { searchParams } = request.nextUrl;
    const serial = searchParams.get("serial");
    if (serial !== null) return json({ record: await archive.findBySerial(serial.slice(0, 64)) });
    const cursor = searchParams.get("cursor") ?? "0";
    if (!/^\d{1,20}$/.test(cursor)) throw new InvalidArchiveInput("invalid cursor");
    return json(await archive.page(cursor));
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
    await archive.saveMany(parseRecords((body as { records?: unknown })?.records));
    return empty(204);
  } catch (error) {
    return failure(error);
  }
}

/** `?id=` removes one certificate; `?all=1` empties the archive. */
export async function DELETE(request: NextRequest) {
  const refused = refuse(request);
  if (refused) return refused;
  const archive = openArchive();
  if (!archive) return notConfigured();
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (id) await archive.remove(id.slice(0, 100));
    else if (searchParams.get("all") === "1") await archive.clear();
    else throw new InvalidArchiveInput("expected ?id= or ?all=1");
    return empty(204);
  } catch (error) {
    return failure(error);
  }
}
