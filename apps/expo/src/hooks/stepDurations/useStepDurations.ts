import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

import { updateExpected } from "@/lib/progress/progress";

const KEY = "stepDurations";

/**
 * How long steps took before on this phone (seconds, a moving average per step key), so a progress
 * bar can say how long a slow step will probably take. Kept on the phone only.
 */
export default function useStepDurations() {
  const [durations, setDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then(raw => raw && setDurations(JSON.parse(raw)))
      .catch(() => undefined);
  }, []);

  const record = useCallback((key: string, actual__s: number) => {
    setDurations(previous => {
      const next = { ...previous, [key]: updateExpected(previous[key], actual__s) };
      SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  return { durations, record };
}
