#!/usr/bin/env bash
#
# HangoutAI dev runner (Windows / Git Bash).
# Boots the Android emulator (hardware GPU), starts Metro, and launches the app
# in Expo Go. Safe to run repeatedly — it skips whatever is already running.
#
#   bash scripts/run-dev.sh
#
set -uo pipefail

SDK="D:/Android/Sdk"
JDK="D:/Android/jdk/jdk-17.0.19+10"
ADB="$SDK/platform-tools/adb.exe"
EMULATOR="$SDK/emulator/emulator.exe"
AVD="HangoutPixel"
PROJECT="D:/_HangoutAI"

export JAVA_HOME="$JDK"
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export ANDROID_AVD_HOME="D:/Android/avd"
export ANDROID_USER_HOME="D:/Android/home"
# The C: drive is chronically low on space; keep Metro/tool temp + cache on D:
# so a full C: doesn't hang the bundler.
mkdir -p "D:/Android/tmp"
export TEMP="D:/Android/tmp"
export TMP="D:/Android/tmp"
export TMPDIR="D:/Android/tmp"

# 1) Emulator ---------------------------------------------------------------
if "$ADB" devices | grep -q "emulator-.*device"; then
  echo "• Emulator already running."
else
  echo "• Booting emulator ($AVD, hardware GPU)…"
  powershell.exe -NoProfile -Command \
    "Start-Process -FilePath '$EMULATOR' -ArgumentList '-avd','$AVD','-gpu','host','-no-boot-anim','-no-audio' -WindowStyle Minimized" \
    >/dev/null 2>&1
fi

echo "• Waiting for device to finish booting…"
"$ADB" wait-for-device
until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
echo "  Emulator ready."

# 2) Metro ------------------------------------------------------------------
if [ "$(curl -s -m 3 http://localhost:8081/status 2>/dev/null)" = "packager-status:running" ]; then
  echo "• Metro already running."
else
  echo "• Starting Metro (fast refresh on)…"
  powershell.exe -NoProfile -Command \
    "Start-Process -FilePath 'npx.cmd' -ArgumentList 'expo','start','--port','8081' -WorkingDirectory '$PROJECT' -WindowStyle Minimized" \
    >/dev/null 2>&1
  echo "• Waiting for Metro…"
  until [ "$(curl -s -m 3 http://localhost:8081/status 2>/dev/null)" = "packager-status:running" ]; do sleep 2; done
  echo "  Metro ready."
fi

# 3) Forward the Metro port and open the app --------------------------------
"$ADB" reverse tcp:8081 tcp:8081 >/dev/null
"$ADB" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent >/dev/null 2>&1
echo "✅ HangoutAI launched in the emulator."
