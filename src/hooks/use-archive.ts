"use client";

import { useCallback, useEffect, useState } from "react";

import {
  archiveLocation,
  certificateRepository,
  STORAGE_EVENT,
  type ArchiveLocation,
  type CertificateRecord,
} from "@/lib/storage";

interface ArchiveState {
  records: CertificateRecord[];
  loading: boolean;
  capacity: number | null;
  location: ArchiveLocation | null;
  error: string | null;
}

/**
 * Reads the certificate archive and keeps every mounted screen in sync — both
 * with changes made in this tab (`STORAGE_EVENT`) and in another one
 * (`storage`, for the browser archive).
 */
export function useArchive() {
  const [state, setState] = useState<ArchiveState>({
    records: [],
    loading: true,
    capacity: null,
    location: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const [records, usage, location] = await Promise.all([
        certificateRepository.list(),
        certificateRepository.usage(),
        archiveLocation(),
      ]);
      setState({ records, loading: false, capacity: usage.capacity, location, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "خواندن آرشیو ناموفق بود.",
      }));
    }
  }, []);

  useEffect(() => {
    // The initial read of an external store; `refresh` awaits it before it
    // touches state.
    void refresh();

    const handler = () => void refresh();
    window.addEventListener(STORAGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return { ...state, refresh };
}

/** Where the archive lives, once known. */
export function useArchiveLocation() {
  const [location, setLocation] = useState<ArchiveLocation | null>(null);
  useEffect(() => {
    let cancelled = false;
    archiveLocation().then(
      (value) => !cancelled && setLocation(value),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return location;
}
