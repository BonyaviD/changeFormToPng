import assert from "node:assert/strict";
import { test } from "node:test";

import { buildArtworkContext } from "../src/lib/settings/artwork-context";
import type { AppSettings } from "../src/lib/settings/types";
import { DEFAULT_WATERMARK } from "../src/lib/settings/watermark";
import { restoreArtworkContext, snapshotArtwork } from "../src/lib/storage/artwork-snapshot";
import { assetId } from "../src/lib/storage/assets";
import type { CertificateRecord } from "../src/lib/storage/types";

const oldSignature = "data:image/png;base64,T0xE";
const newSignature = "data:image/png;base64,TkVX";

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    courses: [],
    unitCaptions: [],
    watermark: { ...DEFAULT_WATERMARK, opacity: 0.2 },
    signatories: [
      { id: "1", name: "دکتر الف", title: "رئیس", signatureImage: oldSignature, signatureScale: 1.3 },
      { id: "2", name: "دکتر ب", title: "مدیر", signatureImage: newSignature },
    ],
    ...overrides,
  };
}

const values = { fullName: "مهسا", primarySignatoryName: " دکتر الف ", dualSignature: false };

function record(artwork?: CertificateRecord["artwork"]): CertificateRecord {
  return {
    id: "r1",
    serial: "S1",
    templateId: "halal-training",
    templateVersion: 3,
    values,
    summary: { primary: "مهسا", secondary: "دوره" },
    issuedAt: "2025-01-01T00:00:00.000Z",
    source: "single",
    artwork,
  };
}

test("a snapshot keeps only the signatories the certificate names", async () => {
  const { artwork, assets } = await snapshotArtwork(buildArtworkContext(settings()), values);
  const id = await assetId(oldSignature);

  assert.deepEqual(artwork.signatures, { "دکتر الف": id });
  assert.deepEqual(artwork.signatureScales, { "دکتر الف": 1.3 });
  assert.deepEqual(assets, { [id]: oldSignature });
  assert.equal(artwork.watermark.opacity, 0.2);
});

test("a re-issue matches the original after the settings change", async () => {
  const { artwork, assets } = await snapshotArtwork(buildArtworkContext(settings()), values);
  // The signatory was renamed, given a new signature, and the watermark turned off.
  const later = settings({
    watermark: { ...DEFAULT_WATERMARK, enabled: false },
    signatories: [{ id: "1", name: "دکتر الف (بازنشسته)", title: "رئیس", signatureImage: newSignature }],
  });

  const context = restoreArtworkContext(record(artwork), later, assets);
  assert.equal(context.signatureImages?.["دکتر الف"], oldSignature);
  assert.equal(context.signatureScales?.["دکتر الف"], 1.3);
  assert.equal(context.watermark?.enabled, true);
  assert.equal(context.watermark?.opacity, 0.2);
  assert.equal(context.serial, "S1");
});

test("a certificate issued unsigned is re-issued unsigned", async () => {
  const unsigned = settings({ signatories: [{ id: "1", name: "دکتر الف", title: "رئیس" }] });
  const { artwork } = await snapshotArtwork(buildArtworkContext(unsigned), values);
  const context = restoreArtworkContext(record(artwork), settings(), {});
  assert.equal(context.signatureImages?.["دکتر الف"], undefined);
});

test("older certificates and lost images fall back to today's settings", async () => {
  const legacy = restoreArtworkContext(record(), settings(), {});
  assert.equal(legacy.signatureImages?.["دکتر الف"], oldSignature);
  assert.equal(legacy.watermark?.opacity, 0.2);

  const { artwork } = await snapshotArtwork(buildArtworkContext(settings()), values);
  const lost = restoreArtworkContext(record(artwork), settings({
    signatories: [{ id: "1", name: "دکتر الف", title: "رئیس", signatureImage: newSignature, signatureScale: 0.8 }],
  }), {});
  assert.equal(lost.signatureImages?.["دکتر الف"], newSignature);
  assert.equal(lost.signatureScales?.["دکتر الف"], 0.8);
});
