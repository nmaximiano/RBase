"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearKey as clearKeyStorage,
  getKey,
  getStorageMode,
  setKey as setKeyStorage,
  type StorageMode,
} from "./keyStore";

export function useApiKey() {
  const [key, setKeyState] = useState<string | null>(null);
  const [mode, setModeState] = useState<StorageMode>("persistent");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Initial read from localStorage and subscribe to changes.
    // Synchronous setState here is the correct pattern for reading browser-only
    // state (localStorage) that must not be read during SSR.
    const refresh = () => {
      setKeyState(getKey());
      setModeState(getStorageMode());
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    window.addEventListener("rbase:key-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("rbase:key-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const setKey = useCallback((value: string, storageMode: StorageMode = "persistent") => {
    setKeyStorage(value, storageMode);
  }, []);

  const clearKey = useCallback(() => {
    clearKeyStorage();
  }, []);

  return {
    key,
    mode,
    hasKey: Boolean(key),
    hydrated,
    setKey,
    clearKey,
  };
}
