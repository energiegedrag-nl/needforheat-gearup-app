import {
  ESPDevice,
  ESPProvisionManager,
  ESPSecurity,
  ESPTransport,
} from "@orbital-systems/react-native-esp-idf-provisioning";
import { API_URL } from "@env";

import { ProvisionError, toProvisionError } from "@/lib/provisioning/provisionError";
import {
  SERVER_CONFIG_ENDPOINT,
  hostFromApiUrl,
  parseServerConfigReply,
  serverConfigRequest,
} from "@/lib/provisioning/serverConfig";
import { BleDeviceType, WifiEntry } from "@/types";
import { withTimeout } from "@/utils/withTimeout";

export { isWifiCredentialError } from "@/lib/provisioning/provisionError";

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

/**
 * End any earlier session with this device in the native library first. The library reuses its native device object
 * per name; after the device restarted (e.g. after a wrong Wi-Fi password) that object still held the dropped
 * connection and its transport lock, so the next request hung (21-11). disconnect() makes the library replace it.
 */
function resetSession(deviceName: string): void {
  try {
    connectedDevice?.disconnect();
  } catch {
    // already gone
  }
  connectedDevice = null;
  try {
    new ESPDevice({ name: deviceName, transport: TRANSPORT, security: SECURITY }).disconnect();
  } catch {
    // nothing to end
  }
}

/** Connect to a device by name with a fresh session; one more try with a fresh session when the first fails. */
export async function connectBleDevice(deviceName: string, proofOfPossession: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    resetSession(deviceName);
    const device = new ESPDevice({ name: deviceName, transport: TRANSPORT, security: SECURITY });
    try {
      await device.connect(proofOfPossession);
      connectedDevice = device;
      return;
    } catch (err: unknown) {
      if (attempt >= 2) throw err;
      console.warn(`Provisioning: connecting to ${deviceName} failed, trying once more with a fresh session.`, err);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
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

/** Seconds for the server choice: one short request; if it hangs, the session is stale. */
const SERVER_CHOICE_TIMEOUT_S = 10;
/** Seconds for sending and applying the credentials and reading the Wi-Fi status (the device tries up to 30 s). */
const CREDENTIALS_TIMEOUT_S = 45;

/**
 * Send Wi-Fi credentials to the connected device. Resolves with "success"; rejects with a ProvisionError whose kind
 * says what to do next (lib/provisioning/provisionError.ts). After any failure the session is ended, so "retry"
 * always starts with a fresh one.
 */
export async function provision(ssid: string, passphrase = ""): Promise<string> {
  try {
    // Before the Wi-Fi credentials: once those are applied, the device ends the provisioning session.
    await withTimeout(SERVER_CHOICE_TIMEOUT_S, sendServerChoice()).catch((err: unknown) => {
      throw toProvisionError(err, "session");
    });
    const response = await withTimeout(CREDENTIALS_TIMEOUT_S, requireDevice().provision(ssid, passphrase));
    return response.status;
  } catch (err: unknown) {
    const error = toProvisionError(err, "credentials");
    console.warn(`Provisioning failed (${error.kind}): ${error.message}`);
    disconnect();
    throw error;
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
    throw new ProvisionError("session", `server not allowed: ${host} (device accepts: ${result.allowed.join(", ") || "none"})`);
  }
  if (result.kind === "unreadable") {
    console.warn(`Provisioning: unexpected reply to the server choice: ${result.reply}`);
  }
}

export function disconnect(): void {
  try {
    connectedDevice?.disconnect();
  } catch {
    // already gone
  }
  connectedDevice = null;
}
