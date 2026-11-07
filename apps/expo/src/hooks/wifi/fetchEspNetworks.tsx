import { WifiEntry } from "@/types";
import { scanWifiList } from "@/utils/espProvisioning";
import { withTimeout } from "@/utils/withTimeout";

export const fetchEspNetworks: () => Promise<WifiEntry[]> = () => withTimeout(30, scanWifiList());
