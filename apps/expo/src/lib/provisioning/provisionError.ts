/*
 * What went wrong while sending the Wi-Fi network to a device, so the app can say the right thing and choose the next
 * step (21-11: after a wrong Wi-Fi password the device restarts; the next attempt hung on a stale Bluetooth session,
 * the credentials never reached the device, and the app showed both "Wifi" and "Eerste meting" in red).
 *
 * - "wifi":    the device tried the network and failed (wrong password, network not found). It restarts and shows its
 *              QR code again.
 * - "session": the Bluetooth session failed or hung before the credentials were sent. Nothing reached the device;
 *              connect again.
 * - "unclear": after the credentials were sent, e.g. the device ended the Bluetooth session while it went online.
 *              The device may well be online: wait for its first measurement.
 */
export type ProvisionErrorKind = "wifi" | "session" | "unclear";

/** Phase in which the error happened: before the credentials were handed to the device, or while/after. */
export type ProvisionPhase = "session" | "credentials";

export class ProvisionError extends Error {
  constructor(
    public kind: ProvisionErrorKind,
    message: string
  ) {
    super(message);
    this.name = "ProvisionError";
  }
}

// Android: ESPConstants.ProvisionFailureReason (AUTH_FAILED, NETWORK_NOT_FOUND);
// iOS: ESPProvisionError descriptions (authentication / network not found).
const WIFI_CREDENTIAL_ERROR = /AUTH_FAILED|NETWORK_NOT_FOUND|authentication|network not found/i;

// The session is gone or never worked: no credentials can have been applied.
const SESSION_ERROR = /not connected|E_DEVICE_DISCONNECTED|No ESP device|session|disconnect|connection timed out/i;

export function isWifiCredentialError(message: string): boolean {
  return WIFI_CREDENTIAL_ERROR.test(message);
}

export function classifyProvisionError(message: string, phase: ProvisionPhase): ProvisionErrorKind {
  if (isWifiCredentialError(message)) return "wifi";
  if (phase === "session") return "session";
  return SESSION_ERROR.test(message) && !/status/i.test(message) ? "session" : "unclear";
}

export function toProvisionError(err: unknown, phase: ProvisionPhase): ProvisionError {
  if (err instanceof ProvisionError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new ProvisionError(classifyProvisionError(message, phase), message);
}
