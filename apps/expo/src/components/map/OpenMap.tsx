import {
  Camera,
  CameraRef,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import { PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";

/*
 * Map component on MapLibre (BSD-2) with OpenStreetMap data, replacing react-native-maps
 * with Google Maps. No API key, no Google services.
 * Tiles and style: OpenFreeMap (open source, OpenMapTiles schema; attribution is shown
 * in the map as the style requires).
 * The props follow the subset of react-native-maps the app used (region with deltas,
 * onRegionChangeComplete, animateToRegion), so the screens barely changed.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type OpenMapRef = {
  animateToRegion: (region: Region, duration?: number) => void;
};

type OpenMapProps = PropsWithChildren<{
  /** Visible area. When it changes (and the map did not report it itself) the camera moves there. */
  region: Region;
  onRegionChangeComplete?: (region: Region) => void;
  showsUserLocation?: boolean;
  pitchEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

const toBounds = (region: Region) => ({
  ne: [region.longitude + region.longitudeDelta / 2, region.latitude + region.latitudeDelta / 2],
  sw: [region.longitude - region.longitudeDelta / 2, region.latitude - region.latitudeDelta / 2],
});

const sameRegion = (a: Region | null, b: Region) =>
  !!a &&
  Math.abs(a.latitude - b.latitude) < 1e-7 &&
  Math.abs(a.longitude - b.longitude) < 1e-7 &&
  Math.abs(a.latitudeDelta - b.latitudeDelta) < 1e-7 &&
  Math.abs(a.longitudeDelta - b.longitudeDelta) < 1e-7;

const OpenMap = forwardRef<OpenMapRef, OpenMapProps>(function OpenMap(
  { region, onRegionChangeComplete, showsUserLocation, pitchEnabled = false, style, children },
  ref
) {
  const cameraRef = useRef<CameraRef>(null);
  // Last region reported by the map itself; echoing it back must not move the camera again.
  const reportedRegion = useRef<Region | null>(null);
  const initialRegion = useRef(region);

  const moveTo = (target: Region, duration = 300) =>
    cameraRef.current?.setCamera({ bounds: toBounds(target), animationDuration: duration });

  useImperativeHandle(ref, () => ({ animateToRegion: (target, duration) => moveTo(target, duration) }), []);

  useEffect(() => {
    if (!sameRegion(reportedRegion.current, region)) {
      moveTo(region);
    }
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  return (
    <MapView
      style={style}
      mapStyle={MAP_STYLE_URL}
      pitchEnabled={pitchEnabled}
      rotateEnabled={false}
      attributionEnabled
      logoEnabled={false}
      onRegionDidChange={feature => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const [ne, sw] = feature.properties.visibleBounds;
        const next: Region = {
          latitude,
          longitude,
          latitudeDelta: Math.abs(ne[1] - sw[1]),
          longitudeDelta: Math.abs(ne[0] - sw[0]),
        };
        reportedRegion.current = next;
        onRegionChangeComplete?.(next);
      }}
    >
      <Camera ref={cameraRef} defaultSettings={{ bounds: toBounds(initialRegion.current) }} />
      {showsUserLocation ? <UserLocation /> : null}
      {children}
    </MapView>
  );
});

export default OpenMap;

type GeoJsonOverlayProps = {
  id?: string;
  geojson: GeoJSON.FeatureCollection | GeoJSON.Feature;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

/** Filled polygon with outline, replacement for react-native-maps' <Geojson>. */
export function GeoJsonOverlay({ id = "overlay", geojson, fillColor, strokeColor, strokeWidth = 1 }: GeoJsonOverlayProps) {
  return (
    <ShapeSource id={`${id}-source`} shape={geojson}>
      <FillLayer id={`${id}-fill`} style={{ fillColor: fillColor ?? "transparent" }} />
      <LineLayer
        id={`${id}-line`}
        style={{ lineColor: strokeColor ?? "#000000", lineWidth: strokeWidth, lineCap: "round", lineJoin: "round" }}
      />
    </ShapeSource>
  );
}
