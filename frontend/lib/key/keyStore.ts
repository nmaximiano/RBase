// Device-local BYOK storage for the OpenRouter API key.
//
// Trust model: the key lives only in this browser (localStorage or sessionStorage).
// It never touches any server owned by us; we don't have one. Every request goes
// straight to https://openrouter.ai from the user's browser.

const KEY_NAME = "rbase:openrouter_key";
const MODE_NAME = "rbase:openrouter_key_mode"; // "persistent" | "session"

export type StorageMode = "persistent" | "session";

function readFrom(storage: Storage | undefined): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(KEY_NAME);
  } catch {
    return null;
  }
}

export function getKey(): string | null {
  if (typeof window === "undefined") return null;
  return readFrom(window.localStorage) ?? readFrom(window.sessionStorage);
}

export function getStorageMode(): StorageMode {
  if (typeof window === "undefined") return "persistent";
  try {
    return window.localStorage.getItem(MODE_NAME) === "session" ? "session" : "persistent";
  } catch {
    return "persistent";
  }
}

export function setKey(key: string, mode: StorageMode = "persistent"): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (!trimmed) return;
  try {
    // Clear from whichever store might have a stale copy before writing.
    window.localStorage.removeItem(KEY_NAME);
    window.sessionStorage.removeItem(KEY_NAME);
    if (mode === "session") {
      window.sessionStorage.setItem(KEY_NAME, trimmed);
      window.localStorage.setItem(MODE_NAME, "session");
    } else {
      window.localStorage.setItem(KEY_NAME, trimmed);
      window.localStorage.setItem(MODE_NAME, "persistent");
    }
    window.dispatchEvent(new CustomEvent("rbase:key-changed"));
  } catch {
    // Storage unavailable (private mode, quota, etc); fail silently.
  }
}

export function clearKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_NAME);
    window.localStorage.removeItem(MODE_NAME);
    window.sessionStorage.removeItem(KEY_NAME);
    window.dispatchEvent(new CustomEvent("rbase:key-changed"));
  } catch {
    // ignore
  }
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
