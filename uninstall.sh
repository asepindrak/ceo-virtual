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
echo -e "${YELLOW}${BOLD}PILIHAN PEMBERSIHAN DATA & KEBERLANJUTAN:${RESET}"
echo -e "Folder Data: ${CYAN}$CEO_HOME${RESET}"
echo -e "--------------------------------------------------------"
echo -e " ${RED}[1] 🧹 HAPUS SEMUA DATA (Clean Reset / Fresh Install)${RESET}"
echo -e "     Menghapus identitas wallet, memori AI, region, dan file proyek."
echo -e "     PILIH INI jika Anda ingin reset total & mencoba FRESH INSTALL dari nol."
echo -e "\n ${GREEN}[2] 🛡️ SIMPAN DATA (Keep Memories & Workspaces - Default)${RESET}"
echo -e "     Hanya mencopot executable CLI & autorun. Identitas dan proyek tetap aman."
echo -e "--------------------------------------------------------\n"

if [ -t 0 ]; then
  read -p "Pilihan Anda [1 = Hapus Semua / 2 = Simpan Data] (Default: 2): " choice
else
  read -r choice || choice="2"
fi

if [[ "$choice" =~ ^(1|[yY]|[yY][eE][sS]|[yY][aA]|clean|all|hapus)$ ]]; then
  echo -e "\n► ${RED}[CLEAN UNINSTALL] Menghapus seluruh folder data identitas & workspace...${RESET}"
  rm -rf "$CEO_HOME" "$LEGACY_HOME"
  echo -e "  ${GREEN}[OK] Folder $CEO_HOME berhasil dihapus bersih.${RESET}"
  echo -e "  ${GREEN}[OK] Semua identitas dan memori dibersihkan. Sistem siap untuk Fresh Install!${RESET}"
else
  echo -e "\n► ${GREEN}[AMBIL OPSI AMAN] Identitas wallet, memori, & workspace TETAP DISIMPAN di:${RESET}"
  echo -e "  ${CYAN}$CEO_HOME${RESET}"
  echo -e "  (Jika Anda menginstall kembali, identitas dan data kantor Anda akan langsung terbaca)."
fi

echo -e "\n${GREEN}${BOLD}========================================================"
echo -e "[OK] CEO VIRTUAL BERHASIL DI-UNINSTALL DARI SISTEM!"
echo -e "========================================================${RESET}\n"
