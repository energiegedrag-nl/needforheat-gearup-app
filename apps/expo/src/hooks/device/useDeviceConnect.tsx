import { useState } from "react";

import { BleDeviceType } from "@/types";
import { connectBleDevice } from "@/utils/espProvisioning";

type useDeviceConnectOptions = {
  device: BleDeviceType;
  proofOfPossession: string;
};

type onError = (error?: string) => void;

export default function useDeviceConnect({ device, proofOfPossession }: useDeviceConnectOptions) {
  const [isConnected, setIsConnected] = useState(false);

  async function connectToDevice(callback: () => void, onError?: onError) {
    console.log("connectToDevice: " + device.deviceName);
    setIsConnected(false);

    try {
      // Resolves once the BLE session (security 1 + proof of possession) is established.
      await connectBleDevice(device.deviceName, proofOfPossession);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      console.log(`onDeviceConnectionFailed: ${device.deviceName} failed to connect (${message})`);
      onError?.(message);
      return;
    }

    setIsConnected(true);
    console.log(`onDeviceConnected: ${device.deviceName} connected`);
    callback();
  }

  return {
    isConnected,
    connectToDevice,
  };
}
