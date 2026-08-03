# BeMeh — iOS app (TestFlight build)

A runnable SwiftUI walkthrough of the BeMeh concept: five screens, real
navigation, sample data. Nothing talks to a network — this build exists so
testers can hold the flow in their hand, not to exercise a backend.

Screens: **Today** (next appointment, skin index), **Scan** (guided three-angle
capture), **Book** (estheticians by concern), **Session** (live consult with
annotations, opened from Today → Join session), **Regimen** (AM/PM/weekly steps).

## What's here

```
BeMeh.xcodeproj        Opens in Xcode 16+ (uses synchronized folders, objectVersion 77)
project.yml            XcodeGen fallback if the project ever needs regenerating
BeMeh/
  BeMehApp.swift       @main entry
  RootView.swift       TabView shell, dark-only, gold tint
  Theme.swift          Palette + type scale (Didot display, system UI face)
  Components.swift     Card, Pill, GoldButtonStyle, RingGauge, Monogram
  Models.swift         Esthetician, Appointment, ScanReading, RegimenStep
  AppState.swift       All sample data lives here
  TodayView.swift  ScanView.swift  BookView.swift  SessionView.swift  RegimenView.swift
  Assets.xcassets      AppIcon (1024, no alpha) + AccentColor
```

## Run it

```bash
open ios/BeMeh/BeMeh.xcodeproj
```

Pick an iPhone simulator and hit Run. No packages to resolve, no `pod install`.

## Ship it to TestFlight

You need a Mac with Xcode 16+, an Apple Developer Program membership, and about
20 minutes. Everything below happens on your machine — none of it can be done
from this repo.

1. **Claim a bundle ID.** `com.bemehesthetics.bemeh` is a placeholder and almost
   certainly isn't yours. In Xcode select the **BeMeh** target → *Signing &
   Capabilities* → set **Team**, then change the bundle identifier to something
   you own. Check **Automatically manage signing**.

2. **Create the app record.** At
   [App Store Connect](https://appstoreconnect.apple.com) → *My Apps* → **+** →
   *New App*. Platform iOS, pick the same bundle ID, give it a name (App Store
   names are globally unique — "BeMeh Esthetics" if "BeMeh" is taken) and an SKU
   (any private string, e.g. `bemeh-ios-001`).

3. **Archive.** In Xcode set the run destination to **Any iOS Device (arm64)** —
   archiving is disabled while a simulator is selected. Then *Product* →
   *Archive*.

4. **Upload.** When the Organizer opens: *Distribute App* → *TestFlight &
   App Store* → *Upload*. Accept the automatic signing prompts.

5. **Wait for processing.** Five to twenty minutes, and you'll get an email.
   Builds usually land with a warning about missing export-compliance info.

6. **Answer export compliance.** In App Store Connect → *TestFlight* → your
   build. This app uses no encryption beyond standard HTTPS, so the answer to
   "Does your app use encryption?" is **No**.

7. **Invite testers.** *Internal Testing* (up to 100 people on your team, no
   review) is instant. *External Testing* needs a short Beta App Review, usually
   a day. Add testers by email; they install via the TestFlight app.

### Version bumps

Each upload needs a unique build number. Bump `CURRENT_PROJECT_VERSION` in the
target's build settings (1 → 2 → 3); `MARKETING_VERSION` is the user-visible
`0.1` and only changes when you want it to.

## Before this becomes a real app

- **The app icon is a placeholder.** It's a CSS re-creation of the medallion
  rendered at 1024×1024, not the real logo file. Drop the actual artwork into
  `Assets.xcassets/AppIcon.appiconset/` — 1024×1024, PNG, **no alpha channel**
  or the upload is rejected.
- **The scan is simulated.** `ScanView` draws a viewfinder and advances through
  three angles on tap; there's no `AVCaptureSession`. That's deliberate — it
  runs on the simulator and needs no camera permission. Wiring up the real
  camera means an `AVCaptureVideoPreviewLayer`, Vision landmarks for angle
  validation, and an `NSCameraUsageDescription` string in the target's Info
  settings.
- **The session is a placeholder stage.** No video transport. Real build:
  LiveKit or Twilio, with annotations synced over a data channel.
- **Face imagery is health-adjacent.** Before any of it leaves the device you
  need encryption at rest, per-session access grants, real deletion, and a
  privacy nutrition label that matches. App Review will ask.

## CI to TestFlight (no Mac needed)

`.github/workflows/testflight.yml` builds on GitHub's cloud Mac runners and
uploads to TestFlight. Two jobs:

- **Compile check** — runs on every push to `ios/BeMeh/**`, no secrets needed.
- **Archive & upload** — manual run (*Actions → iOS — build & TestFlight →
  Run workflow*), needs the four secrets below.

### One-time unlocks

1. **GitHub macOS runners.** New personal accounts must verify billing before
   macOS jobs will start (they fail in seconds with no runner assigned —
   exactly what run #1 and #2 did). Fix: GitHub → **Settings → Billing and
   plans** → add/verify a payment method. Public-repo minutes stay free.
2. **Apple secrets.** In App Store Connect → *Users and Access* →
   *Integrations* → *App Store Connect API* → create a **Team key** with
   **App Manager** role, then add repo secrets (GitHub → repo → Settings →
   Secrets and variables → Actions):
   - `APPSTORE_ISSUER_ID` — Issuer ID shown above the key list
   - `APPSTORE_KEY_ID` — the key's ID
   - `APPSTORE_P8` — full contents of the downloaded `.p8` file
   - `APPLE_TEAM_ID` — 10-char Team ID (Developer account → Membership)
3. **App record.** App Store Connect → My Apps → **+** → New App, with the
   same bundle ID the workflow uses (`com.bemehesthetics.bemeh`, or set repo
   variable `BEMEH_BUNDLE_ID` to your own).

Then dispatch the workflow; build number = run number. Alternative with zero
GitHub setup: **Xcode Cloud** — App Store Connect → Xcode Cloud → connect this
GitHub repo, pick the shared `BeMeh` scheme, and it builds + delivers to
TestFlight on Apple's Macs.
