#!/usr/bin/env bash
# ==============================================================================
# 👑 CEO VIRTUAL - Uninstaller (Linux / macOS / WSL)
# Repository: https://github.com/asepindrak/ceo-virtual
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.sh | bash
# ==============================================================================

set -e

BOLD="\033[1m"
YELLOW="\033[33m"
GREEN="\033[32m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

echo -e "${YELLOW}${BOLD}========================================================"
echo -e "             [!] CEO VIRTUAL UNINSTALLER                "
echo -e "========================================================${RESET}"
echo -e "\n${CYAN}Memulai proses uninstall CEO Virtual...${RESET}\n"

PORT=28483
CEO_HOME="$HOME/.ceo-virtual"
LEGACY_HOME="$HOME/.vigent"

# 1. Stop active server
echo -e "► Menghentikan server CEO Virtual jika sedang aktif..."
if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill -9 "$PID" 2>/dev/null || true
    echo -e "  ${GREEN}[OK] Proses server (PID: $PID) pada port $PORT dihentikan.${RESET}"
  else
    echo -e "  [OK] Tidak ada server aktif di port $PORT."
  fi
fi

# 2. Remove autorun
echo -e "► Menghapus konfigurasi autorun Startup..."
# macOS LaunchAgent
PLIST="$HOME/Library/LaunchAgents/com.ceovirtual.startup.plist"
if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo -e "  ${GREEN}[OK] $PLIST dihapus.${RESET}"
fi

# Linux autostart
DESKTOP="$HOME/.config/autostart/ceo-virtual.desktop"
if [ -f "$DESKTOP" ]; then
  rm -f "$DESKTOP"
  echo -e "  ${GREEN}[OK] $DESKTOP dihapus.${RESET}"
fi

# 3. Remove CLI binaries
echo -e "► Menghapus executable CLI (ceo-virtual & vigent)..."
rm -f "$HOME/.local/bin/ceo-virtual" "$HOME/.local/bin/vigent"
echo -e "  ${GREEN}[OK] CLI binary di ~/.local/bin/ dihapus.${RESET}"

# 4. Interactive choice: Delete or Keep Memories & Workspace Cache
echo -e "\n--------------------------------------------------------"
echo -e "${YELLOW}${BOLD}PILIHAN PEMBERSIHAN DATA & MEMORI${RESET}"
echo -e "Folder: ${CYAN}$CEO_HOME${RESET}"
echo -e "Folder ini berisi: memori AI perusahaan, riwayat chat, dan file proyek."
echo -e "--------------------------------------------------------\n"

if [ -t 0 ]; then
  read -p "Apakah Anda ingin MENGHAPUS seluruh memori, cache & file workspace? [y/N]: " deleteData
else
  # If piped from curl without tty, check stdin or default to safe No
  read -r deleteData || deleteData="n"
fi

if [[ "$deleteData" =~ ^([yY]|[yY][eE][sS]|[yY][aA])$ ]]; then
  echo -e "► ${RED}Menghapus seluruh folder data memori & workspace...${RESET}"
  rm -rf "$CEO_HOME" "$LEGACY_HOME"
  echo -e "  ${GREEN}[OK] Folder $CEO_HOME berhasil dihapus bersih.${RESET}"
else
  echo -e "► ${GREEN}[AMBIL OPSI AMAN] Memori & folder workspace TETAP DISIMPAN di:${RESET}"
  echo -e "  ${CYAN}$CEO_HOME${RESET}"
  echo -e "  (Jika Anda menginstall kembali, data perusahaan Anda akan langsung terbaca)."
fi

echo -e "\n${GREEN}${BOLD}========================================================"
echo -e "[OK] CEO VIRTUAL BERHASIL DI-UNINSTALL DARI SISTEM!"
echo -e "========================================================${RESET}\n"
