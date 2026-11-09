/**
 * Wi-Fi security of a network as the device reports it in its scan: ESP-IDF's `wifi_auth_mode_t`.
 * The numbers are the same in ESP-IDF 4.2 (current firmware) and 5.x.
 */
export const WifiAuthMode = {
  OPEN: 0,
  WEP: 1,
  WPA_PSK: 2,
  WPA2_PSK: 3,
  WPA_WPA2_PSK: 4,
  WPA2_ENTERPRISE: 5,
  WPA3_PSK: 6,
  WPA2_WPA3_PSK: 7,
  WAPI_PSK: 8,
} as const;

/**
 * Whether the device can join a network with this security.
 *
 * WPA2/WPA3 mixed (7) works: the device connects with WPA2. Not supported: WPA2/WPA3 Enterprise (5), WPA3 only (6,
 * needs firmware on ESP-IDF 5.x, where PMF is on by default) and WAPI or newer modes. Unknown: let the device try.
 */
export function isSupportedWifiSecurity(security?: number | null): boolean {
  if (security === undefined || security === null) return true;
  return security <= WifiAuthMode.WPA_WPA2_PSK || security === WifiAuthMode.WPA2_WPA3_PSK;
}
