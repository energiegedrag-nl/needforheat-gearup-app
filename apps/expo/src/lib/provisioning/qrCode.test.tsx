import { base32Decode, parseProvisioningQr } from "./qrCode";

// Same vectors as needforheat-generic-firmware test/host/provisioning_code_test.cpp (computed with Python).
describe("provisioning QR v2", () => {
  it("reads a 64-bit PoP", () => {
    expect(parseProvisioningQr("NFH:EENCWPCNLYASGRLHRGV4333G")).toEqual({
      ver: "v2",
      name: "1A2B-3C4D5E",
      pop: "81985529216486895",
      transport: "ble",
    });
  });
  it("reads a legacy 32-bit DAT", () => {
    expect(parseProvisioningQr("NFH:EENCWPCNLYAAAAAAXNAOMTJV")?.pop).toBe("3141592653");
  });
  it("accepts a typed code: lower case, dashes, 0 for O", () => {
    expect(parseProvisioningQr("nfh: eenc-wpcn-lyaa-aaaa-xna0-mtjv")?.name).toBe("1A2B-3C4D5E");
  });
  it("rejects a typo through the checksum", () => {
    expect(parseProvisioningQr("NFH:EENCWPCNLYAAAAAAXNAOMTJW")).toBeNull();
  });
  it("rejects other content", () => {
    expect(parseProvisioningQr("https://energiegedrag.nl")).toBeNull();
    expect(parseProvisioningQr("")).toBeNull();
  });
  it("decodes the RFC 4648 vector", () => {
    expect(String.fromCharCode(...(base32Decode("MZXW6YTBOI") ?? []))).toBe("foobar");
  });
});

describe("provisioning QR v1 (JSON)", () => {
  it("still reads the old format", () => {
    const json = '{\n"ver":"v1",\n"name":"1A2B-3C4D5E",\n"pop":"3141592653",\n"transport":"ble"\n}';
    expect(parseProvisioningQr(json)).toEqual({ ver: "v1", name: "1A2B-3C4D5E", pop: "3141592653", transport: "ble" });
  });
  it("rejects incomplete JSON", () => {
    expect(parseProvisioningQr('{"name":"x"}')).toBeNull();
  });
});
