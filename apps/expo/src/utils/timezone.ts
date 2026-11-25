import * as SecureStore from "expo-secure-store";

import { fetchEnergyQueryMeasurements, fetchEnergyQueryProperties } from "@/api/energyquery";

let timeZone: string | null = null;

export const fetchTimeZone = async () => {
  timeZone = await SecureStore.getItemAsync("timeZone");

  // If unknown, try the server: sent with the weather zone; before 25-11-2026 with the heat signature.
  for (const queryType of TIME_ZONE_SOURCES) {
    if (timeZone) break;
    timeZone = await timeZoneFromServer(queryType);
  }
  if (timeZone) await SecureStore.setItemAsync("timeZone", timeZone);
};

const TIME_ZONE_SOURCES = ["weather-interpolation-location", "building-profile"];

async function timeZoneFromServer(queryType: string): Promise<string | null> {
  try {
    const properties = await fetchEnergyQueryProperties(queryType);
    const property = properties.find(p => p.name === "device_timezone__tmz");
    if (!property) return null;
    const measurements = await fetchEnergyQueryMeasurements(queryType, { property: property.id });
    return measurements[0]?.value ?? null;
  } catch {
    return null; // not answered (yet)
  }
}

export const getTimeZone = () => {
  return timeZone;
};
