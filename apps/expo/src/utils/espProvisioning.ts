import {
  ESPDevice,
  ESPProvisionManager,
  ESPSecurity,
  ESPTransport,
} from "@orbital-systems/react-native-esp-idf-provisioning";

import { BleDeviceType, WifiEntry } from "@/types";

/*
 * Thin wrapper around @orbital-systems/react-native-esp-idf-provisioning (MIT, maintained).
 * NeedForHeat devices provision over BLE with security 1 and a proof of possession
 * (the "pop" from the QR code), see needforheat-generic-firmware.
 * The library works with ESPDevice objects; the app keeps working with BleDeviceType and
 * WifiEntry, so the screens and hooks did not have to change shape.
 */
const TRANSPORT = ESPTransport.ble;
const SECURITY = ESPSecurity.secure;

let connectedDevice: ESPDevice | null = null;

/** Scan for BLE provisioning devices whose name starts with prefix ("" = all). */
export async function getBleDevices(prefix = ""): Promise<BleDeviceType[]> {
  const devices = await ESPProvisionManager.searchESPDevices(prefix, TRANSPORT, SECURITY);
  // The library identifies devices by name; deviceAddress is kept for compatibility.
  return (devices ?? []).map(device => ({ deviceName: device.name, deviceAddress: device.name }));
}

/** Connect to a device by name; replaces any previously connected device. */
export async function connectBleDevice(deviceName: string, proofOfPossession: string): Promise<void> {
  const device = new ESPDevice({ name: deviceName, transport: TRANSPORT, security: SECURITY });
  await device.connect(proofOfPossession);
  connectedDevice = device;
}

function requireDevice(): ESPDevice {
  if (!connectedDevice) {
    throw new Error("No ESP device connected. Call connectBleDevice first.");
  }
  return connectedDevice;
}

/** Wi-Fi networks as seen by the connected device. */
export async function scanWifiList(): Promise<WifiEntry[]> {
  const networks = await requireDevice().scanWifiList();
  // ESPWifiAuthMode uses the same numbering (0-7) as WifiSecurity.
  return networks.map(network => ({
    name: network.ssid,
    rssi: network.rssi,
    security: network.auth as WifiEntry["security"],
  }));
}

/**
 * Send Wi-Fi credentials to the connected device.
 * Resolves with "success"; rejects with an Error whose message contains "wifi failure"
 * when the device reports wrong credentials or a network it cannot find.
 */
export async function provision(ssid: string, passphrase = ""): Promise<string> {
  try {
    const response = await requireDevice().provision(ssid, passphrase);
    return response.status;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(isWifiCredentialError(message) ? `wifi failure: ${message}` : message);
  }
}

// Android: ESPConstants.ProvisionFailureReason (AUTH_FAILED, NETWORK_NOT_FOUND);
// iOS: ESPProvisionError descriptions (authentication / network not found).
function isWifiCredentialError(message: string): boolean {
  return /AUTH_FAILED|NETWORK_NOT_FOUND|auth|not found|wifi|wi-fi/i.test(message);
}

export function disconnect(): void {
  connectedDevice?.disconnect();
  connectedDevice = null;
}
