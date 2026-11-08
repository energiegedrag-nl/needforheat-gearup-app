# TODO – needforheat-gearup-app

Open work for this repository, distilled from the old NeedForHeat Trello board, including the discussions on the cards (paraphrased and regrouped) and from the 2026 maintenance review.

Items that touch several repositories are written out in full in one *lead* repository; the others list them with a link (→). Keep the details up to date in the lead repository only.

## Now: needed to run at home this winter

- [ ] <a id="appmerge"></a>**Merge the Firebase, maps and info-link changes.** PRs #1–#3 remove Firebase and Google services and use the campaign's info links. Regenerate `yarn.lock` (needs a machine with enough memory), build an APK and test invitation links, provisioning and the map. *(Trello #1011, #773, #677)*
- [ ] <a id="wpa3"></a>**Allow WPA2/WPA3 networks in the Wi-Fi list.** The app rejects networks with security mode above 4, which hides WPA2/WPA3 mixed networks. Allow mixed mode now; WPA3-only needs the ESP-IDF upgrade. Also affects: needforheat-generic-firmware. *(Trello #806)*

## Soon: robustness and correctness

- [ ] <a id="offline"></a>**Clear behaviour without internet or server.** When the server is unreachable the app looks 'not activated'. Detect that the server is down, say so, and show cached data. Design rule: the app stores its activation state persistently. It only becomes 'not activated' when the session token has expired, the server says the token is invalid, or the user deactivates. Without connection, show the last known data marked as possibly outdated. Also affects: needforheat-server-api. *(Trello #748, #1037)*
- [ ] <a id="relink"></a>**Opening a used invitation link again should not fail.** *(Trello #1006)*
- [ ] <a id="freeze"></a>**Freeze after scanning a device and switching apps.** The screen freezes when the user leaves the app during device scan or reset and comes back. Review the device reset instructions too. Reproduction (Android): after provisioning, do not tap 'back to home', use other apps for hours, return: the app no longer responds. On iOS a second provisioning without restarting the app sometimes fails. State is kept in the app or the provisioning library; re-test after the switch to the orbital-systems library. Also affects: needforheat-generic-firmware. *(Trello #772)*
- [ ] <a id="monitor"></a>**Finish data-flow monitoring per source.** Show per source whether data is still arriving on schedule (upload interval plus margin), with details on tap (last and next upload, reset), a clear progress indicator, and correct handling of several devices of the same type. Quick win: a plain list of the latest measurements per device, so users can see their sensors work. Also affects: needforheat-server-api. *(Trello #1041, #1096, #1042, #1119, #1117, #1040)*
- [ ] <a id="urls"></a>**One place for default URLs.** Default manual, FAQ and privacy links are still hard-coded to the old Windesheim domains; put defaults in one configuration value. Design rule: the domain (for example `energiegedrag.nl`) is the only build-time setting in app and firmware; derive `api.` and `manuals.` from it and get everything else at run time. *(Trello #572, #824)*
- [ ] <a id="h3noise"></a>**Weather location: H3 level 5 with random noise.** The app now sends the centre of the H3 level-4 cell (about 1,770 km²) of the home. A later re-identification analysis (AnonyMate) shows that level 5 after adding random noise (σ ≈ 10 km) to the location gives more accurate weather and is just as safe. Change both screens accordingly and update the privacy text. Design rules: GPS only as a hint for the pin, show no street address, then show the hexagon so the user can confirm. Also affects: needforheat-generic-firmware. *(Trello #689)*
- [ ] <a id="signature"></a>**Local-first heat performance signature for one home.** The building profile now evaluates simple formulas on 3DBAG attributes. Port the single-home calculation of AnonyMate (`signature.py`: methods `nta8800` and `mwa`, from BAG, 3DBAG, EP-online label, RVO reference dwellings and NTA 8800 default values) to a tested TypeScript module, with the reference tables as JSON and test cases computed by AnonyMate. The address stays on the phone; EP-online is queried with a key handed out at run time, or the user enters the label. Upload only what the campaign needs, rounded as AnonyMate advises: signatures are quasi-identifiers (they can be computed for every home), so mention them in the privacy statement. Also affects: needforheat-server-api. *(Trello #690, #1192, #1196)*
- [ ] → Upgrade to ESP-IDF 5.5 (WPA3, Wi-Fi 6) — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#idf) *(Trello #806)*
- [ ] → Re-use devices and update a changed proof of possession — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#reuse) *(Trello #671, #836, #959)*

## Later: features and ideas

- [ ] <a id="equx"></a>**Energy query usability.** Map starts at the GPS position at street level, asks for permission when needed; address search and confirmation (now MapLibre/PDOK). *(Trello #1157)*
- [ ] <a id="usertest"></a>**Test with users.** Run a small test with colleagues using a campaign with only the two energy queries (weather location and building profile). *(Trello #1122, #1147)*
- [ ] <a id="consent"></a>**Informed consent in the app.** Optional consent step per campaign, without storing personal data on the server. *(Trello #682)*
- [ ] <a id="qr"></a>**Compact provisioning QR code (NFH:// deep link).** Switch the device QR code to a short Base45 `NFH://` deep link that the app registers, with a better hash of device type and MAC address. Skip the intermediate hash encoding and go straight to the Base45 `NFH://` link. Analysis: QR version 4 with error correction L leaves about 29 characters for name and proof of possession; use the same Base45 alphabet and padding on device and server. Until then the current provisioning QR code stays. Also affects: needforheat-generic-firmware, needforheat-server-api. *(Trello #711, #709)*
- [ ] <a id="helpdesk"></a>**Photos and helpdesk.** Let users send photos of their installation (boiler, meter) to help with support. *(Trello #559, #574)*
- [ ] <a id="social"></a>**Log in with an external identity (OpenID Connect pairwise).** Also affects: needforheat-server-api. *(Trello #650)*
- [ ] <a id="buildingprofile"></a>**Building profile energy query with external APIs.** Needs an exact BAG address, but the address must not reach our server. Lookups go directly from the app to Kadaster (BAG), RVO (EP-online) and 3DBAG; mention them in the privacy statement. API keys (EP-online keys are personal) are handed out by our server at run time, not stored in the app (or only in KeyStore/Keychain), and can be rotated. Also affects: needforheat-server-api. *(Trello #690)*
- [ ] <a id="graphs"></a>**Better graphs.** Units on the axes derived from the property names (physiquant__unit), pinch-zoom on both axes, remember the chosen properties per source, and a time axis that is timezone-aware (home timezone by default). Display names of properties come from the server at run time (defaults per device type from the firmware developer, overridable per campaign), not from the app build. *(Trello #761)*
- [ ] <a id="appmisc"></a>**Small UI items.** Localize `app.json`; margins of the welcome screen. *(Trello #1156, #1158)*
- [ ] → Let the app tell the device which server to use — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#serverselect) *(Trello #588, #292, #587)*
- [ ] → Provisioning via SoftAP — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#softap) *(Trello #302, #112)*
- [ ] → Security research: proof of possession and device trust — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#security) *(Trello #307, #868, #308, #326, #461)*
- [ ] → Finish the rename from Twomes to NeedForHeat — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#rename) *(Trello #1030)*
- [ ] → CONTRIBUTING.md with the branching workflow — see [needforheat-generic-firmware](https://github.com/energiegedrag-nl/needforheat-generic-firmware/blob/main/TODO.md#contrib) *(Trello #394, #1032)*
- [ ] → Register phones for presence detection — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#bt) *(Trello #104, #117, #863, #576)*
- [ ] → More cloud data sources — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#cloud) *(Trello #950, #951, #952, #32, #55, #40, #1049, #973)*
- [ ] → Language in the path, so relative links work — see [needforheat-manuals](https://github.com/energiegedrag-nl/needforheat-manuals/blob/prd/TODO.md#lang) *(Trello #1002)*
- [ ] → Home Assistant as a data source — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#ha)
- [ ] → Homes without gas: heat pumps and electric vehicles — see [needforheat-server-api](https://github.com/energiegedrag-nl/needforheat-server-api/blob/main/TODO.md#heatpump) *(Trello #1205, #1206, #1207)*

## Recently done

- [x] Firebase removed (#1011), Google API key no longer used (#677), info links from campaign (#773) — open PRs, see top item
