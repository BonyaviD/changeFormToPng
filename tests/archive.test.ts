import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { localCertificateRepository as archive, MAX_RECORDS } from "../src/lib/storage/local-repository";
import { ArchiveFullError, type CertificateRecord } from "../src/lib/storage/types";

// The repository only needs `localStorage` from the browser.
const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  },
});

function record(index: number): CertificateRecord {
  return {
    id: `id-${index}`,
    serial: `SERIAL-${index}`,
    templateId: "test",
    templateVersion: 1,
    values: { fullName: `person ${index}` },
    summary: { primary: `person ${index}`, secondary: "course" },
    issuedAt: new Date(Date.UTC(2025, 0, 1) + index * 1000).toISOString(),
    source: "bulk",
  };
}

function records(from: number, count: number) {
  return Array.from({ length: count }, (_, offset) => record(from + offset));
}

beforeEach(() => store.clear());

test("a full archive refuses a new record instead of dropping the oldest", async () => {
  await archive.saveMany(records(0, MAX_RECORDS));
  assert.deepEqual(await archive.usage(), { used: MAX_RECORDS, capacity: MAX_RECORDS });

  await assert.rejects(archive.save(record(MAX_RECORDS)), ArchiveFullError);

  const kept = await archive.list();
  assert.equal(kept.length, MAX_RECORDS);
  assert.ok(await archive.findBySerial("SERIAL-0"), "the oldest certificate must survive");
  assert.equal(await archive.findBySerial(`SERIAL-${MAX_RECORDS}`), null);
});

test("a full archive still updates an existing record", async () => {
  await archive.saveMany(records(0, MAX_RECORDS));
  await archive.save({ ...record(7), values: { fullName: "corrected" } });

  assert.deepEqual((await archive.findBySerial("SERIAL-7"))?.values, { fullName: "corrected" });
  assert.equal((await archive.list()).length, MAX_RECORDS);
});

test("a bulk save that does not fit writes nothing and says how much room is left", async () => {
  await archive.saveMany(records(0, MAX_RECORDS - 3));
  assert.equal((await archive.usage()).used, MAX_RECORDS - 3);

  await assert.rejects(archive.saveMany(records(MAX_RECORDS, 5)), (error: unknown) => {
    assert.ok(error instanceof ArchiveFullError);
    assert.match(error.message, /۳/);
    assert.match(error.message, /۵/);
    return true;
  });
  assert.equal((await archive.list()).length, MAX_RECORDS - 3);

  // Records already in the archive take no extra room.
  await archive.saveMany([...records(0, 10), ...records(MAX_RECORDS, 3)]);
  assert.deepEqual(await archive.usage(), { used: MAX_RECORDS, capacity: MAX_RECORDS });
});

test("removing a record frees its room again", async () => {
  await archive.saveMany(records(0, MAX_RECORDS));
  await archive.remove("id-0");
  assert.equal((await archive.usage()).used, MAX_RECORDS - 1);
  await archive.save(record(MAX_RECORDS));
  assert.ok(await archive.findBySerial(`serial-${MAX_RECORDS}`), "lookup ignores case");
});

test("records list newest first", async () => {
  await archive.saveMany([record(1), record(3), record(2)]);
  assert.deepEqual((await archive.list()).map((item) => item.id), ["id-3", "id-2", "id-1"]);
});

test("signature images are stored once and dropped with the last certificate using them", async () => {
  const image = "data:image/png;base64,AAAA";
  const other = "data:image/png;base64,BBBB";
  await archive.saveAssets({ a: image, b: other });
  await archive.saveAssets({ a: image });
  const signed = (index: number, id: string) => ({
    ...record(index),
    artwork: {
      signatures: { "دکتر الف": id },
      signatureScales: {},
      watermark: { enabled: false, x: 50, y: 50, size: 350, color: "#268a69", opacity: 0.08 },
    },
  });
  await archive.saveMany([signed(1, "a"), signed(2, "a"), signed(3, "b")]);
  assert.deepEqual(await archive.loadAssets(["a", "b", "missing"]), { a: image, b: other });

  await archive.remove("id-3");
  assert.deepEqual(await archive.loadAssets(["a", "b"]), { a: image }, "b has no certificate left");
  await archive.remove("id-1");
  assert.deepEqual(await archive.loadAssets(["a"]), { a: image }, "id-2 still uses a");

  await archive.clear();
  assert.deepEqual(await archive.loadAssets(["a"]), {});
});
