import { API_URL } from "@env";
import { z } from "zod";

import { FETCH_HEADERS } from "@/constants";

const propertyLabelsSchema = z.object({
  language: z.string(),
  labels: z.record(z.string()),
});

/**
 * Display names of properties in one language for the campaign of the account
 * (GET /property_labels). A server without labels (or an error) gives none: then the app shows
 * the property names.
 */
export async function fetchPropertyLabels(language: string): Promise<Record<string, string>> {
  const response = await fetch(`${API_URL}/property_labels?language=${encodeURIComponent(language)}`, {
    ...(await FETCH_HEADERS()),
  });
  if (!response.ok) return {};
  return propertyLabelsSchema.parse(await response.json()).labels;
}
