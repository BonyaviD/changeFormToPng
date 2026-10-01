import assert from "node:assert/strict";
import { test } from "node:test";

import { certificateFingerprint, claimSerial, generateSerial } from "../src/lib/serial";

function minter() {
  let count = 0;
  return () => `S${(count += 1)}`;
}

test("re-exporting unchanged content keeps the same tracking number", () => {
  const mint = minter();
  const values = { fullName: "مهسا", courseTitle: "حلال" };
  const first = claimSerial(null, certificateFingerprint("t", values), mint);
  const again = claimSerial(first, certificateFingerprint("t", { ...values }), mint);

  assert.equal(first.serial, "S1");
  assert.equal(again, first);
});

test("editing the form after issuing makes a new certificate, not an overwrite", () => {
  const mint = minter();
  const first = claimSerial(null, certificateFingerprint("t", { fullName: "الف" }), mint);
  const second = claimSerial(first, certificateFingerprint("t", { fullName: "ب" }), mint);

  assert.equal(second.serial, "S2");
  assert.notEqual(second.serial, first.serial);
});

test("the fingerprint ignores key order but not values, types or template", () => {
  const base = certificateFingerprint("t", { a: "1", b: true, nested: { x: 1, y: 2 } });

  assert.equal(base, certificateFingerprint("t", { nested: { y: 2, x: 1 }, b: true, a: "1" }));
  assert.equal(base, certificateFingerprint("t", { a: "1", b: true, nested: { x: 1, y: 2 }, gone: undefined }));
  assert.notEqual(base, certificateFingerprint("t", { a: "1", b: false, nested: { x: 1, y: 2 } }));
  assert.notEqual(base, certificateFingerprint("t", { a: 1, b: true, nested: { x: 1, y: 2 } }));
  assert.notEqual(base, certificateFingerprint("other", { a: "1", b: true, nested: { x: 1, y: 2 } }));
});

test("generated serials are upper-case and distinct", () => {
  const serials = new Set(Array.from({ length: 200 }, generateSerial));
  assert.equal(serials.size, 200);
  for (const serial of serials) assert.match(serial, /^[0-9A-Z]+-[0-9A-Z]{4}$/);
});
