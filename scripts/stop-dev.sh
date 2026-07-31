#!/usr/bin/env bash
#
# Stops the HangoutAI dev environment: the emulator and Metro.
#
#   bash scripts/stop-dev.sh
#
ADB="D:/Android/Sdk/platform-tools/adb.exe"

if "$ADB" emu kill 2>/dev/null; then
  echo "• Emulator stopped."
else
  echo "• No emulator was running."
fi

powershell.exe -NoProfile -Command \
  "Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id \$_ -Force -ErrorAction SilentlyContinue }" \
  >/dev/null 2>&1
echo "• Metro stopped (if it was running)."
