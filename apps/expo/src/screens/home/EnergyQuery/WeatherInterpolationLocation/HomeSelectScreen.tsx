import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Icon, makeStyles, useTheme, Text } from "@rneui/themed";
import { openSettings } from "expo-linking";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";

import Box from "@/components/elements/Box";
import OpenMap, { OpenMapRef, Region } from "@/components/map/OpenMap";
import usePreciseLocationPermission from "@/hooks/location/usePreciseLocationPermission";
import useTranslation from "@/hooks/translation/useTranslation";
import { currentPosition, NL_CENTRE, ZONE_VIEW } from "@/lib/location/startRegion";
import { UserLocation } from "@/types/energyquery";
import { HomeStackParamList } from "@/types/navigation";

type HomeSelectScreenProps = NativeStackScreenProps<HomeStackParamList, "HomeSelectScreen">;

export default function HomeSelectScreen({ navigation, route }: HomeSelectScreenProps) {
  const { dataSource } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const style = useStyles();
  const refMap = useRef<OpenMapRef>(null);
  const [, setLocationPermission] = useState<boolean>(false);
  // Where the map starts: the phone's position when it has one, else the middle of the country; at about the
  // size of a weather zone. The map is shown once that is known, so it does not start somewhere else first.
  const [location, setLocation] = useState<UserLocation>({ ...NL_CENTRE, ...ZONE_VIEW });
  const [mapReady, setMapReady] = useState<boolean>(false);

  useEffect(() => {
    const start = async () => {
      let permission = await checkPreciseLocationPermission();
      if (!permission) {
        try {
          await requestPreciseLocationPermission();
          permission = await checkPreciseLocationPermission();
        } catch {
          permission = false;
        }
      }
      setLocationPermission(permission);
      const here = permission ? await currentPosition() : null;
      if (here) {
        setLocation({ ...here, ...ZONE_VIEW });
      }
      setMapReady(true);
    };
    start();
  }, []);

  const onContinue = () => {
    navigation.navigate("WeatherLocationResultScreen", { location, dataSource });
  };

  //Location permission
  const { requestPreciseLocationPermission, checkPreciseLocationPermission } = usePreciseLocationPermission();

  const onRequestPreciseLocationError = (err: string) => {
    console.log("onRequestPermissionError", err);
    Alert.alert("Error", err, [
      {
        text: t("screens.home_stack.search_device.open_settings") as string,
        onPress: () => {
          // eslint-disable-next-line node/handle-callback-err, @typescript-eslint/no-empty-function
          openSettings().catch(e => {});
        },
      },
    ]);
  };

  const askForPreciseLocationPermission = async (shouldPester = true): Promise<null> => {
    let permission = await checkPreciseLocationPermission();
    setLocationPermission(permission);

    return new Promise((resolve, reject) => {
      if (!permission) {
        const title = t("screens.home_stack.energy_query.location_permission.alert.title");
        const message = t("screens.home_stack.energy_query.location_permission.alert.message");

        const requestPermission = async () => {
          try {
            await requestPreciseLocationPermission();
            permission = await checkPreciseLocationPermission();
            setLocationPermission(permission);
            if (permission) {
              onPressMyLocation();
            }
            resolve(null);
          } catch (err: unknown) {
            if (shouldPester) {
              const errorMsg =
                err instanceof Error
                  ? err.message
                  : t("screens.home_stack.energy_query.location_permission.errors.request_failed");
              onRequestPreciseLocationError(errorMsg);
            }
            reject(err);
          }
        };

        if (shouldPester) {
          Alert.alert(title, message, [
            {
              text: t("screens.home_stack.energy_query.location_permission.alert.button") as string,
              onPress: requestPermission,
            },
          ]);
        } else {
          requestPermission();
        }
      } else {
        resolve(null);
      }
    });
  };

  //Location permission END

  const onPressMyLocation = async () => {
    if (await checkPreciseLocationPermission()) {
      const here = await currentPosition();
      if (here) {
        const region = { ...here, ...ZONE_VIEW };
        setLocation(region);
        refMap.current?.animateToRegion(region, 300);
      }
    } else {
      await askForPreciseLocationPermission();
      onPressMyLocation();
    }
  };

  const handleRegionChangeCompleted = (newRegion: Region) => {
    //Fixes moving the map on its own
    const threshold = 0.00001;

    const latDifference = Math.abs(newRegion.latitude - location.latitude);
    const lonDifference = Math.abs(newRegion.longitude - location.longitude);

    if (latDifference > threshold || lonDifference > threshold) {
      setLocation(newRegion);
    }
  };

  const handleZoomIn = useCallback(() => {
    setLocation(prevRegion => ({
      ...prevRegion,
      latitudeDelta: prevRegion.latitudeDelta / 2,
      longitudeDelta: prevRegion.longitudeDelta / 2,
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setLocation(prevRegion => ({
      ...prevRegion,
      latitudeDelta: prevRegion.latitudeDelta * 2,
      longitudeDelta: prevRegion.longitudeDelta * 2,
    }));
  }, []);

  return (
    <>
      <Box padded style={{ flex: 1 }}>
        <View style={{ width: "100%" }}>
          <Text style={style.subtitle}>{t("screens.home_stack.energy_query.homeselect_screen.subtitle")}</Text>
        </View>
        <View style={style.mapcontainer}>
          {mapReady ? (
            <OpenMap
              ref={refMap}
              region={location}
              showsUserLocation
              pitchEnabled={false}
              style={style.map}
              onRegionChangeComplete={handleRegionChangeCompleted}
            />
          ) : (
            <ActivityIndicator size="large" color={theme.colors.primary} style={style.map} />
          )}
          <View style={style.zoomControlsiOS}>
            <TouchableOpacity onPress={handleZoomIn} style={style.zoomButton}>
              <Icon name="add" color={theme.colors.onPrimary} size={30} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleZoomOut} style={style.zoomButton}>
              <Icon name="remove" color={theme.colors.onPrimary} size={30} />
            </TouchableOpacity>
          </View>
          <View pointerEvents="none">
            <Icon name="location-pin" color={theme.colors.error} size={40} style={{ marginBottom: 30 }} />
          </View>
          <View style={style.myLocationiOS}>
            <TouchableOpacity onPress={onPressMyLocation}>
              <Icon name="my-location" color={theme.colors.onPrimary} size={40} />
            </TouchableOpacity>
          </View>
        </View>
        <Box style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
          <Button
            containerStyle={{ flex: 1, marginLeft: theme.spacing.md }}
            title={t("screens.home_stack.energy_query.homeselect_screen.button") as string}
            color="primary"
            onPress={onContinue}
            icon={{
              name: "location-outline",
              type: "ionicon",
              color: theme.colors.onPrimary,
            }}
          />
        </Box>
      </Box>
    </>
  );
}

const useStyles = makeStyles(theme => ({
  mapcontainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  zoomControlsiOS: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "column",
  },
  zoomButton: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  myLocationiOS: {
    position: "absolute",
    bottom: 30,
    left: 10,
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  myLocationAndroid: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  subtitle: {
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
}));
