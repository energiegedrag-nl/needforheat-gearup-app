import { useQueryClient } from "@tanstack/react-query";

import { postEnergyQuery } from "@/api/energyquery";
import { EnergyQuery } from "@/types/api";

/**
 * Sends an energy query and marks what it changes as out of date, so the data sources list (and what was
 * sent) shows the new answer as soon as the user is back there, instead of after the next refresh.
 */
export default function usePostEnergyQuery() {
  const queryClient = useQueryClient();
  return async (energyQuery: EnergyQuery) => {
    const result = await postEnergyQuery(energyQuery);
    // Not awaited: the lists refetch in the background while the screen says the answer was sent.
    queryClient.invalidateQueries(["energy_queries"]);
    queryClient.invalidateQueries(["measurementsSchema"]);
    queryClient.invalidateQueries(["properties"]);
    return result;
  };
}
