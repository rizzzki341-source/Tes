#!/usr/bin/env bash
# Provisions the toolchain that builds the MyAnime Capacitor 8 Android APK.
# Installs only what is missing (Debian/Ubuntu x86_64, validated on Ubuntu 24.04):
#   - OpenJDK 21 headless JDK (apt); Capacitor 8 compiles with Java 21
#   - Android SDK command-line tools 23.0 (build 16111833, SHA-256 pinned)
#   - platform-tools 37.0.1, platforms;android-36
#   - build-tools 35.0.0 (AGP 8.13 default; Gradle would otherwise download it mid-build)
#     and 36.0.0 (matches compileSdk 36; used for aapt2/apksigner)
# Capacitor 8 targets compileSdk/targetSdk 36, minSdk 24, AGP 8.13.0 and Gradle 8.14.3
# (the Gradle wrapper downloads Gradle itself).
#
# Idempotent and non-interactive. Progress goes to stderr and stdout carries only the
# export lines, so `eval "$(bash scripts/setup-android.sh)"` configures the current shell.
# ANDROID_HOME defaults to /opt/android-sdk.
set -euo pipefail

exec 3>&1 1>&2

JDK_MAJOR=21
CMDLINE_TOOLS_BUILD=16111833
CMDLINE_TOOLS_SHA256=0877a1d048fe4a24efe2eff536ca4223f7adeb58648bb81909d33c446918cfa8
PLATFORM_TOOLS_VERSION=37.0.1
ANDROID_PLATFORM=android-36
BUILD_TOOLS_VERSIONS=(35.0.0 36.0.0)
PATH_BUILD_TOOLS=36.0.0
# Hash the SDK tools record when a license is accepted (same file `sdkmanager --licenses` writes).
SDK_LICENSE_HASH=24333f8a63b6825ea9c5514f83c2829b004d1fee

export JAVA_HOME="/usr/lib/jvm/java-${JDK_MAJOR}-openjdk-$(dpkg --print-architecture)"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

log() { printf '[setup-android] %s\n' "$*"; }

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# 1. JDK and download helpers
apt_pkgs=()
[ -x "$JAVA_HOME/bin/javac" ] || apt_pkgs+=("openjdk-${JDK_MAJOR}-jdk-headless")
command -v curl >/dev/null || apt_pkgs+=(curl ca-certificates)
command -v unzip >/dev/null || apt_pkgs+=(unzip)
if [ "${#apt_pkgs[@]}" -gt 0 ]; then
  log "installing apt packages: ${apt_pkgs[*]}"
  export DEBIAN_FRONTEND=noninteractive
  $SUDO apt-get update -qq
  $SUDO apt-get install -y --no-install-recommends "${apt_pkgs[@]}"
else
  log "JDK ${JDK_MAJOR} already installed"
fi

# 2. Android SDK command-line tools
if [ ! -d "$ANDROID_HOME" ]; then
  $SUDO mkdir -p "$ANDROID_HOME"
  $SUDO chown "$(id -u):$(id -g)" "$ANDROID_HOME"
fi
if [ ! -x "$SDKMANAGER" ]; then
  log "installing Android command-line tools ${CMDLINE_TOOLS_BUILD}"
  zip_file="$TMP_DIR/cmdline-tools.zip"
  curl -fsSL --retry 5 --retry-delay 3 -o "$zip_file" \
    "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_BUILD}_latest.zip"
  echo "${CMDLINE_TOOLS_SHA256}  ${zip_file}" | sha256sum -c -
  unzip -q "$zip_file" -d "$TMP_DIR/unzipped"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$TMP_DIR/unzipped/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
else
  log "Android command-line tools already installed"
fi

# 3. SDK packages. Feeding `yes` keeps older sdkmanager builds, which prompt to accept
# licenses, non-interactive; the 23.0 tools record the acceptance themselves.
sdk_pkgs=()
[ -x "$ANDROID_HOME/platform-tools/adb" ] || sdk_pkgs+=("platform-tools@${PLATFORM_TOOLS_VERSION}")
[ -f "$ANDROID_HOME/platforms/${ANDROID_PLATFORM}/android.jar" ] || sdk_pkgs+=("platforms;${ANDROID_PLATFORM}")
for version in "${BUILD_TOOLS_VERSIONS[@]}"; do
  [ -x "$ANDROID_HOME/build-tools/${version}/aapt2" ] || sdk_pkgs+=("build-tools;${version}")
done
if [ "${#sdk_pkgs[@]}" -gt 0 ]; then
  log "installing SDK packages: ${sdk_pkgs[*]}"
  "$SDKMANAGER" --sdk_root="$ANDROID_HOME" "${sdk_pkgs[@]}" < <(yes)
else
  log "SDK packages already installed"
fi

license_file="$ANDROID_HOME/licenses/android-sdk-license"
if [ ! -s "$license_file" ]; then
  log "accepting Android SDK license"
  mkdir -p "$ANDROID_HOME/licenses"
  printf '\n%s' "$SDK_LICENSE_HASH" > "$license_file"
fi

# 4. Sanity check
"$JAVA_HOME/bin/java" -version 2>&1 | sed -n 1p
"$ANDROID_HOME/build-tools/${PATH_BUILD_TOOLS}/aapt2" version 2>&1 | sed -n 1p
[ -f "$ANDROID_HOME/platforms/${ANDROID_PLATFORM}/android.jar" ]
log "ready"

cat >&3 <<EOF
export JAVA_HOME="$JAVA_HOME"
export ANDROID_HOME="$ANDROID_HOME"
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/build-tools/${PATH_BUILD_TOOLS}:\$PATH"
EOF
