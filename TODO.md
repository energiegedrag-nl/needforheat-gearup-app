# TODO – needforheat-gearup-app

Open work for this repository, distilled from the earlier NeedForHeat backlog at Windesheim, including the discussions on it (paraphrased and regrouped), and from the 2026 maintenance review.

Items that touch several repositories are written out in full in one *lead* repository; the others list them with a link (→). Keep the details up to date in the lead repository only.

## Now: needed to run at home this winter

- [ ] <a id="expo"></a>**Upgrade Expo SDK 51 to SDK 57.** Needed for iOS/TestFlight and for the stores: the MapLibre config plugin (maps) requires Expo SDK 52 or newer, so iOS builds cannot be prepared on SDK 51 (Android links MapLibre without the plugin), and Google Play requires a recent target SDK. Also update the provisioning library to a version that ships its own config plugin. The APK workflow (*Android APK*) builds without an Expo account; set a release key in the repository secrets before distributing. Current is SDK 57 (React Native 0.86). Since SDK 55 only the New Architecture is supported, so check each native module (provisioning library, MapLibre v11, QR scanner). Google Play requires target SDK 36 for new apps and updates since 31 August 2026; the APK now targets 34 (fine for sideloading).
- [ ] → Hardware test of v3.4.0 on the living room module — see [needforheat-living-room-module-firmware](https://github.com/energiegedrag-nl/needforheat-living-room-module-firmware/blob/main/TODO.md#hwtest)

## Soon: robustness and correctness

- [ ] <a id="wpa3"></a>**Allow WPA3-only networks in the Wi-Fi list.** WPA2/WPA3 mixed networks (security 7) are allowed since app #26. WPA3-only (6) needs firmware on ESP-IDF 5.x (PMF); then allow it in `isSupportedWifiSecurity` for devices that report a new enough firmware version. Also affects: needforheat-generic-firmware.
- [ ] <a id="offline"></a>**Clear behaviour without internet or server.** When the server is unreachable the app looks 'not activated'. Detect that the server is down, say so, and show cached data. Design rule: the app stores its activation state persistently. It only becomes 'not activated' when the session token has expired, the server says the token is invalid, or the user deactivates. Without connection, show the last known data marked as possibly outdated. Also affects: needforheat-server-api.
- [ ] <a id="relink"></a>**Opening a used invitation link again should not fail.**
- [ ] <a id="freeze"></a>**Freeze after scanning a device and switching apps.** The screen freezes when the user leaves the app during device scan or reset and comes back. Review the device reset instructions too. Reproduction (Android): after provisioning, do not tap 'back to home', use other apps for hours, return: the app no longer responds. On iOS a second provisioning without restarting the app sometimes fails. State is kept in the app or the provisioning library; re-test after the switch to the orbital-systems library. Also affects: needforheat-generic-firmware.
- [ ] <a id="monitor"></a>**Finish data-flow monitoring per source.** Show per source whether data is still arriving on schedule (upload interval plus margin), with details on tap (last and next upload, reset), a clear progress indicator, and correct handling of several devices of the same type. Quick win: a plain list of the latest measurements per device, so users can see their sensors work. Also affects: needforheat-server-api.
- [ ] <a id="eponline"></a>**EP-online without handing the key to participants.** The EP-online terms (apikey.ep-online.nl, read 2026-11-08) say the API key is personal and may not be made available to third parties, and label data may not be provided to third parties at individual level except indirectly. Handing the key from the server to the app at run time (`/api_key/EP-online`) therefore only fits the maintainer's own tests. For participants: let them enter their label (from ep-online.nl or the label report) or compute without a label (method `best`), and ask RVO (fbni@rvo.nl) for a local-first route: a keyless rate-limited lookup per address, a revocable per-application key, or OAuth public client. A server-side proxy would satisfy the key rule but sends the address to the server. Do not recommend EP-online keys in apps given to others until this is clear. Also affects: needforheat-server-api.
- [ ] → Upgrade to ESP-IDF 5.5 (WPA3, Wi-Fi 6) — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#idf)
- [ ] → Re-use devices and update a changed proof of possession — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#reuse)

## Later: features and ideas

- [ ] <a id="equx"></a>**Energy query usability.** Map starts at the GPS position at street level, asks for permission when needed; address search and confirmation (now MapLibre/PDOK).
- [ ] <a id="usertest"></a>**Test with users.** Run a small test with colleagues using a campaign with only the two energy queries (weather location and building profile).
- [ ] <a id="consent"></a>**Informed consent in the app.** Optional consent step per campaign, without storing personal data on the server.
- [ ] <a id="qr"></a>**Provisioning QR as NFH:// deep link.** QR v2 (`NFH:` + Base32, 64-bit proof of possession) is done (firmware v3.4.0-rc.2, app #24). Remaining: an `nfh://` deep link that the app registers, which needs a mixed-mode QR encoder on the device (lowercase scheme in byte mode, payload in alphanumeric mode), and a second format bit for security 2. Also affects: needforheat-generic-firmware, needforheat-server-api.
- [ ] <a id="helpdesk"></a>**Photos and helpdesk.** Let users send photos of their installation (boiler, meter) to help with support.
- [ ] <a id="social"></a>**Log in with an external identity (OpenID Connect pairwise).** Also affects: needforheat-server-api.
- [ ] <a id="buildingprofile"></a>**Building profile energy query with external APIs.** Needs an exact BAG address, but the address must not reach our server. Lookups go directly from the app to Kadaster (BAG), RVO (EP-online) and 3DBAG; mention them in the privacy statement. API keys (EP-online keys are personal) are handed out by our server at run time, not stored in the app (or only in KeyStore/Keychain), and can be rotated. Also affects: needforheat-server-api.
- [ ] <a id="graphs"></a>**Better graphs.** Units on the axes derived from the property names (physiquant__unit), pinch-zoom on both axes, remember the chosen properties per source, and a time axis that is timezone-aware (home timezone by default). Display names of properties come from the server at run time (defaults per device type from the firmware developer, overridable per campaign), not from the app build.
- [ ] <a id="apartments"></a>**Building profile for apartments.** The signature method only covers single-family homes (RVO reference dwellings are ground-bound); for a building with several homes the app now says it is not yet suitable and sends nothing. Option: an apartment method from the energy label (loss area = compactness × A_g, split with apartment reference shares) or from 3DBAG with the dwelling's share of the building; check the privacy of the result with AnonyMate first.
- [ ] <a id="appmisc"></a>**Small UI items.** Localize `app.json`; margins of the welcome screen.
- [ ] → Provisioning via SoftAP — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#softap)
- [ ] → Security research: proof of possession and device trust — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#security)
- [ ] → Finish the rename from Twomes to NeedForHeat — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#rename)
- [ ] → CONTRIBUTING.md with the branching workflow — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#contrib)
- [ ] → Register phones for presence detection — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#bt)
- [ ] → More cloud data sources — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#cloud)
- [ ] → Language in the path, so relative links work — see [needforheat-manuals](https://github.com/energiegedrag-nl/needforheat-manuals/blob/prd/TODO.md#lang)
- [ ] → Home Assistant as a data source — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#ha)
- [ ] → Homes without gas: heat pumps and electric vehicles — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#heatpump)
- [ ] → Keep the library survey current — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#libdocs)

## Recently done

- [x] WPA2/WPA3 mixed networks allowed; Windesheim removed from the app texts; generated android/ directory no longer in the repository (#26)
- [x] Default manual, FAQ and privacy links come from MANUAL_URL and the campaign
- [x] Provisioning sends the server choice to the device (#23); QR scanner reads QR v2 and tolerates typing errors (#24)
- [x] Firebase removed, Google API key no longer used, info links from campaign — merged (#1–#3)
- [x] Weather location: H3 level 5 after random noise (σ ≈ 10 km, offset fixed per installation) instead of level 4
- [x] Local-first heat performance signature for one home (AnonyMate method; BAG via PDOK and 3DBAG without keys, EP-online with a run-time key), rounded before upload
- [x] Android APK workflow without an Expo account; bundle id nl.energiegedrag.app
