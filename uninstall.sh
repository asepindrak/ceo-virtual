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
echo -e "\n${CYAN}Starting CEO Virtual uninstallation process...${RESET}\n"

PORT=28483
CEO_HOME="$HOME/.ceo-virtual"
LEGACY_HOME="$HOME/.vigent"

# 1. Stop active server
echo -e "► Stopping CEO Virtual server if currently running..."
if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill -9 "$PID" 2>/dev/null || true
    echo -e "  ${GREEN}[OK] Server process (PID: $PID) on port $PORT stopped.${RESET}"
  else
    echo -e "  [OK] No active server found on port $PORT."
  fi
fi

# 2. Remove autorun
echo -e "► Removing Startup autorun configuration..."
# macOS LaunchAgent
PLIST="$HOME/Library/LaunchAgents/com.ceovirtual.startup.plist"
if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo -e "  ${GREEN}[OK] $PLIST removed.${RESET}"
fi

# Linux autostart
DESKTOP="$HOME/.config/autostart/ceo-virtual.desktop"
if [ -f "$DESKTOP" ]; then
  rm -f "$DESKTOP"
  echo -e "  ${GREEN}[OK] $DESKTOP removed.${RESET}"
fi

# 3. Remove CLI binaries
echo -e "► Removing CLI binaries (ceo-virtual & vigent)..."
rm -f "$HOME/.local/bin/ceo-virtual" "$HOME/.local/bin/vigent"
echo -e "  ${GREEN}[OK] CLI binaries in ~/.local/bin/ removed.${RESET}"

# 4. Interactive choice: Delete or Keep Memories & Workspace Cache
echo -e "\n--------------------------------------------------------"
echo -e "${YELLOW}${BOLD}DATA RETENTION & PERSISTENCE CHOICES:${RESET}"
echo -e "Data Directory: ${CYAN}$CEO_HOME${RESET}"
echo -e "--------------------------------------------------------"
echo -e " ${RED}[1] 🧹 REMOVE ALL DATA (Clean Reset / Fresh Install)${RESET}"
echo -e "     Deletes wallet identity, AI memories, regional cache, and project files."
echo -e "     SELECT THIS if you want a complete reset for a FRESH INSTALL from scratch."
echo -e "\n ${GREEN}[2] 🛡️ KEEP DATA (Preserve Memories & Workspaces - Default)${RESET}"
echo -e "     Only removes CLI binaries and autorun. Your identities and projects stay safe."
echo -e "--------------------------------------------------------\n"

if [ -t 0 ]; then
  read -p "Your choice [1 = Remove All / 2 = Keep Data] (Default: 2): " choice
else
  read -r choice || choice="2"
fi

if [[ "$choice" =~ ^(1|[yY]|[yY][eE][sS]|clean|all|remove|delete)$ ]]; then
  echo -e "\n► ${RED}[CLEAN UNINSTALL] Removing all identity, memories & workspace directories...${RESET}"
  rm -rf "$CEO_HOME" "$LEGACY_HOME"
  echo -e "  ${GREEN}[OK] Directory $CEO_HOME removed cleanly.${RESET}"
  echo -e "  ${GREEN}[OK] All identities and memories wiped. System is ready for a Fresh Install!${RESET}"
else
  echo -e "\n► ${GREEN}[SAFE OPTION] Wallet identities, memories, & workspaces KEPT at:${RESET}"
  echo -e "  ${CYAN}$CEO_HOME${RESET}"
  echo -e "  (If you reinstall in the future, your company identity and projects will be restored automatically)."
fi

echo -e "\n${GREEN}${BOLD}========================================================"
echo -e "[OK] CEO VIRTUAL SUCCESSFULLY UNINSTALLED FROM SYSTEM!"
echo -e "========================================================${RESET}\n"
