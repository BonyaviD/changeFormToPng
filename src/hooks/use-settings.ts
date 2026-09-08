"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import {
  readSettings,
  SETTINGS_EVENT,
  writeSettings,
} from "@/lib/settings/store";
import type { AppSettings } from "@/lib/settings/types";

/**
 * `useSyncExternalStore` is the right shape here: settings live in
 * `localStorage`, which is exactly the "external store" the hook exists for.
 * It also gives the server render a stable snapshot (the shipped defaults)
 * without a mounted flag.
 */

let cachedSnapshot: AppSettings | null = null;

function getSnapshot(): AppSettings {
  // The store must hand back a stable reference between notifications, or React
  // re-renders forever.
  cachedSnapshot ??= readSettings();
  return cachedSnapshot;
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

function subscribe(onChange: () => void) {
  const handler = () => {
    cachedSnapshot = readSettings();
    onChange();
  };

  window.addEventListener(SETTINGS_EVENT, handler);
  // Another tab editing the catalogue should show up here too.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback(
    (next: AppSettings | ((current: AppSettings) => AppSettings)) => {
      const resolved = typeof next === "function" ? next(readSettings()) : next;
      writeSettings(resolved);
    },
    [],
  );

  return { settings, update };
}
