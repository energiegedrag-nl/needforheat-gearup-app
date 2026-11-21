declare module "@env" {
  export const API_URL: string;
  export const MANUAL_URL: string;
  /** Short commit of the build (APK workflow); empty in development. */
  export const BUILD_COMMIT: string | undefined;
}
