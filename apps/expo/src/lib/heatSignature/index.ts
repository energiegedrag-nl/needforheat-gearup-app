import { computeSignature, DwellingInput, Method, ReferenceData, Signature } from "./signature";
import referenceData from "./rvo_voorbeeldwoningen_2022_grondgebonden.json";

export * from "./signature";
export { fetchDwelling } from "./publicData";

/** RVO reference dwellings 2022 (source: RVO, Data voorbeeldwoningen 2022; via AnonyMate). */
export const REFERENCE_DWELLINGS = referenceData as unknown as ReferenceData;

/** The heat performance signature of one home; default method "passend" (label if usable, else best estimate). */
export function heatSignature(input: DwellingInput, method: Method = "passend"): Signature | null {
  return computeSignature(input, method, REFERENCE_DWELLINGS);
}
