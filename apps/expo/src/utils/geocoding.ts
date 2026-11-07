/*
 * Address search with the PDOK Locatieserver (Dutch government, open data from the BAG,
 * no API key): https://api.pdok.nl/bzk/locatieserver/search/v3_1/
 * Replaces the Google Geocoding API (react-native-geocoding). Covers addresses in the Netherlands,
 * which is what the building profile needs.
 */
const BASE_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
const FIELDS = "straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,centroide_ll";

type PdokAddress = {
  straatnaam: string;
  huisnummer: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode: string;
  woonplaatsnaam: string;
  centroide_ll: string; // "POINT(lon lat)"
};

async function query(path: string): Promise<PdokAddress | null> {
  const response = await fetch(`${BASE_URL}/${path}&fq=type:adres&rows=1&fl=${FIELDS}`);
  if (!response.ok) {
    throw new Error(`PDOK Locatieserver: HTTP ${response.status}`);
  }
  const body = await response.json();
  return body?.response?.docs?.[0] ?? null;
}

function toCoordinates(address: PdokAddress) {
  const match = address.centroide_ll.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  return match ? { latitude: Number(match[2]), longitude: Number(match[1]) } : null;
}

/**
 * Format like the previous Google results ("Campus 2K, 8017 CA Zwolle, Nederland"),
 * so NL_ADDRESS_REGEX and the building profile keep parsing street, number and postal code.
 */
export function formatAddress(address: PdokAddress): string {
  const pc = address.postcode.replace(/^(\d{4})\s?([A-Z]{2})$/i, "$1 $2").toUpperCase();
  const addition = address.huisnummertoevoeging ? ` ${address.huisnummertoevoeging}` : "";
  return `${address.straatnaam} ${address.huisnummer}${address.huisletter ?? ""}${addition}, ${pc} ${address.woonplaatsnaam}, Nederland`;
}

/** Address text -> coordinates and the normalised address, or null when nothing is found. */
export async function geocodeAddress(text: string) {
  const address = await query(`free?q=${encodeURIComponent(text)}`);
  if (!address) return null;
  const coordinates = toCoordinates(address);
  return coordinates ? { ...coordinates, address: formatAddress(address) } : null;
}

/** Coordinates -> nearest address, or null. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const address = await query(`reverse?lat=${latitude}&lon=${longitude}`);
  return address ? formatAddress(address) : null;
}
