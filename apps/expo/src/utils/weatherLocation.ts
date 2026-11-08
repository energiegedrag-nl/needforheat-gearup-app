/**
 * Weather interpolation location with privacy: the home location is shifted by random noise and
 * then rounded to the centre of an H3 cell of resolution 5 (about 250 km²).
 *
 * A re-identification analysis with AnonyMate (anonymate-nl/anonymate, module weerspoor) showed
 * that the weather series of a published location can point back to it. Level 5 after Gaussian
 * noise with σ ≈ 10 km gives more accurate weather than the earlier level 4 (about 1,770 km²)
 * without noise, and is just as safe.
 *
 * The noise offset is drawn once per installation and stored, so answering the query again does
 * not give new samples around the home that could be averaged out.
 */
import * as SecureStore from "expo-secure-store";
import { cellToLatLng, latLngToCell } from "h3-js";

export const WEATHER_H3_RESOLUTION = 5;
export const WEATHER_NOISE_SIGMA_KM = 10;
const OFFSET_KEY = "weatherLocationNoiseOffset";
const KM_PER_DEGREE_LAT = 111.32;

export type NoiseOffset = { north_km: number; east_km: number };

/** Two independent standard normal values (Box-Muller). */
function gaussianPair(): [number, number] {
  const u = 1 - Math.random(); // (0, 1]
  const v = Math.random();
  const r = Math.sqrt(-2 * Math.log(u));
  return [r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v)];
}

/** The stored noise offset of this installation; drawn and stored on first use. */
export async function getNoiseOffset(): Promise<NoiseOffset> {
  try {
    const stored = await SecureStore.getItemAsync(OFFSET_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Number.isFinite(parsed?.north_km) && Number.isFinite(parsed?.east_km)) return parsed;
    }
  } catch {
    // fall through and draw a new offset
  }
  const [n, e] = gaussianPair();
  const offset = { north_km: n * WEATHER_NOISE_SIGMA_KM, east_km: e * WEATHER_NOISE_SIGMA_KM };
  try {
    await SecureStore.setItemAsync(OFFSET_KEY, JSON.stringify(offset));
  } catch {
    // not stored: still use it for this answer
  }
  return offset;
}

/** H3 cell (resolution 5) of the home location after applying the noise offset. */
export function weatherCell(latitude: number, longitude: number, offset: NoiseOffset): string {
  const lat = latitude + offset.north_km / KM_PER_DEGREE_LAT;
  const lon = longitude + offset.east_km / (KM_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180));
  return latLngToCell(lat, lon, WEATHER_H3_RESOLUTION);
}

/** Centre [lat, lon] of the weather cell: the value that is sent to the server. */
export function weatherCellCentre(cell: string): [number, number] {
  return cellToLatLng(cell);
}
