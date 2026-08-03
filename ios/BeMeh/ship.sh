#!/usr/bin/env bash
#
# ship.sh — build BeMeh and upload it to TestFlight, entirely from your Mac.
#
# This is the whole pipeline in one file: it archives the app, signs it with
# your App Store Connect API key (automatic signing, no certs to wrangle), and
# uploads to TestFlight. No Xcode Cloud, no GitHub billing, no clicking through
# Xcode. Requires only a Mac with Xcode 16+ and the .p8 key you already have.
#
# USAGE
#   1. Put your key file somewhere the script can find it. By default it looks
#      in ~/Downloads for AuthKey_XD43Q7UKT9.p8 (where Apple puts it), or set
#      P8_PATH to point at it.
#   2. From anywhere:  bash ship.sh
#      (the script clones a fresh copy of the repo into a temp folder and builds
#       that, so it doesn't matter what directory you run it from)
#
# Everything below is pre-filled from your account — no editing needed.

set -euo pipefail

# --- Your account, already looked up. Nothing to change. ---------------------
KEY_ID="XD43Q7UKT9"
ISSUER_ID="407602e0-c72b-40dc-9686-ee2e5276b8d2"
TEAM_ID="4XMMKU4W89"
BUNDLE_ID="com.bemehesthetics.bemeh"
REPO="https://github.com/milesgaines/solstice-realty.git"
BRANCH="main"

# --- Find your API key -------------------------------------------------------
P8_PATH="${P8_PATH:-$HOME/Downloads/AuthKey_${KEY_ID}.p8}"
if [[ ! -f "$P8_PATH" ]]; then
  # Fall back to the standard system location, then a Desktop copy.
  for candidate in \
    "$HOME/private_keys/AuthKey_${KEY_ID}.p8" \
    "$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8" \
    "$HOME/Desktop/AuthKey_${KEY_ID}.p8"; do
    [[ -f "$candidate" ]] && P8_PATH="$candidate" && break
  done
fi
if [[ ! -f "$P8_PATH" ]]; then
  echo "ERROR: Couldn't find AuthKey_${KEY_ID}.p8."
  echo "It's the file you downloaded from App Store Connect when you made the key."
  echo "Move it to ~/Downloads, or re-run as:  P8_PATH=/full/path/AuthKey_${KEY_ID}.p8 bash ship.sh"
  exit 1
fi
echo "Using API key: $P8_PATH"

# xcodebuild's automatic signing wants the key in this exact directory.
mkdir -p "$HOME/private_keys"
cp "$P8_PATH" "$HOME/private_keys/AuthKey_${KEY_ID}.p8"

# --- Fresh checkout so the build is reproducible -----------------------------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
echo "Cloning $BRANCH into $WORK ..."
git clone --depth 1 --branch "$BRANCH" "$REPO" "$WORK/src"
cd "$WORK/src/ios/BeMeh"

BUILD_NUMBER="$(date +%s)"   # always unique, always increasing
echo "Build number: $BUILD_NUMBER"

AUTH=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$HOME/private_keys/AuthKey_${KEY_ID}.p8"
  -authenticationKeyID "$KEY_ID"
  -authenticationKeyIssuerID "$ISSUER_ID"
)

# --- Archive -----------------------------------------------------------------
echo "== Archiving (this is the slow part, ~2-4 min) =="
xcodebuild archive \
  -project BeMeh.xcodeproj \
  -scheme BeMeh \
  -destination 'generic/platform=iOS' \
  -archivePath "$WORK/BeMeh.xcarchive" \
  "${AUTH[@]}" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGN_STYLE=Automatic

# --- Export + upload to TestFlight -------------------------------------------
cat > "$WORK/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST

echo "== Uploading to TestFlight =="
xcodebuild -exportArchive \
  -archivePath "$WORK/BeMeh.xcarchive" \
  -exportOptionsPlist "$WORK/ExportOptions.plist" \
  "${AUTH[@]}"

echo ""
echo "======================================================================"
echo " Uploaded. Apple is now processing the build (5-20 min)."
echo " Watch it at: App Store Connect -> Apps -> BemEh -> TestFlight"
echo " When it appears, answer the encryption question 'No' and add yourself"
echo " as an internal tester. Then open TestFlight on your iPhone to install."
echo "======================================================================"
