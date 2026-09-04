# Mobile release guide

CVBase ships to Android and iOS as a [Capacitor](https://capacitorjs.com) app
wrapping the same React web build. There is no separate mobile codebase — every
segment, style and validation rule is shared, so the apps cannot drift from the
web app.

## Prerequisites

| Platform | Requirement | Status on this machine |
| --- | --- | --- |
| Both | Node 20+, `npm install` | ✅ |
| iOS | Xcode 16+ with an iOS simulator runtime | ✅ Xcode 26.6 |
| Android | Android Studio + SDK (API 36), **JDK 21** | ✅ SDK at `~/Library/Android/sdk` |

The app id is `ai.cvbase.app` on both platforms — reverse-DNS of the product
domain, cvbase.ai.

Capacitor 8 uses Swift Package Manager on iOS, so **CocoaPods is not required**.

## Service worker is web-only

`public/sw.js` (offline app shell + cached `/assets/*`) is registered by
`public/register-sw.js`, which bails out inside the Capacitor shell (it checks
`window.Capacitor` and the `capacitor:`/`ionic:` schemes) and on the Vite dev
server (port 3000). The native apps ship their bundle inside the binary, so they
need no worker; `npx cap sync` copies the files along with the rest of `dist/`
but they stay inert. The PWA manifest and `/icons/*.png` are likewise for the
web install prompt only — the store icons live under `android/` and `ios/`.

## Everyday loop

```bash
npm run mobile:build
```

That runs `vite build` then `npx cap sync`, which copies `dist/` into
`android/app/src/main/assets/public` and `ios/App/App/public` and regenerates the
native plugin registries.

> **Always run this after changing web code.** The native projects embed a
> *copy* of the build. Skipping the sync is how the apps ended up shipping a
> seven-week-old build under the previous branding.

Then open the platform project:

```bash
npm run mobile:open:ios
```

```bash
npm run mobile:open:android
```

## Verifying a build

```bash
npm run typecheck && npm test && npm run build
```

The theme tokens are generated, not hand-written. After touching the palette:

```bash
node scripts/generate-theme-css.mjs
```

That regenerates `styles/theme.css` and runs 132 WCAG contrast assertions across
both themes. It exits non-zero if any body-text pairing drops below AA, so a
palette change cannot silently ship an unreadable dark mode.

## iOS release

1. `npm run mobile:build`
2. `npm run mobile:open:ios`
3. In Xcode: select **Any iOS Device (arm64)**.
4. Set the signing team on the **App** target → Signing & Capabilities.
5. Bump **MARKETING_VERSION** (user-facing, e.g. `1.0.1`) and
   **CURRENT_PROJECT_VERSION** (build number, must increase every upload).
6. **Product → Archive**, then distribute via the Organizer.

Identity is already set: bundle id `ai.cvbase.app`, display name `CVBase`,
`UIRequiredDeviceCapabilities` = `arm64`.

## Android release

### JDK 21 is required

Gradle 8.14.3 supports Java up to 24. Both JDKs installed on this machine are
too new — Android Studio bundles Java 25 and the system JDK is 26 — and either
fails with `Unsupported class file major version 69`. Gradle's own toolchain
cache already holds a Temurin 21, which is what the verified build used:

```bash
export JAVA_HOME="$HOME/.gradle/jdks/eclipse_adoptium-21-aarch64-os_x.2/jdk-21.0.12+8/Contents/Home"
```

Android Studio's own Gradle JDK setting (Settings → Build Tools → Gradle) must
point at a JDK 21 for in-IDE builds, otherwise it fails the same way.

### Building

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

1. `npm run mobile:build`
2. `npm run mobile:open:android`
3. Let Gradle sync and download the SDK components it asks for.
4. **Build → Generate Signed App Bundle**, or from the CLI:

```bash
cd android && ./gradlew bundleRelease
```

A debug APK, for checking a build on a device:

```bash
cd android && ./gradlew assembleDebug
```

`android/local.properties` (holding `sdk.dir`) is machine-specific and git
ignores it; create it if a fresh clone cannot find the SDK.

### Signing

`android/app/build.gradle` reads its keystore from Gradle properties so no
secret is ever committed. Create the keystore once:

```bash
keytool -genkey -v -keystore cvbase-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cvbase
```

Then add to `~/.gradle/gradle.properties` (**not** the repo):

```properties
CVBASE_STORE_FILE=/absolute/path/to/cvbase-release.jks
CVBASE_STORE_PASSWORD=…
CVBASE_KEY_ALIAS=cvbase
CVBASE_KEY_PASSWORD=…
```

Without these the release build still assembles, just unsigned — so a fresh
clone is never blocked, while a release pipeline fails loudly if the secrets are
missing.

### Versioning

Bump `versionCode` (integer, must increase on every Play upload) and
`versionName` in `android/app/build.gradle`.

### Shrinking (opt-in)

`minifyEnabled` is deliberately `false`. Capacitor resolves plugins by
reflection, so R8 needs the keep rules in `android/app/proguard-rules.pro` to be
exactly right — and a mistake there fails at runtime, not at build time. The
rules are written and ready. Turn it on only once you have installed a release
build on a device and confirmed the plugins still load.

### ⚠️ Application ID change

The id is now `ai.cvbase.app`, reverse-DNS of cvbase.ai. The project was
scaffolded as `com.cvleap.app`. **If a CVLeap build was ever published to Play
under that id, this is a new listing** — existing installs will not receive it as
an update. If that applies, revert `applicationId` (the `namespace` can stay) and
keep the old id.

An application id is permanent once published: Play and the App Store both key
the listing on it and neither allows a change. Confirm `ai.cvbase.app` is what
you want before the first upload.

## Architecture notes

### Everything is bundled — nothing is fetched at runtime

The app previously loaded Tailwind, fonts, Material Symbols, html2pdf and even
React from four CDNs. That made a packaged app unusable offline. Styles are now
compiled by PostCSS at build time and every font and library is bundled: a
production page load makes **zero third-party requests**.

### Theming

Every colour in `tailwind.config.js` resolves to a CSS variable, so toggling
`.dark` on `<html>` re-themes all 147 components without any per-component
`dark:` variants.

Each colour carries **two** variables because a token means opposite things in
its two roles, and they move in opposite directions when the theme flips:

| Utility | Role | Dark-mode behaviour |
| --- | --- | --- |
| `text-gray-800` | dark body copy | becomes **light** (`--ct-*`) |
| `bg-gray-800` | a dark slab | stays **dark** (`--cb-*`) |
| `bg-primary` + `text-white` | solid button | primary stays dark so white keeps 4.8:1 |

Resume templates are the deliberate exception — a CV is always ink-on-white, so
template roots re-declare the light values and never invert, in either theme or
in PDF export.

### Native shell

`components/NavigationProvider.tsx` owns a real navigation stack mirrored into
`window.history`, so the Android hardware back button and browser/gesture back
both unwind screens instead of closing the app. Modals register interceptors via
`useBackHandler` so back closes them first.

`lib/nativeShell.ts` handles splash dismissal, keyboard resize mode and status
bar overlay. `components/ThemeProvider.tsx` keeps the native status bar style in
step with the active theme.

### Known size cost

`material-symbols` ships a 3.9 MB variable icon font. The app uses 129 distinct
icons but several resume templates set `FILL`, `wght` and `opsz` axes, so the
variable font is genuinely required for visual fidelity. Subsetting it would
mean switching the 440 ligature call sites to codepoints — worth doing if app
size becomes a constraint, but it is not a shipping blocker.

### Resume export: no anchor downloads inside the WebView

`<a download>` is a silent no-op (or a dead-end `blob:` in-app navigation) in a
Capacitor WebView — there is no download manager to catch the click. Every
export in the resume builder (`components/ResumeBuilder.tsx`) now goes through
`lib/export/saveFile.ts`, which branches on `Capacitor.isNativePlatform()`: an
anchor download on the web, and on native a write into `Directory.Cache` via
`@capacitor/filesystem` followed by the system share sheet via
`@capacitor/share` (already-installed dependencies — no new native plugin was
added, so this change did not require an `npx cap sync`). If the share sheet
itself can't be reached, it falls back to `Directory.Documents` plus a toast
telling the user where the file landed.

PDF export (`lib/export/exportPdf.ts`) has two paths. The primary one, used on
web, opens a same-origin hidden iframe, clones the app's compiled stylesheets
and the rendered resume markup into it, and calls the browser's own
print-to-PDF (`iframe.contentWindow.print()`) — a real text layer, not a
screenshot. That pipeline doesn't exist inside a WebView (there's no "Save as
PDF" target for `print()` to write to), so native always uses the rasterised
html2pdf.js path (`renderImagePdfBlob`) and hands the resulting blob to
`saveFile`. The same rasterised path is also offered on web as a secondary
"Image PDF (exact look)" option in the finalize screen, for anyone who wants a
pixel-exact copy of a template over a searchable/selectable file.
