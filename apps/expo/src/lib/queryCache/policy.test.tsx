import { describe, expect, it } from "@jest/globals";

import {
  formatUpdatedAt,
  isUsableQueryCache,
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_VERSION,
  shouldPersistQuery,
} from "./policy";

describe("which data stays on the phone between starts", () => {
  it("keeps what the home screen needs, never keys, Wi-Fi or measurements", () => {
    expect(shouldPersistQuery(["user"], "success")).toBe(true);
    expect(shouldPersistQuery(["devices"], "success")).toBe(true);
    expect(shouldPersistQuery(["energy_queries"], "success")).toBe(true);
    expect(shouldPersistQuery(["cloud-feeds"], "success")).toBe(true);
    expect(shouldPersistQuery(["apikey", "EP-online"], "success")).toBe(false);
    expect(shouldPersistQuery(["wifiNetworks", "FE2E-979798"], "success")).toBe(false);
    expect(shouldPersistQuery(["measurementsSchema", "x", {}], "success")).toBe(false);
    expect(shouldPersistQuery(["devices"], "error")).toBe(false);
  });

  it("restores a saved cache only in the current format and when not too old", () => {
    const now = 1_800_000_000_000;
    const ok = { version: QUERY_CACHE_VERSION, savedAt: now - 1000, state: {} };
    expect(isUsableQueryCache(ok, now)).toBe(true);
    expect(isUsableQueryCache({ ...ok, version: QUERY_CACHE_VERSION + 1 }, now)).toBe(false);
    expect(isUsableQueryCache({ ...ok, savedAt: now - QUERY_CACHE_MAX_AGE_MS - 1 }, now)).toBe(false);
    expect(isUsableQueryCache({ ...ok, savedAt: now + 60_000 }, now)).toBe(false);
    expect(isUsableQueryCache(null, now)).toBe(false);
  });
});

describe("when the data on screen is from", () => {
  const days = "zo,ma,di,wo,do,vr,za".split(",");
  it("shows the time today, the weekday this week, else the date", () => {
    const now = new Date(2026, 10, 21, 15, 0).getTime(); // Saturday 21-11-2026 15:00
    expect(formatUpdatedAt(new Date(2026, 10, 21, 14, 32).getTime(), now, days)).toBe("14:32");
    expect(formatUpdatedAt(new Date(2026, 10, 18, 9, 5).getTime(), now, days)).toBe("wo 09:05");
    expect(formatUpdatedAt(new Date(2026, 10, 10, 9, 5).getTime(), now, days)).toBe("10-11 09:05");
  });
});
