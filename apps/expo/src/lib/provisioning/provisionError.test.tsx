import { classifyProvisionError, isWifiCredentialError, toProvisionError, ProvisionError } from "./provisionError";

describe("classifyProvisionError", () => {
  it("recognises a wrong password or a missing network, whatever the phase", () => {
    expect(classifyProvisionError("AUTH_FAILED", "credentials")).toBe("wifi");
    expect(classifyProvisionError("NETWORK_NOT_FOUND", "credentials")).toBe("wifi");
    expect(classifyProvisionError("Wi-Fi authentication failed", "credentials")).toBe("wifi");
    expect(isWifiCredentialError("Timed out after 30 seconds.")).toBe(false);
  });

  it("treats anything before the credentials as a session problem (21-11: stale session after a restart)", () => {
    expect(classifyProvisionError("Timed out after 10 seconds.", "session")).toBe("session");
    expect(classifyProvisionError("Unknown error", "session")).toBe("session");
  });

  it("separates a lost connection from an unclear end after the credentials", () => {
    // After the credentials a lost connection usually means the device went online: wait for its measurement.
    expect(classifyProvisionError("Device is not connected.", "credentials")).toBe("unclear");
    expect(classifyProvisionError("Failed to create session", "credentials")).toBe("session");
    // The device ended the Bluetooth session while reading the Wi-Fi status: it may well be online.
    expect(classifyProvisionError("Failed to get wifi status (session ended)", "credentials")).toBe("unclear");
    expect(classifyProvisionError("Timed out after 30 seconds.", "credentials")).toBe("unclear");
  });

  it("keeps an existing ProvisionError", () => {
    const e = new ProvisionError("session", "x");
    expect(toProvisionError(e, "credentials")).toBe(e);
    expect(toProvisionError(new Error("AUTH_FAILED"), "credentials").kind).toBe("wifi");
  });
});
