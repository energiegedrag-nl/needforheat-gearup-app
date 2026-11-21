import { useState } from "react";

import { ProvisionErrorKind, toProvisionError } from "@/lib/provisioning/provisionError";
import { provision } from "@/utils/espProvisioning";
import { withTimeout } from "@/utils/withTimeout";

export default function useProvisionDevice() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorKind, setErrorKind] = useState<ProvisionErrorKind | null>(null);
  const isSuccess = status === "success" && !isLoading;

  // No wifiNetworks invalidation after success: the Wi-Fi screen is still mounted under this one, so it would scan
  // again over Bluetooth while the device has already closed the connection, and after the retries show
  // "error loading Wi-Fi networks" over a pairing that went fine. The Wi-Fi screen scans anew when it opens.

  const provisionDevice = (networkName: string, password?: string) => {
    resetState();

    // Safety net: provision() has its own time-outs per phase (10 s + 45 s); never leave the user waiting longer.
    withTimeout(60, provision(networkName, password))
      .then(result => setStatus(result))
      .catch(onProvisioningError)
      .finally(() => setIsLoading(false));
  };

  const onProvisioningError = (err: unknown) => {
    const error = toProvisionError(err, "credentials");
    setStatus(error.message);
    setErrorKind(error.kind);
    setIsError(true);
  };

  const resetState = () => {
    setIsLoading(true);
    setIsError(false);
    setErrorKind(null);
    setStatus(null);
  };

  const isWifiError = isError && errorKind === "wifi";

  return {
    provisionDevice,
    isLoading,
    isError,
    isSuccess,
    isWifiError,
    errorKind,
    status,
  };
}
