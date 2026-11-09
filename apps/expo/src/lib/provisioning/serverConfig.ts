/*
 * Server choice during provisioning (needforheat-generic-firmware v3.4+, custom endpoint "nfh-config").
 * The app tells the device which server it uses itself (test or production, from API_URL), so a single
 * firmware build can be used with both. The device only accepts servers from its built-in list.
 */

export const SERVER_CONFIG_ENDPOINT = "nfh-config";

/** Host name from an API base URL, e.g. "https://api.tst.energiegedrag.nl/v3" -> "api.tst.energiegedrag.nl". */
export function hostFromApiUrl(apiUrl: string): string | null {
  const match = /^https?:\/\/([^/:?#]+)/i.exec(apiUrl.trim());
  return match ? match[1].toLowerCase() : null;
}

export function serverConfigRequest(host: string): string {
  return JSON.stringify({ server: host });
}

export type ServerConfigResult =
  | { kind: "ok"; server: string }
  | { kind: "refused"; error: string; allowed: string[] }
  | { kind: "unreadable"; reply: string };

/** Parse the device's reply: {"ok":true,"server":"..."} or {"ok":false,"error":"...","allowed":[...]}. */
export function parseServerConfigReply(reply: string): ServerConfigResult {
  try {
    const data = JSON.parse(reply);
    if (data?.ok === true && typeof data.server === "string") {
      return { kind: "ok", server: data.server };
    }
    if (data?.ok === false) {
      const allowed = Array.isArray(data.allowed) ? data.allowed.filter((h: unknown) => typeof h === "string") : [];
      return { kind: "refused", error: String(data.error ?? "refused"), allowed };
    }
  } catch {
    // fall through
  }
  return { kind: "unreadable", reply };
}
