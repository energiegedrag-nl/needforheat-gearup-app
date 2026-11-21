/**
 * Urban heat island effect (UHI) at a home, from a table per four-digit postcode bundled with the
 * app: no request leaves the phone.
 *
 * Source: RIVM, "Stedelijk hitte-eiland effect (UHI) in Nederland" (10 m raster, 01-06-2022, v2;
 * CC Public Domain 1.0), sampled per PC6 at the BAG address points by AnonyMate
 * (release asset bronnen-cache/uhi-pc6-rivm-20220601-v2.parquet), here averaged per PC4 weighted
 * by the number of addresses and stored in tenths of a kelvin (4,056 postcodes, 37 KB). Against
 * the PC6 value the PC4 mean deviates 0.21 K (RMS over addresses; P90 0.34 K).
 *
 * Note: the RIVM value is a summer mean (June-August), not validated for the heating season;
 * which share of it holds in winter is open (AnonyMate kladbloknotitie 5; modelbijsluiter §C6).
 * Table built with tools/make_uhi_pc4.py.
 */
import table from "./uhi_pc4_rivm_2022.json";

const UHI_TENTHS = table as unknown as Record<string, number>;

/** UHI [K] for a postcode ("1234AB" or "1234"); null when the PC4 is not in the table. */
export function uhiForPostcode(postcode: string | null | undefined): number | null {
  const pc4 = String(postcode ?? "").replace(/\s/g, "").slice(0, 4);
  const v = UHI_TENTHS[pc4];
  return typeof v === "number" ? v / 10 : null;
}
