// Smoke tests for the BYOK key store. Uses happy-dom's real localStorage/
// sessionStorage, no mocks. Verifies round-trip and clear behavior for both
// "persistent" (localStorage) and "session" (sessionStorage) modes.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearKey, getKey, getStorageMode, maskKey, setKey } from "./keyStore";

describe("keyStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("round-trips a key through localStorage in persistent mode", () => {
    setKey("sk-or-v1-test-key-abcdef", "persistent");
    expect(getKey()).toBe("sk-or-v1-test-key-abcdef");
    expect(getStorageMode()).toBe("persistent");
  });

  it("round-trips a key through sessionStorage in session mode", () => {
    setKey("sk-or-v1-session-key-xyz", "session");
    expect(getKey()).toBe("sk-or-v1-session-key-xyz");
    expect(getStorageMode()).toBe("session");
  });

  it("clearKey removes the key from both storages", () => {
    setKey("sk-or-v1-to-be-cleared", "persistent");
    expect(getKey()).not.toBeNull();
    clearKey();
    expect(getKey()).toBeNull();
    expect(window.localStorage.getItem("rbase:openrouter_key")).toBeNull();
    expect(window.sessionStorage.getItem("rbase:openrouter_key")).toBeNull();
  });

  it("maskKey hides the middle of a long key", () => {
    const masked = maskKey("sk-or-v1-abcdefghijklmnop");
    expect(masked.startsWith("sk-or-v")).toBe(true);
    expect(masked.endsWith("mnop")).toBe(true);
    expect(masked).toContain("…");
  });
});
