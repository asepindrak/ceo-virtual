#!/usr/bin/env bash
# ==============================================================================
# 🤖 REAL AGENT 3D - Universal Installer for Linux / macOS / WSL
# Usage:
#   curl -fsSL https://antigravity.google/cli/install.sh | bash
#   or: bash install.sh
# ==============================================================================

set -e

BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ██████╗ ███████╗ █████╗ ██╗         █████╗  ██████╗ ███████╗███╗   ██╗████████╗
  ██╔══██╗██╔════╝██╔══██╗██║        ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
  ██████╔╝█████╗  ███████║██║  █████╗███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
  ██╔══██╗██╔══╝  ██╔══██║██║  ╚════╝██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
  ██║  ██║███████╗██║  ██║███████╗   ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   
EOF
echo -e "${RESET}"
echo -e "${GREEN}★ Installing Real Agent 3D CLI & Autonomous Workplace...${RESET}\n"

# Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js not found! Please install Node.js 18+ first: https://nodejs.org${RESET}"
  exit 1
fi

REALAGENT_HOME="$HOME/.realagent"
REALAGENT_WORKSPACES="$REALAGENT_HOME/workspaces"
REALAGENT_APP="$REALAGENT_HOME/app"
PORT=28483

echo -e "► Setting up dedicated directory: ${CYAN}$REALAGENT_HOME${RESET}"
mkdir -p "$REALAGENT_HOME"
mkdir -p "$REALAGENT_WORKSPACES"
mkdir -p "$REALAGENT_HOME/logs"

# Check if current directory is already the real-agent-3d project
CURRENT_DIR="$(pwd)"
if [ -f "$CURRENT_DIR/package.json" ] && grep -q "real-agent-3d" "$CURRENT_DIR/package.json"; then
  echo -e "► Linking current project repository to RealAgent CLI..."
  TARGET_DIR="$CURRENT_DIR"
else
  TARGET_DIR="$REALAGENT_APP"
  if [ ! -d "$TARGET_DIR" ]; then
    echo -e "► Cloning RealAgent 3D into ${CYAN}$TARGET_DIR${RESET}..."
    git clone https://github.com/google/real-agent-3d.git "$TARGET_DIR" 2>/dev/null || cp -r "$CURRENT_DIR" "$TARGET_DIR"
  fi
fi

# Ensure npm global link or bin wrapper
echo -e "► Registering 'realagent' command into system PATH..."
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
WRAPPER="$BIN_DIR/realagent"

cat << EOF > "$WRAPPER"
#!/usr/bin/env bash
node "$TARGET_DIR/bin/realagent.js" "\$@"
EOF
chmod +x "$WRAPPER"

# Also try npm link if possible
cd "$TARGET_DIR"
npm link --silent 2>/dev/null || true

# Enable autorun
echo -e "► Configuring autorun at startup..."
node "$TARGET_DIR/bin/realagent.js" autorun enable || true

echo -e "\n${GREEN}${BOLD}✓ REAL AGENT 3D Successfully Installed!${RESET}"
echo -e "========================================================"
echo -e "  Dedicated Port:   ${CYAN}http://localhost:$PORT${RESET}"
echo -e "  Workspaces Home:  ${CYAN}$REALAGENT_WORKSPACES${RESET}"
echo -e "  CLI Executable:   ${CYAN}realagent${RESET}"
echo -e "========================================================"
echo -e "\nTry running:"
echo -e "  ${CYAN}realagent start${RESET}       (Start server and open browser)"
echo -e "  ${CYAN}realagent workspace${RESET}   (Open code folder in File Explorer)"
echo -e "  ${CYAN}realagent status${RESET}      (Check running agent state)"
echo -e "\nLaunching Real Agent now...\n"

node "$TARGET_DIR/bin/realagent.js" start
