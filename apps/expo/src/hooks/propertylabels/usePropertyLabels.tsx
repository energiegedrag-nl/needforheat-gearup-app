import { useQuery } from "@tanstack/react-query";

import { fetchPropertyLabels } from "@/api/propertylabels";

const ONE_DAY__ms = 24 * 60 * 60 * 1000;

/** Display names of properties per property name, in the given language; empty until loaded. */
export default function usePropertyLabels(language: string) {
  return useQuery({
    queryKey: ["propertyLabels", language],
    queryFn: () => fetchPropertyLabels(language).catch(() => ({}) as Record<string, string>),
    staleTime: ONE_DAY__ms,
    retry: false,
  });
}
