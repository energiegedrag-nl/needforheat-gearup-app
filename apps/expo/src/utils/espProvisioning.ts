import {
  ESPDevice,
  ESPProvisionManager,
  ESPSecurity,
  ESPTransport,
} from "@orbital-systems/react-native-esp-idf-provisioning";
import { API_URL } from "@env";

import {
  SERVER_CONFIG_ENDPOINT,
  hostFromApiUrl,
  parseServerConfigReply,
  serverConfigRequest,
} from "@/lib/provisioning/serverConfig";
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
  // Before the Wi-Fi credentials: once those are applied, the device ends the provisioning session.
  await sendServerChoice();
  try {
    const response = await requireDevice().provision(ssid, passphrase);
    return response.status;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(isWifiCredentialError(message) ? `wifi failure: ${message}` : message);
  }
}

/**
 * Tell the device which server this app uses (test or production), so it uploads to the same one.
 * Devices with older firmware have no "nfh-config" endpoint: they keep their built-in server.
 * A device that refuses the server would never activate, so that stops provisioning with a clear error.
 */
async function sendServerChoice(): Promise<void> {
  const host = hostFromApiUrl(API_URL ?? "");
  if (!host) {
    console.warn("Provisioning: API_URL has no host; the device keeps its built-in server.");
    return;
  }
  let reply: string;
  try {
    reply = await requireDevice().sendData(SERVER_CONFIG_ENDPOINT, serverConfigRequest(host));
  } catch (err: unknown) {
    console.warn("Provisioning: device does not support choosing a server (older firmware).", err);
    return;
  }
  const result = parseServerConfigReply(reply);
  if (result.kind === "refused") {
    throw new Error(`server not allowed: ${host} (device accepts: ${result.allowed.join(", ") || "none"})`);
  }
  if (result.kind === "unreadable") {
    console.warn(`Provisioning: unexpected reply to the server choice: ${result.reply}`);
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
