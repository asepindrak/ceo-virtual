#!/usr/bin/env bash
# ==============================================================================
# 👑 CEO VIRTUAL - Autonomous Workplace (Universal Installer for Linux / macOS / WSL)
# Repository: https://github.com/asepindrak/ceo-virtual
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.sh | bash
# ==============================================================================

set -e

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
cat << "EOF"
   ██████╗███████╗ ██████╗     ██╗   ██╗██╗██████╗ ████████╗██╗   ██╗ █████╗ ██╗     
  ██╔════╝██╔════╝██╔═══██╗    ██║   ██║██║██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██║     
  ██║     █████╗  ██║   ██║    ██║   ██║██║██████╔╝   ██║   ██║   ██║███████║██║     
  ██║     ██╔══╝  ██║   ██║    ╚██╗ ██╔╝██║██╔══██╗   ██║   ██║   ██║██╔══██║██║     
  ╚██████╗███████╗╚██████╔╝     ╚████╔╝ ██║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗
   ╚═════╝╚══════╝ ╚═════╝       ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝
EOF
echo -e "${RESET}"
echo -e "${GREEN}★ Installing CEO Virtual (Autonomous Workplace) CLI & Dashboard...${RESET}\n"

# Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js not found! Please install Node.js 18+ first: https://nodejs.org${RESET}"
  exit 1
fi

CEO_HOME="$HOME/.ceo-virtual"
LEGACY_HOME="$HOME/.vigent"

# Migrate legacy ~/.vigent data if present
if [ -d "$LEGACY_HOME" ] && [ ! -d "$CEO_HOME" ]; then
  echo -e "► Migrating data from ~/.vigent to ~/.ceo-virtual..."
  cp -r "$LEGACY_HOME" "$CEO_HOME" 2>/dev/null || true
fi

CEO_WORKSPACES="$CEO_HOME/workspaces"
CEO_APP="$CEO_HOME/app"
REPO_URL="https://github.com/asepindrak/ceo-virtual.git"
PORT=28483

echo -e "► Setting up dedicated directory: ${CYAN}$CEO_HOME${RESET}"
mkdir -p "$CEO_HOME"
mkdir -p "$CEO_WORKSPACES"
mkdir -p "$CEO_HOME/logs"

# Check if current directory is already the project
CURRENT_DIR="$(pwd)"
if [ -f "$CURRENT_DIR/package.json" ] && (grep -q "ceo-virtual" "$CURRENT_DIR/package.json" || grep -q "vigent" "$CURRENT_DIR/package.json"); then
  echo -e "► Linking current project repository to CEO Virtual CLI..."
  TARGET_DIR="$CURRENT_DIR"
else
  TARGET_DIR="$CEO_APP"
  if [ ! -d "$TARGET_DIR" ]; then
    echo -e "► Cloning CEO Virtual repository from ${CYAN}$REPO_URL${RESET}..."
    git clone "$REPO_URL" "$TARGET_DIR" 2>/dev/null || cp -r "$CURRENT_DIR" "$TARGET_DIR"
  fi
fi

# Ensure npm global link or bin wrapper
echo -e "► Registering 'ceo-virtual' and 'vigent' commands into system PATH..."
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

# Primary command: ceo-virtual
cat << EOF > "$BIN_DIR/ceo-virtual"
#!/usr/bin/env bash
node "$TARGET_DIR/bin/ceo-virtual.js" "\$@"
EOF
chmod +x "$BIN_DIR/ceo-virtual"

# Backward-compatible alias: vigent
cat << EOF > "$BIN_DIR/vigent"
#!/usr/bin/env bash
node "$TARGET_DIR/bin/ceo-virtual.js" "\$@"
EOF
chmod +x "$BIN_DIR/vigent"

# Run npm install if node_modules missing
if [ ! -d "$TARGET_DIR/node_modules" ]; then
  echo -e "► Installing dependencies..."
  cd "$TARGET_DIR"
  npm install
fi

# Also try npm link if possible
cd "$TARGET_DIR"
npm link --silent 2>/dev/null || true

# Initialize Company Memory Engine & Vector DB
echo -e "► Initializing Company Memory Engine & Zero-Setup Vector DB..."
node "$TARGET_DIR/bin/ceo-virtual.js" memory init || true

# Enable autorun
echo -e "► Configuring autorun at startup..."
node "$TARGET_DIR/bin/ceo-virtual.js" autorun enable || true

echo -e "\n${GREEN}${BOLD}✓ CEO VIRTUAL Successfully Installed!${RESET}"
echo -e "========================================================"
echo -e "  Dedicated Port:   ${CYAN}http://localhost:$PORT${RESET}"
echo -e "  Workspaces Home:  ${CYAN}$CEO_WORKSPACES${RESET}"
echo -e "  Vector Memory:    ${CYAN}Zero-Setup Dual Mode (Local + Custom LLM)${RESET}"
echo -e "  CLI Executable:   ${CYAN}ceo-virtual${RESET} (or ${CYAN}vigent${RESET})"
echo -e "  GitHub Repo:      ${CYAN}$REPO_URL${RESET}"
echo -e "========================================================"
echo -e "\nTry running:"
echo -e "  ${CYAN}ceo-virtual start${RESET}       (Start server and open browser)"
echo -e "  ${CYAN}ceo-virtual workspace${RESET}   (Open code folder in File Explorer)"
echo -e "  ${CYAN}ceo-virtual memory list${RESET} (Check company memories & vector DB)"
echo -e "  ${CYAN}ceo-virtual status${RESET}      (Check running agent state)"
echo -e "\nLaunching CEO Virtual now...\n"

node "$TARGET_DIR/bin/ceo-virtual.js" start
