import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_WATERMARK,
  normalizeWatermarkColor,
  normalizeWatermarkSettings,
  WATERMARK_SIZE_MAX,
} from "../src/lib/settings/watermark";

test("watermark defaults are complete for settings saved before the feature", () => {
  assert.deepEqual(normalizeWatermarkSettings(undefined), DEFAULT_WATERMARK);
  assert.deepEqual(
    normalizeWatermarkSettings({ enabled: false }),
    { ...DEFAULT_WATERMARK, enabled: false },
  );
});

test("watermark geometry and opacity stay inside the certificate controls", () => {
  assert.deepEqual(
    normalizeWatermarkSettings({
      enabled: false,
      x: -40,
      y: 190,
      size: 999,
      opacity: -0.5,
      color: "#ABC",
    }),
    {
      enabled: false,
      x: 0,
      y: 100,
      size: WATERMARK_SIZE_MAX,
      opacity: 0,
      color: "#aabbcc",
    },
  );

  assert.equal(normalizeWatermarkSettings({ size: 356 }).size, 360);
  assert.equal(normalizeWatermarkSettings({ opacity: 0.184 }).opacity, 0.18);
});

test("watermark colors accept safe hex values and reject malformed values", () => {
  assert.equal(normalizeWatermarkColor(" #1F3FC3 "), "#1f3fc3");
  assert.equal(normalizeWatermarkColor("#4a7"), "#44aa77");
  assert.equal(normalizeWatermarkColor("rgb(0, 0, 0)"), DEFAULT_WATERMARK.color);
  assert.equal(normalizeWatermarkColor("url(javascript:bad)"), DEFAULT_WATERMARK.color);
});
