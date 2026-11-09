import { isSupportedWifiSecurity, WifiAuthMode } from "./wifiSecurity";

describe("isSupportedWifiSecurity", () => {
  it("accepts open, WEP, WPA, WPA2 and WPA/WPA2 networks", () => {
    for (const mode of [0, 1, 2, 3, 4]) expect(isSupportedWifiSecurity(mode)).toBe(true);
  });
  it("accepts WPA2/WPA3 mixed networks", () => {
    expect(isSupportedWifiSecurity(WifiAuthMode.WPA2_WPA3_PSK)).toBe(true);
  });
  it("rejects enterprise, WPA3-only and newer modes", () => {
    expect(isSupportedWifiSecurity(WifiAuthMode.WPA2_ENTERPRISE)).toBe(false);
    expect(isSupportedWifiSecurity(WifiAuthMode.WPA3_PSK)).toBe(false);
    expect(isSupportedWifiSecurity(WifiAuthMode.WAPI_PSK)).toBe(false);
    expect(isSupportedWifiSecurity(9)).toBe(false);
  });
  it("lets the device try when the security is unknown", () => {
    expect(isSupportedWifiSecurity(undefined)).toBe(true);
    expect(isSupportedWifiSecurity(null)).toBe(true);
  });
});
