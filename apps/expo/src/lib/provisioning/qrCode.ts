/*
 * Provisioning QR codes of NeedForHeat devices.
 *
 * v2 (generic firmware v3.4+): "NFH:" + 24 Base32 characters (RFC 4648, no padding) encoding 15 bytes:
 *   [0] 0x21 (format 2, flag bit 0 = BLE) · [1..2] device type hash · [3..5] MAC tail · [6..13] PoP (uint64 BE)
 *   · [14] CRC-8 (poly 0x07) of bytes 0..13. Specification: needforheat-generic-firmware
 *   include/util/provisioning_code.hpp.
 * v1: JSON {"ver":"v1","name":"…","pop":"…","transport":"ble"}.
 *
 * Typed codes are accepted too: case-insensitive, spaces and dashes ignored, 0/1/8 read as O/I/B.
 */
import { SensorQrCode } from "@/types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function crc8(bytes: number[]): number {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export function base32Decode(text: string): number[] | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) return null;
    buffer = ((buffer << 5) | value) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return bytes;
}

function hex(value: number, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, "0");
}

function parseV2(data: string): SensorQrCode | null {
  let code = data.trim().toUpperCase().replace(/[\s-]/g, "");
  code = code.replace(/^NFH:(\/\/)?/, "");
  code = code.replace(/0/g, "O").replace(/1/g, "I").replace(/8/g, "B");
  if (code.length !== 24) return null;
  const bytes = base32Decode(code);
  if (!bytes || bytes.length !== 15) return null;
  if (bytes[0] >> 4 !== 2 || (bytes[0] & 0x01) !== 1) return null;
  if (crc8(bytes.slice(0, 14)) !== bytes[14]) return null;
  let pop = BigInt(0);
  for (const b of bytes.slice(6, 14)) {
    pop = pop * BigInt(256) + BigInt(b);
  }
  const name = `${hex((bytes[1] << 8) | bytes[2], 4)}-${hex(bytes[3], 2)}${hex(bytes[4], 2)}${hex(bytes[5], 2)}`;
  return { ver: "v2", name, pop: pop.toString(), transport: "ble" };
}

function parseV1(data: string): SensorQrCode | null {
  try {
    const qr = JSON.parse(data);
    if (typeof qr?.name === "string" && qr.name && qr?.pop !== undefined && qr?.transport === "ble") {
      return { ver: String(qr.ver ?? "v1"), name: qr.name, pop: String(qr.pop), transport: "ble" };
    }
  } catch {
    // not JSON
  }
  return null;
}

/** The device data in a scanned (or typed) provisioning code, or null if it is not one. */
export function parseProvisioningQr(data: string): SensorQrCode | null {
  return data.trim().startsWith("{") ? parseV1(data) : parseV2(data);
}
