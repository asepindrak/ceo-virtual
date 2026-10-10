#!/usr/bin/env bash
# ==============================================================================
# 🤖 VIGENT - Virtual Office Agent (Universal Installer for Linux / macOS / WSL)
# Repository: https://github.com/asepindrak/vigent
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/asepindrak/vigent/main/install.sh | bash
# ==============================================================================

set -e

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ██╗   ██╗██╗ ██████╗ ███████╗███╗   ██╗████████╗
  ██║   ██║██║██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
  ██║   ██║██║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
  ╚██╗ ██╔╝██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
   ╚████╔╝ ██║╚██████╔╝███████╗██║ ╚████║   ██║   
    ╚═══╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   
EOF
echo -e "${RESET}"
echo -e "${GREEN}★ Installing Vigent (Virtual Office Agent) CLI & Autonomous Workplace...${RESET}\n"

# Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js not found! Please install Node.js 18+ first: https://nodejs.org${RESET}"
  exit 1
fi

VIGENT_HOME="$HOME/.vigent"
VIGENT_WORKSPACES="$VIGENT_HOME/workspaces"
VIGENT_APP="$VIGENT_HOME/app"
REPO_URL="https://github.com/asepindrak/vigent.git"
PORT=28483

echo -e "► Setting up dedicated directory: ${CYAN}$VIGENT_HOME${RESET}"
mkdir -p "$VIGENT_HOME"
mkdir -p "$VIGENT_WORKSPACES"
mkdir -p "$VIGENT_HOME/logs"

# Check if current directory is already the vigent project
CURRENT_DIR="$(pwd)"
if [ -f "$CURRENT_DIR/package.json" ] && (grep -q "vigent" "$CURRENT_DIR/package.json" || grep -q "real-agent-3d" "$CURRENT_DIR/package.json"); then
  echo -e "► Linking current project repository to Vigent CLI..."
  TARGET_DIR="$CURRENT_DIR"
else
  TARGET_DIR="$VIGENT_APP"
  if [ ! -d "$TARGET_DIR" ]; then
    echo -e "► Cloning Vigent repository from ${CYAN}$REPO_URL${RESET}..."
    git clone "$REPO_URL" "$TARGET_DIR" 2>/dev/null || cp -r "$CURRENT_DIR" "$TARGET_DIR"
  fi
fi

# Ensure npm global link or bin wrapper
echo -e "► Registering 'vigent' command into system PATH..."
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
WRAPPER="$BIN_DIR/vigent"

cat << EOF > "$WRAPPER"
#!/usr/bin/env bash
node "$TARGET_DIR/bin/vigent.js" "\$@"
EOF
chmod +x "$WRAPPER"

# Also create alias for realagent
WRAPPER_ALIAS="$BIN_DIR/realagent"
cat << EOF > "$WRAPPER_ALIAS"
#!/usr/bin/env bash
node "$TARGET_DIR/bin/vigent.js" "\$@"
EOF
chmod +x "$WRAPPER_ALIAS"

# Run npm install if node_modules missing
if [ ! -d "$TARGET_DIR/node_modules" ]; then
  echo -e "► Installing dependencies..."
  cd "$TARGET_DIR"
  npm install
fi

# Also try npm link if possible
cd "$TARGET_DIR"
npm link --silent 2>/dev/null || true

# Enable autorun
echo -e "► Configuring autorun at startup..."
node "$TARGET_DIR/bin/vigent.js" autorun enable || true

echo -e "\n${GREEN}${BOLD}✓ VIGENT (Virtual Office Agent) Successfully Installed!${RESET}"
echo -e "========================================================"
echo -e "  Dedicated Port:   ${CYAN}http://localhost:$PORT${RESET}"
echo -e "  Workspaces Home:  ${CYAN}$VIGENT_WORKSPACES${RESET}"
echo -e "  CLI Executable:   ${CYAN}vigent${RESET}"
echo -e "  GitHub Repo:      ${CYAN}$REPO_URL${RESET}"
echo -e "========================================================"
echo -e "\nTry running:"
echo -e "  ${CYAN}vigent start${RESET}       (Start server and open browser)"
echo -e "  ${CYAN}vigent workspace${RESET}   (Open code folder in File Explorer)"
echo -e "  ${CYAN}vigent status${RESET}      (Check running agent state)"
echo -e "\nLaunching Vigent now...\n"

node "$TARGET_DIR/bin/vigent.js" start
