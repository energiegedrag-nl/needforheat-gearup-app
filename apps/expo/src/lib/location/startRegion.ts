import Geolocation from "@react-native-community/geolocation";

export type Position = { latitude: number; longitude: number };

/** Where the map starts when the phone does not know where it is. */
export const NL_CENTRE: Position = { latitude: 52.501076707906, longitude: 6.079587294142308 };

/** About one weather zone (H3 level 5, ~20 km across): the view of the weather zone after sending. */
export const ZONE_VIEW = { latitudeDelta: 0.2, longitudeDelta: 0.3 };

/** A few streets: close enough to see which house the pin is on. */
export const STREET_VIEW = { latitudeDelta: 0.003, longitudeDelta: 0.005 };

const getPosition = (enableHighAccuracy: boolean, timeout: number) =>
  new Promise<Position | null>(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      // A fix of up to ten minutes old is good enough for a house or a weather zone, and comes at once.
      { enableHighAccuracy, timeout, maximumAge: 10 * 60 * 1000 }
    );
  });

/**
 * The phone's position, or null when it has none (no permission, location off, no fix in time). Never
 * rejects. First the quick network/cached fix, then GPS.
 */
export async function currentPosition(): Promise<Position | null> {
  return (await getPosition(false, 8000)) ?? (await getPosition(true, 15000));
}
