import { useState } from "react";

import { provision } from "@/utils/espProvisioning";
import { withTimeout } from "@/utils/withTimeout";

export default function useProvisionDevice() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const isSuccess = status === "success" && !isLoading;

  // No wifiNetworks invalidation after success: the Wi-Fi screen is still mounted under this one, so it would scan
  // again over Bluetooth while the device has already closed the connection, and after the retries show
  // "error loading Wi-Fi networks" over a pairing that went fine. The Wi-Fi screen scans anew when it opens.

  const provisionDevice = (networkName: string, password?: string) => {
    resetState();

    // Asume that after 30 seconds the provisioning proces has failed,
    // this is to prevent the user from being stuck on the provisioning screen
    withTimeout(30, provision(networkName, password))
      .then(result => setStatus(result))
      .catch(onProvisioningError)
      .finally(() => setIsLoading(false));
  };

  const onProvisioningError = (err: unknown) => {
    setStatus(err instanceof Error ? err.message : String(err));
    setIsError(true);
  };

  const resetState = () => {
    setIsLoading(true);
    setIsError(false);
    setStatus(null);
  };

  const isWifiError = status
    ? status.toLowerCase().includes("wifi") && status.toLowerCase().includes("failure")
    : false;

  return {
    provisionDevice,
    isLoading,
    isError,
    isSuccess,
    isWifiError,
    status,
  };
}
