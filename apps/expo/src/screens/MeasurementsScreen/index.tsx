/* eslint-disable @typescript-eslint/ban-ts-comment */
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Text, makeStyles, useTheme } from "@rneui/themed";
import { useContext, useEffect, useRef, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import DeviceGraph from "./_deviceGraph";

import RefreshStatus from "@/components/common/RefreshStatus";
import StatusIndicator from "@/components/common/StatusIndicator";
import DeviceBottomSheet from "@/components/common/bottomSheets/DeviceBottomSheet";
import PropertyBottomSheet from "@/components/common/bottomSheets/PropertyBottomSheet";
import Box from "@/components/elements/Box";
import Screen from "@/components/elements/Screen";
import useDevices from "@/hooks/device/useDevices";
import useTranslation from "@/hooks/translation/useTranslation";
import { UserContext } from "@/providers/UserProvider";
import { DataSourceType, Property } from "@/types/api";
import { capitalizeFirstLetter, getManualUrl } from "@/utils/tools";

export default function MeasurementsScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { t, resolvedLanguage } = useTranslation();
  const { isLoading } = useContext(UserContext);
  const { user } = useContext(UserContext);

  const deviceBottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const propertyBottomSheetRef = useRef<BottomSheetModalMethods>(null);

  const devicesQuery = useDevices();
  const { data: devices } = devicesQuery;
  const queryClient = useQueryClient();
  // Measurements are fetched per chart; refreshing shows here as for the home screen.
  const fetchingMeasurements = useIsFetching(["measurementsSchema"]) > 0;
  const isFetchingAny = fetchingMeasurements || devicesQuery.isFetching;
  const refreshAll = () => {
    devicesQuery.refetch();
    queryClient.refetchQueries(["measurementsSchema"], { type: "active" });
  };
  const [deviceIdentifierName, setDeviceIdentifierName] = useState<string | undefined>();
  const [fetchedData, setFetchedData] = useState(null);

  const [displayName, setDisplayName] = useState<string | null>(null);

  const hasMultipleDevices = (devices?.length ?? 0) > 1;

  let foundDataSource;
  if (user?.campaign?.data_source_list) {
    foundDataSource = user?.campaign.data_source_list?.items.find(data_source => {
      return devices && devices[0] && devices[0].type && data_source.item.Name === devices[0].type;
    });
  }

  const CompleteURL = devices && devices.length > 0 ? getManualUrl(foundDataSource as DataSourceType) : "";
  const deviceDropdownDisabled = !hasMultipleDevices;

  const [property, setProperty] = useState<Property | undefined>();

  useEffect(() => {
    if (devices?.length) {
      setDeviceIdentifierName(devices[0].name);
    }
  }, []);

  useEffect(() => {
    if (CompleteURL) {
      fetch(CompleteURL)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          setFetchedData(data);
        })
        .catch(error => {
          console.error(`Error fetching data measurementsscreen: ${CompleteURL}:`, error);
        });
    }
  }, [CompleteURL, resolvedLanguage]);

  if (isLoading) {
    return (
      <Screen>
        <Box style={{ flex: 1 }} padded center>
          <StatusIndicator isLoading />
        </Box>
      </Screen>
    );
  }

  return (
    <Screen>
      <RefreshStatus fetching={isFetchingAny} updatedAt={devicesQuery.dataUpdatedAt} failed={devicesQuery.isError} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isFetchingAny}
            onRefresh={refreshAll}
            tintColor={theme.colors.tint}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Box style={{ flex: 1 }} padded>
          <TouchableOpacity
            disabled={deviceDropdownDisabled}
            style={{
              ...styles.dropdown,
              ...(deviceDropdownDisabled ? { opacity: 0.5 } : null),
              marginBottom: 2,
            }}
            onPress={() => deviceBottomSheetRef.current?.present()}
          >
            <Text>
              {displayName === null
                ? capitalizeFirstLetter(fetchedData?.[resolvedLanguage]) || t("screens.measurements.graph.no_devices")
                : capitalizeFirstLetter(displayName) || t("screens.measurements.graph.no_devices")}
            </Text>
            <Icon name="chevron-down" size={16} color={theme.colors.grey2} />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={deviceDropdownDisabled}
            style={[styles.dropdown, deviceDropdownDisabled ? { opacity: 0.5 } : null]}
            onPress={() => propertyBottomSheetRef.current?.present()}
          >
            <Text style={{ fontStyle: "italic" }}>
              {property !== undefined
                ? t(`hooks.property_translation.${property.name}`, { defaultValue: property.name })
                : null}
            </Text>
            <Icon name="chevron-down" size={16} color={theme.colors.grey2} />
          </TouchableOpacity>

          {/* Data of last 14, 30 & 90 days */}
          {deviceIdentifierName ? (
            <>
              <DeviceGraph deviceName={deviceIdentifierName} property={property} />
              <DeviceGraph deviceName={deviceIdentifierName} property={property} dayRange={30} />
              <DeviceGraph deviceName={deviceIdentifierName} property={property} dayRange={90} />
            </>
          ) : null}
          <DeviceBottomSheet
            bottomSheetRef={deviceBottomSheetRef}
            deviceName={deviceIdentifierName}
            onDeviceIdentifier={setDisplayName}
            onDisplayName={setDeviceIdentifierName}
          />

          {deviceIdentifierName ? (
            <>
              <PropertyBottomSheet
                bottomSheetRef={propertyBottomSheetRef}
                deviceName={deviceIdentifierName}
                propertyId={property?.id}
                onPropertySelect={setProperty}
              />
            </>
          ) : null}
        </Box>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(theme => ({
  dropdown: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
  },
}));
