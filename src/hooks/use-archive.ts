"use client";

import { useCallback, useEffect, useState } from "react";

import {
  certificateRepository,
  STORAGE_EVENT,
  type CertificateRecord,
} from "@/lib/storage";

/**
 * Reads the certificate archive and keeps every mounted screen in sync — both
 * with changes made in this tab (`STORAGE_EVENT`) and in another one
 * (`storage`).
 */
export function useArchive() {
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setRecords(await certificateRepository.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    // `refresh` awaits the repository before it touches state, so this is not
    // the synchronous cascade the rule guards against — it is the initial read
    // of an external store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    const handler = () => void refresh();
    window.addEventListener(STORAGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return { records, loading, refresh };
}
