"use client";

import { useEffect, useState } from "react";

import { artworkContextFor, type CertificateRecord } from "@/lib/storage";
import type { AppSettings } from "@/lib/settings/types";
import type { ArtworkContext } from "@/lib/templates/types";

/**
 * The context an archived certificate was issued with, for previewing it.
 * `null` while its signature images load, so a preview never flashes the
 * wrong signature first.
 */
export function useRecordArtwork(
  record: CertificateRecord | null,
  settings: AppSettings,
): ArtworkContext | null {
  const [resolved, setResolved] = useState<{ record: CertificateRecord; context: ArtworkContext } | null>(null);

  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    artworkContextFor(record, settings).then(
      (context) => !cancelled && setResolved({ record, context }),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [record, settings]);

  return record && resolved?.record === record ? resolved.context : null;
}
