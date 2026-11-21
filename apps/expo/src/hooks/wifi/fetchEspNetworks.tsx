import { WifiEntry } from "@/types";
import { scanWifiList } from "@/utils/espProvisioning";
import { withTimeout } from "@/utils/withTimeout";

export const fetchEspNetworks: () => Promise<WifiEntry[]> = () => withTimeout(60, scanWifiList()) // a scan, and possibly a new connection and a second scan;
