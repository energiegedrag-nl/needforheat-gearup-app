import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, useTheme } from "@rneui/themed";
import { format } from "date-fns";
import { enUS, nl } from "date-fns/locale";
import { useEffect } from "react";

import DelayedButton from "@/components/common/DelayedButton";
import { StatusMessage } from "@/components/common/StatusMessage";
import Timeline from "@/components/common/Timeline";
import Box from "@/components/elements/Box";
import useReceivingMeasurements from "@/hooks/device/useReceivingMeasurements";
import useProvisionDevice from "@/hooks/provision/useProvisionDevice";
import useTranslation from "@/hooks/translation/useTranslation";
import { useDisableBackButton } from "@/hooks/useDisableBackButton";
import useStoredWifiNetworks from "@/hooks/wifi/useStoredWifiNetworks";
import { HomeStackParamList } from "@/types/navigation";

type ProvisionScreenProps = NativeStackScreenProps<HomeStackParamList, "ProvisionScreen">;

export default function ProvisionScreen({ navigation, route }: ProvisionScreenProps) {
  const { theme } = useTheme();
  const { device, network, password, proofOfPossession, device_TypeName, normalName } = route.params;
  const { t, resolvedLanguage } = useTranslation();
  const {
    provisionDevice,
    isLoading: isProvisioning,
    isError: isProvisioningError,
    isSuccess: isProvisioningSuccess,
    isWifiError,
    errorKind,
  } = useProvisionDevice();

  const {
    latestMeasurement,
    fetchData: fetchMeasuringData,
    isSuccess: isReceivingMeasurements,
    isError: isReceivingMeasurementsError,
    isLoading: isReceivingMeasurementsLoading,
  } = useReceivingMeasurements(device.deviceName, 24); // 2 minutes, every 5 s

  // An unclear error after sending the credentials usually means the Bluetooth session ended while the device went
  // online: then wait for the heartbeat as after success. A session error (nothing reached the device) or a Wi-Fi
  // error (the device restarts) is shown at once, without waiting for a measurement that cannot come (21-11).
  const isUnclearProvisioningError = isProvisioningError && errorKind === "unclear";
  const isSessionError = isProvisioningError && errorKind === "session";
  const showProvisioningError =
    isProvisioningError && !isReceivingMeasurements && !(isUnclearProvisioningError && isReceivingMeasurementsLoading);

  const { storeWifiNetwork } = useStoredWifiNetworks();

  const showBackButton = isReceivingMeasurementsError || showProvisioningError || isReceivingMeasurements;

  const timelineData = [
    {
      title: t("screens.home_stack.provision.timeline.steps.connecting.title"),
      description: t("screens.home_stack.provision.timeline.steps.connecting.description", {
        device_name: normalName,
      }),
      finished: true,
    },
    {
      title: t("screens.home_stack.provision.timeline.steps.activating.title"),
      description: t("screens.home_stack.provision.timeline.steps.activating.description", {
        device_name: normalName,
      }),
      finished: true,
    },
    {
      title: t("screens.home_stack.provision.timeline.steps.provisioning.title"),
      description: t("screens.home_stack.provision.timeline.steps.provisioning.description", {
        network_name: network.name,
      }),
      finished: isProvisioningSuccess || isReceivingMeasurements,
      loading: isProvisioning,
      timingKey: "provision.wifi",
      error: showProvisioningError,
    },
    {
      title: t("screens.home_stack.provision.timeline.steps.receiving.title"),
      description: t("screens.home_stack.provision.timeline.steps.receiving.description", {
        device_name: normalName,
      }),
      finished: isReceivingMeasurements,
      loading: isReceivingMeasurementsLoading,
      timingKey: "provision.first_measurement",
      error: isReceivingMeasurementsError,
    },
  ];

  const onLeave = () => navigation.navigate("HomeScreen");

  const onRetry = () => {
    navigation.navigate("SearchDeviceScreen", {
      deviceName: device.deviceName,
      proofOfPossession,
      device_TypeName,
      normalName,
    });
  };

  const locales: Record<string, Locale> = {
    "en-US": enUS,
    "nl-NL": nl,
  };

  function formatDateAndTime(date?: Date) {
    const inputDate = date || new Date();
    const locale = locales[resolvedLanguage] || enUS;

    let formatString = "cccccc, LLL d, yyy HH:mm";

    if (resolvedLanguage === "nl-NL") {
      formatString = "cccccc d LLL yyy HH:mm";
    }

    return format(inputDate, formatString, { locale });
  }

  useEffect(() => {
    if (isProvisioningSuccess) {
      storeWifiNetwork({ ...network, password });
      fetchMeasuringData();
    }
  }, [isProvisioningSuccess]);

  useEffect(() => {
    if (isUnclearProvisioningError) {
      fetchMeasuringData();
    }
  }, [isUnclearProvisioningError]);

  useEffect(() => {
    provisionDevice(network.name, password);
  }, []);

  // Disable going back to force the user to use the buttons
  useDisableBackButton(true);

  return (
    <Box padded style={{ flex: 1, justifyContent: "space-between" }}>
      <Box fullWidth>
        <Timeline items={timelineData} />

        <Box padded>
          {isReceivingMeasurements ? (
            <StatusMessage
              label={t("screens.home_stack.provision.success.title")}
              message={t("screens.home_stack.provision.success.message", {
                date: latestMeasurement ? formatDateAndTime(latestMeasurement) : formatDateAndTime(),
              })}
            />
          ) : isWifiError && showProvisioningError ? (
            <StatusMessage
              label={t("screens.home_stack.provision.wifi_error.title")}
              message={t("screens.home_stack.provision.wifi_error.message")}
            />
          ) : isSessionError && showProvisioningError ? (
            <StatusMessage
              label={t("screens.home_stack.provision.session_error.title")}
              message={t("screens.home_stack.provision.session_error.message")}
            />
          ) : showProvisioningError ? (
            <StatusMessage
              label={t("screens.home_stack.provision.provisioning_error.title")}
              message={t("screens.home_stack.provision.provisioning_error.message")}
            />
          ) : isReceivingMeasurementsError ? (
            <StatusMessage
              label={t("screens.home_stack.provision.measurements_error.title")}
              message={t("screens.home_stack.provision.measurements_error.message")}
            />
          ) : null}
        </Box>
      </Box>
      <Box style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end" }}>
        {showBackButton && (
          <>
            {showProvisioningError && (
              <DelayedButton
                containerStyle={{ width: "100%" }}
                timeout={10}
                title={t("common.retry")}
                onPress={onRetry}
              />
            )}
            <Button
              title={t("common.back_to_home") as string}
              containerStyle={{ width: "100%", marginTop: theme.spacing.md }}
              onPress={onLeave}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
