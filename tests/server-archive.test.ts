import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

import { NextRequest } from "next/server";

import { GET as statusGET } from "../src/app/api/archive/route";
import { GET as assetsGET, POST as assetsPOST } from "../src/app/api/archive/assets/route";
import { DELETE as recordsDELETE, GET as recordsGET, POST as recordsPOST } from "../src/app/api/archive/records/route";
import { GET as usageGET } from "../src/app/api/archive/usage/route";
import { RedisRest } from "../src/lib/archive-server/redis";
import { createServerArchive, SERVER_CAPACITY } from "../src/lib/archive-server/store";
import { createSession, getAuthConfig, hashPassword, sessionCookieName } from "../src/lib/auth/core";
import { assetId } from "../src/lib/storage/assets";
import { createRemoteRepository } from "../src/lib/storage/remote-repository";
import { ArchiveFullError, type CertificateRecord } from "../src/lib/storage/types";
import { startUpstashEmulator } from "./helpers/upstash-emulator";

const origin = "http://localhost:3000";
const signature = `data:image/png;base64,${Buffer.from("fake signature").toString("base64")}`;

function record(index: number, extra: Partial<CertificateRecord> = {}): CertificateRecord {
  return {
    id: `id-${index}`,
    serial: `SERIAL-${index}`,
    templateId: "halal-training",
    templateVersion: 3,
    values: { fullName: `نفر ${index}` },
    summary: { primary: `نفر ${index}`, secondary: "دوره" },
    issuedAt: new Date(Date.UTC(2025, 0, 1) + index * 1000).toISOString(),
    source: "single",
    ...extra,
  };
}

async function signIn() {
  if (!getAuthConfig()) {
    process.env.SARA_AUTH_USERNAME = "operator";
    process.env.SARA_AUTH_PASSWORD_HASH = await hashPassword("archive-test-password");
    process.env.SARA_SESSION_SECRET = randomBytes(32).toString("base64url");
  }
  return `${sessionCookieName()}=${createSession(getAuthConfig()!)}`;
}

const routes: Record<string, Record<string, (request: NextRequest) => Promise<Response> | Response>> = {
  "/api/archive": { GET: statusGET },
  "/api/archive/usage": { GET: usageGET },
  "/api/archive/records": { GET: recordsGET, POST: recordsPOST, DELETE: recordsDELETE },
  "/api/archive/assets": { GET: assetsGET, POST: assetsPOST },
};

/** Calls the route handlers the way the browser would: same origin, signed in. */
function browser(cookie: string | null, from = origin) {
  return async (path: string, init: RequestInit = {}) => {
    const url = new URL(path, origin);
    const headers = new Headers(init.headers);
    if (cookie) headers.set("cookie", cookie);
    headers.set("origin", from);
    const method = init.method ?? "GET";
    return routes[url.pathname][method](new NextRequest(url, { method, headers, body: init.body }));
  };
}

test("the shared server archive", async (t) => {
  const emulator = await startUpstashEmulator();
  process.env.KV_REST_API_URL = emulator.url;
  process.env.KV_REST_API_TOKEN = emulator.token;
  const cookie = await signIn();
  const archive = createRemoteRepository(browser(cookie));

  t.after(async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    await emulator.close();
  });

  await t.test("reports itself as enabled", async () => {
    const response = await browser(cookie)("/api/archive");
    assert.deepEqual(await response.json(), { enabled: true });
  });

  await t.test("stores, lists newest first, finds by serial, and removes", async () => {
    await archive.saveMany([record(1), record(3), record(2)]);
    assert.deepEqual((await archive.list()).map((item) => item.id), ["id-3", "id-2", "id-1"]);
    assert.equal((await archive.findBySerial(" serial-2 "))?.id, "id-2");
    assert.equal(await archive.findBySerial("NOPE"), null);
    assert.deepEqual(await archive.usage(), { used: 3, capacity: SERVER_CAPACITY });

    await archive.save({ ...record(2), values: { fullName: "اصلاح‌شده" } });
    assert.deepEqual((await archive.findBySerial("SERIAL-2"))?.values, { fullName: "اصلاح‌شده" });
    assert.equal((await archive.usage()).used, 3, "an update adds nothing");

    await archive.remove("id-2");
    assert.equal(await archive.findBySerial("SERIAL-2"), null);
    assert.equal((await archive.usage()).used, 2);
  });

  await t.test("lists archives larger than one page", async () => {
    await archive.clear();
    await archive.saveMany(Array.from({ length: 1234 }, (_, index) => record(index)));
    const all = await archive.list();
    assert.equal(all.length, 1234);
    assert.equal(new Set(all.map((item) => item.id)).size, 1234);
    assert.equal(all[0].id, "id-1233");
  });

  await t.test("stores each signature once and returns it by content hash", async () => {
    const id = await assetId(signature);
    await archive.saveAssets({ [id]: signature });
    await archive.saveAssets({ [id]: signature });
    assert.deepEqual(await archive.loadAssets([id, "f".repeat(64)]), { [id]: signature });
    assert.equal(emulator.hashes.get("sara:v1:assets")?.size, 1);
  });

  await t.test("refuses an image that does not match its id", async () => {
    const response = await browser(cookie)("/api/archive/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: { ["0".repeat(64)]: signature } }),
    });
    assert.equal(response.status, 400);
  });

  await t.test("refuses malformed records without writing any of the batch", async () => {
    const before = (await archive.usage()).used;
    const bad = [record(90_001), { ...record(90_002), issuedAt: "yesterday" }];
    const response = await browser(cookie)("/api/archive/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: bad }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /record 1: issuedAt/);
    assert.equal((await archive.usage()).used, before);
  });

  await t.test("a full archive refuses new certificates, keeps the old, allows updates", async () => {
    await archive.clear();
    const records = emulator.hashes.get("sara:v1:certificates") ?? new Map<string, string>();
    for (let index = 0; index < SERVER_CAPACITY; index += 1) {
      records.set(`fill-${index}`, JSON.stringify(record(index, { id: `fill-${index}` })));
    }
    emulator.hashes.set("sara:v1:certificates", records);

    await assert.rejects(archive.save(record(SERVER_CAPACITY + 1)), (error: unknown) => {
      assert.ok(error instanceof ArchiveFullError);
      assert.equal(error.capacity, SERVER_CAPACITY);
      return true;
    });
    assert.equal(records.size, SERVER_CAPACITY);
    await archive.save(record(5, { id: "fill-5", values: { fullName: "به‌روز" } }));
    assert.match(records.get("fill-5")!, /به‌روز/);
    await archive.clear();
  });

  await t.test("a stored snapshot survives the round trip intact", async () => {
    const id = await assetId(signature);
    const artwork = {
      signatures: { "دکتر الف": id },
      signatureScales: { "دکتر الف": 1.2 },
      watermark: { enabled: true, x: 40, y: 60, size: 300, color: "#268a69", opacity: 0.1 },
    };
    await archive.save(record(7, { artwork }));
    assert.deepEqual((await archive.findBySerial("SERIAL-7"))?.artwork, artwork);
  });

  await t.test("nobody reads or writes without a session, or from another site", async () => {
    for (const path of ["/api/archive", "/api/archive/usage", "/api/archive/records", "/api/archive/assets"]) {
      assert.equal((await browser(null)(path)).status, 401, path);
    }
    const forged = await browser(`${sessionCookieName()}=forged.token`)("/api/archive/records");
    assert.equal(forged.status, 401);
    const crossSite = await browser(cookie, "https://evil.example")("/api/archive/records?all=1", { method: "DELETE" });
    assert.equal(crossSite.status, 403);
    assert.equal((await archive.usage()).used, 1, "the cross-site delete did nothing");
  });

  await t.test("store errors surface as a retryable failure, not a crash", async () => {
    const broken = createServerArchive(new RedisRest({ url: emulator.url, token: "wrong" }));
    await assert.rejects(broken.usage(), /Unauthorized/);
    process.env.KV_REST_API_TOKEN = "wrong";
    const response = await browser(cookie)("/api/archive/usage");
    assert.equal(response.status, 502);
    await assert.rejects(archive.usage(), /ارتباط با آرشیو سرور/);
    process.env.KV_REST_API_TOKEN = emulator.token;
  });
});

test("without a server store the archive stays in the browser", async () => {
  delete process.env.KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  const cookie = await signIn();
  assert.deepEqual(await (await browser(cookie)("/api/archive")).json(), { enabled: false });
  assert.equal((await browser(cookie)("/api/archive/records")).status, 404);
});
