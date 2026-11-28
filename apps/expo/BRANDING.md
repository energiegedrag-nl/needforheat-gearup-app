# Branding

Deploying this app under your own brand? Everything that sets the look lives in **one file, [`brand.json`](brand.json)**. Change it, run one script and app, icon, splash and manual pages follow.

## What brand.json holds

| Key | Used for |
|---|---|
| `name`, `font` | the name on the icon tile and the font of the manual pages (the app ships Roboto) |
| `icon` | the texts on the generated icon tile: `symbol` (large, centre), `number` and `unit` (top corners), `caption` (under the tile on the logo and splash) |
| `brand.backdrop` | splash, icon background and the dark hero on the welcome screen |
| `brand.deep`, `brand.mid` | the middle of the backdrop and tile gradients |
| `brand.primary` | the brand colour: buttons, progress, notification colour |
| `brand.accent` | highlights, the spark on the progress bar, the glow |
| `light`, `dark` | every colour of the app in light and dark mode: the React Native Elements colours (`primary`, `background`, `white` = surfaces, `black` = text, `grey0`…`grey5`, `success`, `error`, `warning`, …) and the app's own tokens (`tint`, `surface`, `surfaceAlt`, `border`, `text`, `textMuted`, `primarySoft`, `successSoft`, `accent`, `onPrimary`) |

`src/lib/theme.ts` reads the file directly, so the app's colours need no extra step. Screens never hard-code colours: they use the theme tokens.

## Steps

1. Edit `brand.json`. Keep the two palettes readable: text, muted text and `tint` need a contrast of at least 4.5:1 on `background` and `surface`, and `onPrimary` on `primary`.
2. Run, from `apps/expo/assets/brand` (needs Python 3 and Pillow):

   ```
   python apply_brand.py
   ```

   This puts the colours into `app.json` (splash, adaptive icon, notifications) and makes `icon.png`, `adaptive-icon.png`, `logo.png` and `splash.png`. Bringing your own images instead? Put them in `assets/` and run `python apply_brand.py --no-icons`.
3. Copy `brand.json` to the root of your copy of [needforheat-manuals](https://github.com/energiegedrag-nl/needforheat-manuals) and run `python tools/apply_brand.py` there, so manual, FAQ and privacy pages get the same colours, in light and dark mode.

The unit test `src/lib/brand.test.tsx` fails in CI when `app.json` does not match `brand.json` or when a palette has too little contrast.

## Not covered by brand.json

- The app's name, slug, scheme and package/bundle id: `app.json` (`name`, `slug`, `scheme`, `android.package`, `ios.bundleIdentifier`).
- The servers: `MANUAL_URL` and the API in the environment (see the main README).
- The iOS asset catalogue (`ios/*/Images.xcassets`): regenerate it with `npx expo prebuild --platform ios` after new images.
