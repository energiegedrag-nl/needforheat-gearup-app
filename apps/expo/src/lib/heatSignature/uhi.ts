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
 *
 * The value is never uploaded on its own: as a column it is a location pointer (AnonyMate,
 * docs/herleidbaarheid-uitleg.md: even rounded to 1 K it doubles the share of homes in a group
 * smaller than 11). It is folded into H instead (applyUhiToH), which costs no privacy: H stays a
 * function of the address that anyone with the address can compute.
 */
import table from "./uhi_pc4_rivm_2022.json";

const UHI_TENTHS = table as unknown as Record<string, number>;

/** Mean indoor and outdoor temperature over the heating season [°C] (AnonyMate signature.as_learned). */
export const T_INDOOR_MEAN__degC = 18.33;
export const T_OUTDOOR_MEAN__degC = 6.44;
/**
 * Share of the summer UHI that is assumed to hold in the heating season (0..1). AnonyMate computes
 * 0, 0.5 and 1 and has not chosen yet (kladbloknotitie 5); its default is 1, used here too.
 */
export const UHI_SHARE__0 = 1.0;

/**
 * H as a learning model with station (or interpolated KNMI) weather sees it: a city home loses heat
 * against an outdoor temperature UHI_SHARE x UHI warmer than the station's, so the learned H is
 * smaller by the factor (T_in - T_out - s.UHI) / (T_in - T_out). Unknown UHI: H unchanged.
 */
export function applyUhiToH(H: number, uhi: number | null | undefined, share = UHI_SHARE__0): number {
  if (uhi === null || uhi === undefined || !Number.isFinite(uhi)) return H;
  const dT = T_INDOOR_MEAN__degC - T_OUTDOOR_MEAN__degC;
  return H * ((dT - share * uhi) / dT);
}

/** UHI [K] for a postcode ("1234AB" or "1234"); null when the PC4 is not in the table. */
export function uhiForPostcode(postcode: string | null | undefined): number | null {
  const pc4 = String(postcode ?? "").replace(/\s/g, "").slice(0, 4);
  const v = UHI_TENTHS[pc4];
  return typeof v === "number" ? v / 10 : null;
}
