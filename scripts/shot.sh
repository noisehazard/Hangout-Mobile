#!/usr/bin/env bash
#
# Saves a screenshot of the running emulator.
#
#   bash scripts/shot.sh [output.png]
#
OUT="${1:-D:/_HangoutAI/.dev-screenshot.png}"
"D:/Android/Sdk/platform-tools/adb.exe" exec-out screencap -p > "$OUT"
echo "Saved $OUT"
