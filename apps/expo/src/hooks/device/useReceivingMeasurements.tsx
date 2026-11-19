import { useEffect, useState } from "react";

import { fetchDevice } from "@/api/device";
import { Maybe } from "@/types";
import { toLocalDateTime } from "@/utils/tools";

export default function useReceivingMeasurements(deviceName: string, retries = 10) {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [latestMeasurement, setLatestMeasurement] = useState<Maybe<Date>>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [openedTimestamp, setOpenedTimestamp] = useState<Date>(new Date());

  useEffect(() => {
    if (count === null) return;

    // every 5 seconds, check if the device is receiving measurements using a set timeout
    if (count > 0) {
      setTimeout(
        async () => {
          let data;
          try {
            data = await fetchDevice(deviceName);
          } catch (err) {
            // A failed request (e.g. no network for a moment) is one try less, not the end of waiting.
            console.warn("Waiting for the first heartbeat:", err);
            setCount(count - 1);
            return;
          }
          const latestMeasurement = toLocalDateTime(data?.latest_upload);

          console.log("latestTimestamp", latestMeasurement);
          console.log("openedTimestamp", openedTimestamp);

          if (latestMeasurement && latestMeasurement > openedTimestamp) {
            setLatestMeasurement(latestMeasurement);
            setIsLoading(false);
            setCount(null);
            return;
          }

          setCount(count - 1);
        },
        count === retries ? 0 : 5000
      );
    } else {
      // All tries used without a heartbeat: stop waiting and say so (before, the spinner kept turning).
      setIsLoading(false);
      setIsError(true);
      setCount(null);
    }
  }, [count]);

  const fetchData = () => {
    // Reset state
    setIsError(false);
    setLatestMeasurement(undefined);
    setIsLoading(true);

    setCount(retries);
  };

  return {
    fetchData,
    isError,
    latestMeasurement,
    isSuccess: !!latestMeasurement,
    isLoading,
  };
}
